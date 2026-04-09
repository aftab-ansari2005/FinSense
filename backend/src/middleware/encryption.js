const encryptionService = require('../utils/encryption');
const { logger } = require('../config/logger');

/**
 * Middleware to encrypt sensitive data in request body
 */
const encryptRequestData = (sensitiveFields = []) => {
  return (req, res, next) => {
    try {
      if (req.body && sensitiveFields.length > 0) {
        req.body = encryptionService.encryptSensitiveFields(req.body, sensitiveFields);
      }
      next();
    } catch (error) {
      logger.error('Request encryption failed:', error);
      res.status(500).json({
        error: 'Data processing failed',
        message: 'Unable to process request data'
      });
    }
  };
};

/**
 * Middleware to decrypt sensitive data in response
 */
const decryptResponseData = (sensitiveFields = []) => {
  return (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      try {
        if (data && data.data && sensitiveFields.length > 0) {
          if (Array.isArray(data.data)) {
            data.data = data.data.map(item => 
              encryptionService.decryptSensitiveFields(item, sensitiveFields)
            );
          } else {
            data.data = encryptionService.decryptSensitiveFields(data.data, sensitiveFields);
          }
        }
      } catch (error) {
        logger.error('Response decryption failed:', error);
        // Continue with original data if decryption fails
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

/**
 * Middleware to encrypt entire request payload for transmission
 */
const encryptTransmission = (req, res, next) => {
  try {
    if (req.body && Object.keys(req.body).length > 0) {
      req.encryptedPayload = encryptionService.encryptForTransmission(req.body);
    }
    next();
  } catch (error) {
    logger.error('Transmission encryption failed:', error);
    res.status(500).json({
      error: 'Data processing failed',
      message: 'Unable to encrypt transmission data'
    });
  }
};

/**
 * Middleware to decrypt entire request payload from transmission
 */
const decryptTransmission = (maxAge = 3600000) => {
  return (req, res, next) => {
    try {
      if (req.body && req.body.data && req.body.signature) {
        req.body = JSON.parse(encryptionService.decryptFromTransmission(req.body, maxAge));
      }
      next();
    } catch (error) {
      logger.error('Transmission decryption failed:', error);
      res.status(400).json({
        error: 'Invalid request',
        message: 'Unable to decrypt transmission data'
      });
    }
  };
};

/**
 * Middleware to add data integrity signature to responses
 */
const signResponse = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    try {
      if (data && typeof data === 'object') {
        const signature = encryptionService.createSignature(data);
        data._signature = signature;
        data._timestamp = Date.now();
      }
    } catch (error) {
      logger.error('Response signing failed:', error);
      // Continue without signature if signing fails
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * Middleware to verify request signature
 */
const verifyRequestSignature = (req, res, next) => {
  try {
    const { _signature, _timestamp, ...data } = req.body;
    
    if (!_signature) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Request signature required'
      });
    }
    
    // Check timestamp (prevent replay attacks)
    if (_timestamp && Date.now() - _timestamp > 300000) { // 5 minutes
      return res.status(400).json({
        error: 'Bad request',
        message: 'Request expired'
      });
    }
    
    // Verify signature
    if (!encryptionService.verifySignature(data, _signature)) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Invalid request signature'
      });
    }
    
    // Remove signature fields from body
    req.body = data;
    next();
  } catch (error) {
    logger.error('Signature verification failed:', error);
    res.status(400).json({
      error: 'Bad request',
      message: 'Signature verification failed'
    });
  }
};

/**
 * Middleware for field-level encryption in database operations
 */
const encryptDatabaseFields = (model, encryptedFields = []) => {
  return async (req, res, next) => {
    try {
      // Add pre-save hook to encrypt fields
      if (req.body && encryptedFields.length > 0) {
        encryptedFields.forEach(field => {
          if (req.body[field] !== undefined && req.body[field] !== null) {
            req.body[field] = encryptionService.encrypt(req.body[field]);
          }
        });
      }
      
      next();
    } catch (error) {
      logger.error('Database field encryption failed:', error);
      res.status(500).json({
        error: 'Data processing failed',
        message: 'Unable to encrypt database fields'
      });
    }
  };
};

/**
 * Utility function to create encryption middleware for specific models
 */
const createModelEncryption = (config) => {
  const {
    requestFields = [],
    responseFields = [],
    databaseFields = [],
    requireSignature = false,
    signResponse: shouldSignResponse = false
  } = config;
  
  const middlewares = [];
  
  if (requireSignature) {
    middlewares.push(verifyRequestSignature);
  }
  
  if (requestFields.length > 0) {
    middlewares.push(encryptRequestData(requestFields));
  }
  
  if (databaseFields.length > 0) {
    middlewares.push(encryptDatabaseFields(null, databaseFields));
  }
  
  if (responseFields.length > 0) {
    middlewares.push(decryptResponseData(responseFields));
  }
  
  if (shouldSignResponse) {
    middlewares.push(signResponse);
  }
  
  return middlewares;
};

module.exports = {
  encryptRequestData,
  decryptResponseData,
  encryptTransmission,
  decryptTransmission,
  signResponse,
  verifyRequestSignature,
  encryptDatabaseFields,
  createModelEncryption
};