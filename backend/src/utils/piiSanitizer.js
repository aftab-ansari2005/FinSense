/**
 * PII Sanitizer Utility
 * Provides comprehensive sanitization of Personally Identifiable Information (PII)
 * from logs, error messages, and other outputs
 */

/**
 * PII patterns to detect and sanitize
 */
const PII_PATTERNS = {
  // Email addresses
  email: {
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
    replacement: '[EMAIL_REDACTED]'
  },
  
  // Phone numbers (various formats)
  phone: {
    pattern: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    replacement: '[PHONE_REDACTED]'
  },
  
  // Social Security Numbers (US)
  ssn: {
    pattern: /\b\d{3}-?\d{2}-?\d{4}\b/g,
    replacement: '[SSN_REDACTED]'
  },
  
  // Credit card numbers (various formats)
  creditCard: {
    pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    replacement: '[CARD_REDACTED]'
  },
  
  // IP addresses (IPv4)
  ipAddress: {
    pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    replacement: '[IP_REDACTED]'
  },
  
  // JWT tokens
  jwt: {
    pattern: /\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\b/g,
    replacement: '[JWT_REDACTED]'
  },
  
  // API keys (common patterns)
  apiKey: {
    pattern: /\b[A-Za-z0-9]{32,}\b/g,
    replacement: '[API_KEY_REDACTED]'
  },
  
  // Passwords in URLs or JSON
  password: {
    pattern: /(password|passwd|pwd)["']?\s*[:=]\s*["']?[^\s"',}]+/gi,
    replacement: '$1=[PASSWORD_REDACTED]'
  },
  
  // MongoDB ObjectIds
  mongoId: {
    pattern: /\b[0-9a-fA-F]{24}\b/g,
    replacement: '[ID_REDACTED]'
  },
  
  // Street addresses (basic pattern)
  address: {
    pattern: /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir)\b/gi,
    replacement: '[ADDRESS_REDACTED]'
  },
  
  // ZIP codes (US)
  zipCode: {
    pattern: /\b\d{5}(?:-\d{4})?\b/g,
    replacement: '[ZIP_REDACTED]'
  }
};

/**
 * Sensitive field names that should be redacted
 */
const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'passwd',
  'pwd',
  'secret',
  'token',
  'apiKey',
  'api_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'authorization',
  'auth',
  'ssn',
  'socialSecurityNumber',
  'creditCard',
  'credit_card',
  'cardNumber',
  'card_number',
  'cvv',
  'pin',
  'privateKey',
  'private_key'
];

/**
 * Sanitize a string by removing or masking PII
 * @param {string} text - Text to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string} Sanitized text
 */
function sanitizeString(text, options = {}) {
  if (typeof text !== 'string') {
    return text;
  }

  let sanitized = text;
  const patterns = options.patterns || PII_PATTERNS;

  // Apply all PII patterns
  for (const [key, config] of Object.entries(patterns)) {
    if (options.exclude && options.exclude.includes(key)) {
      continue;
    }
    sanitized = sanitized.replace(config.pattern, config.replacement);
  }

  return sanitized;
}

/**
 * Sanitize an object by removing or masking PII in all string values
 * @param {Object} obj - Object to sanitize
 * @param {Object} options - Sanitization options
 * @returns {Object} Sanitized object
 */
function sanitizeObject(obj, options = {}) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj, options);
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, options));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    // Check if field name is sensitive
    if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    // Recursively sanitize nested objects
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, options);
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value, options);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Sanitize error objects
 * @param {Error} error - Error object to sanitize
 * @returns {Object} Sanitized error object
 */
function sanitizeError(error) {
  if (!(error instanceof Error)) {
    return sanitizeObject(error);
  }

  return {
    name: error.name,
    message: sanitizeString(error.message),
    stack: error.stack ? sanitizeString(error.stack) : undefined,
    code: error.code,
    statusCode: error.statusCode
  };
}

/**
 * Sanitize request object for logging
 * @param {Object} req - Express request object
 * @returns {Object} Sanitized request data
 */
function sanitizeRequest(req) {
  const sanitized = {
    method: req.method,
    url: sanitizeString(req.url),
    path: sanitizeString(req.path),
    query: sanitizeObject(req.query),
    headers: sanitizeHeaders(req.headers),
    ip: '[IP_REDACTED]', // Always redact IP addresses
    userAgent: req.get('User-Agent')
  };

  // Only include body for non-GET requests, and sanitize it
  if (req.method !== 'GET' && req.body) {
    sanitized.body = sanitizeObject(req.body);
  }

  return sanitized;
}

/**
 * Sanitize HTTP headers
 * @param {Object} headers - HTTP headers object
 * @returns {Object} Sanitized headers
 */
function sanitizeHeaders(headers) {
  const sanitized = {};
  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'set-cookie',
    'x-api-key',
    'x-auth-token'
  ];

  for (const [key, value] of Object.entries(headers)) {
    if (sensitiveHeaders.some(h => key.toLowerCase().includes(h))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = sanitizeString(value);
    }
  }

  return sanitized;
}

/**
 * Sanitize response object for logging
 * @param {Object} res - Express response object
 * @returns {Object} Sanitized response data
 */
function sanitizeResponse(res) {
  return {
    statusCode: res.statusCode,
    statusMessage: res.statusMessage,
    headers: sanitizeHeaders(res.getHeaders())
  };
}

/**
 * Sanitize database query for logging
 * @param {Object} query - Database query object
 * @returns {Object} Sanitized query
 */
function sanitizeQuery(query) {
  return sanitizeObject(query);
}

/**
 * Mask partial string (show first and last N characters)
 * @param {string} str - String to mask
 * @param {number} visibleChars - Number of characters to show at start and end
 * @returns {string} Masked string
 */
function maskPartial(str, visibleChars = 4) {
  if (typeof str !== 'string' || str.length <= visibleChars * 2) {
    return '[REDACTED]';
  }

  const start = str.substring(0, visibleChars);
  const end = str.substring(str.length - visibleChars);
  const masked = '*'.repeat(Math.max(str.length - visibleChars * 2, 3));

  return `${start}${masked}${end}`;
}

/**
 * Check if a string contains PII
 * @param {string} text - Text to check
 * @returns {boolean} True if PII detected
 */
function containsPII(text) {
  if (typeof text !== 'string') {
    return false;
  }

  for (const config of Object.values(PII_PATTERNS)) {
    if (config.pattern.test(text)) {
      return true;
    }
  }

  return false;
}

/**
 * Get list of PII types detected in text
 * @param {string} text - Text to analyze
 * @returns {Array<string>} Array of detected PII types
 */
function detectPIITypes(text) {
  if (typeof text !== 'string') {
    return [];
  }

  const detected = [];
  for (const [key, config] of Object.entries(PII_PATTERNS)) {
    if (config.pattern.test(text)) {
      detected.push(key);
    }
  }

  return detected;
}

module.exports = {
  sanitizeString,
  sanitizeObject,
  sanitizeError,
  sanitizeRequest,
  sanitizeResponse,
  sanitizeHeaders,
  sanitizeQuery,
  maskPartial,
  containsPII,
  detectPIITypes,
  PII_PATTERNS,
  SENSITIVE_FIELDS
};
