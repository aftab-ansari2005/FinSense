const crypto = require('crypto');
const { logger } = require('../config/logger');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits
    this.tagLength = 16; // 128 bits
    this.saltLength = 32; // 256 bits
    
    // Get encryption key from environment or generate one
    this.masterKey = this.getMasterKey();
  }

  /**
   * Get or generate master encryption key
   */
  getMasterKey() {
    const envKey = process.env.ENCRYPTION_KEY;
    
    if (envKey) {
      if (envKey.length !== 64) { // 32 bytes = 64 hex characters
        throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
      }
      return Buffer.from(envKey, 'hex');
    }
    
    // Generate a new key for development (should not be used in production)
    if (process.env.NODE_ENV === 'development') {
      const key = crypto.randomBytes(this.keyLength);
      logger.warn('Generated new encryption key for development. Set ENCRYPTION_KEY in production!');
      logger.warn(`Generated key: ${key.toString('hex')}`);
      return key;
    }
    
    throw new Error('ENCRYPTION_KEY environment variable is required in production');
  }

  /**
   * Derive key from master key using PBKDF2
   */
  deriveKey(salt, iterations = 100000) {
    return crypto.pbkdf2Sync(this.masterKey, salt, iterations, this.keyLength, 'sha256');
  }

  /**
   * Encrypt data
   */
  encrypt(plaintext) {
    try {
      if (typeof plaintext !== 'string') {
        plaintext = JSON.stringify(plaintext);
      }

      // Generate random salt and IV
      const salt = crypto.randomBytes(this.saltLength);
      const iv = crypto.randomBytes(this.ivLength);
      
      // Derive key from master key and salt
      const key = this.deriveKey(salt);
      
      // Create cipher
      const cipher = crypto.createCipher(this.algorithm, key);
      cipher.setAAD(salt); // Additional authenticated data
      
      // Encrypt
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get authentication tag
      const tag = cipher.getAuthTag();
      
      // Combine salt + iv + tag + encrypted data
      const result = Buffer.concat([
        salt,
        iv,
        tag,
        Buffer.from(encrypted, 'hex')
      ]);
      
      return result.toString('base64');
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt data
   */
  decrypt(encryptedData) {
    try {
      if (!encryptedData) {
        throw new Error('No data to decrypt');
      }

      // Convert from base64
      const buffer = Buffer.from(encryptedData, 'base64');
      
      // Extract components
      const salt = buffer.subarray(0, this.saltLength);
      const iv = buffer.subarray(this.saltLength, this.saltLength + this.ivLength);
      const tag = buffer.subarray(this.saltLength + this.ivLength, this.saltLength + this.ivLength + this.tagLength);
      const encrypted = buffer.subarray(this.saltLength + this.ivLength + this.tagLength);
      
      // Derive key from master key and salt
      const key = this.deriveKey(salt);
      
      // Create decipher
      const decipher = crypto.createDecipher(this.algorithm, key);
      decipher.setAAD(salt);
      decipher.setAuthTag(tag);
      
      // Decrypt
      let decrypted = decipher.update(encrypted, null, 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Encrypt object (automatically handles JSON serialization)
   */
  encryptObject(obj) {
    return this.encrypt(JSON.stringify(obj));
  }

  /**
   * Decrypt object (automatically handles JSON parsing)
   */
  decryptObject(encryptedData) {
    const decrypted = this.decrypt(encryptedData);
    return JSON.parse(decrypted);
  }

  /**
   * Hash data using SHA-256
   */
  hash(data) {
    if (typeof data !== 'string') {
      data = JSON.stringify(data);
    }
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate secure random token
   */
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate secure random password
   */
  generatePassword(length = 16) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charset.length);
      password += charset[randomIndex];
    }
    
    return password;
  }

  /**
   * Encrypt sensitive fields in an object
   */
  encryptSensitiveFields(obj, sensitiveFields = []) {
    const result = { ...obj };
    
    sensitiveFields.forEach(field => {
      if (result[field] !== undefined && result[field] !== null) {
        result[field] = this.encrypt(result[field]);
      }
    });
    
    return result;
  }

  /**
   * Decrypt sensitive fields in an object
   */
  decryptSensitiveFields(obj, sensitiveFields = []) {
    const result = { ...obj };
    
    sensitiveFields.forEach(field => {
      if (result[field] !== undefined && result[field] !== null) {
        try {
          result[field] = this.decrypt(result[field]);
        } catch (error) {
          logger.error(`Failed to decrypt field ${field}:`, error);
          // Keep original value if decryption fails
        }
      }
    });
    
    return result;
  }

  /**
   * Create HMAC signature
   */
  createSignature(data, secret = null) {
    const key = secret || this.masterKey;
    if (typeof data !== 'string') {
      data = JSON.stringify(data);
    }
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  verifySignature(data, signature, secret = null) {
    const expectedSignature = this.createSignature(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Encrypt data for transmission (includes integrity check)
   */
  encryptForTransmission(data) {
    const encrypted = this.encrypt(data);
    const signature = this.createSignature(encrypted);
    
    return {
      data: encrypted,
      signature: signature,
      timestamp: Date.now()
    };
  }

  /**
   * Decrypt data from transmission (verifies integrity)
   */
  decryptFromTransmission(payload, maxAge = 3600000) { // 1 hour default
    if (!payload.data || !payload.signature || !payload.timestamp) {
      throw new Error('Invalid payload format');
    }
    
    // Check timestamp
    if (Date.now() - payload.timestamp > maxAge) {
      throw new Error('Payload expired');
    }
    
    // Verify signature
    if (!this.verifySignature(payload.data, payload.signature)) {
      throw new Error('Invalid signature');
    }
    
    // Decrypt data
    return this.decrypt(payload.data);
  }
}

// Create singleton instance
const encryptionService = new EncryptionService();

module.exports = encryptionService;