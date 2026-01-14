const winston = require('winston');
const path = require('path');
const { sanitizeString, sanitizeObject } = require('../utils/piiSanitizer');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Custom format for sanitizing PII using comprehensive sanitizer
const sanitizeFormat = winston.format((info) => {
  // Sanitize message
  if (typeof info.message === 'string') {
    info.message = sanitizeString(info.message);
  }
  
  // Sanitize metadata
  if (info.meta && typeof info.meta === 'object') {
    info.meta = sanitizeObject(info.meta);
  }
  
  // Sanitize any additional properties
  const keysToSanitize = Object.keys(info).filter(
    key => !['level', 'timestamp', 'service'].includes(key)
  );
  
  keysToSanitize.forEach(key => {
    if (typeof info[key] === 'string') {
      info[key] = sanitizeString(info[key]);
    } else if (typeof info[key] === 'object' && info[key] !== null) {
      info[key] = sanitizeObject(info[key]);
    }
  });
  
  return info;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    sanitizeFormat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'finsense-backend' },
  transports: [
    // Error logs
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Combined logs
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // API interaction logs
    new winston.transports.File({
      filename: path.join(logDir, 'api.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// API logging middleware with PII sanitization
const apiLogger = (req, res, next) => {
  const start = Date.now();
  
  // Sanitize and log request (without sensitive data)
  logger.info('API Request', {
    method: req.method,
    url: sanitizeString(req.url),
    path: sanitizeString(req.path),
    userAgent: req.get('User-Agent'),
    // IP addresses are considered PII - redact them
    ip: '[IP_REDACTED]',
    timestamp: new Date().toISOString()
  });
  
  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('API Response', {
      method: req.method,
      url: sanitizeString(req.url),
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
  });
  
  next();
};

module.exports = { logger, apiLogger };