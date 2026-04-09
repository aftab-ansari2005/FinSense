const { body, param, query, validationResult } = require('express-validator');
const { logger } = require('./logger');

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    logger.warn('Validation errors:', {
      url: req.url,
      method: req.method,
      errors: errors.array()
    });
    
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

/**
 * Common validation rules
 */
const validationRules = {
  // User validation
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
    
  password: body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    
  firstName: body('firstName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),
    
  lastName: body('lastName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),
    
  currency: body('currency')
    .optional()
    .isIn(['USD', 'EUR', 'GBP', 'CAD', 'AUD'])
    .withMessage('Currency must be one of: USD, EUR, GBP, CAD, AUD'),
    
  alertThreshold: body('alertThreshold')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Alert threshold must be between 0 and 1'),
  
  // Transaction validation
  amount: body('amount')
    .isNumeric()
    .withMessage('Amount must be a valid number'),
    
  description: body('description')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Description must be between 1 and 500 characters'),
    
  date: body('date')
    .isISO8601()
    .toDate()
    .withMessage('Date must be a valid ISO 8601 date'),
    
  category: body('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category cannot exceed 100 characters'),
  
  // Pagination validation
  page: query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
    
  limit: query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
    
  // Date range validation
  startDate: query('startDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Start date must be a valid ISO 8601 date'),
    
  endDate: query('endDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('End date must be a valid ISO 8601 date'),
  
  // MongoDB ObjectId validation
  objectId: param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
    
  userId: param('userId')
    .isMongoId()
    .withMessage('Invalid user ID format'),
  
  // File upload validation
  fileType: body('fileType')
    .optional()
    .isIn(['csv', 'json'])
    .withMessage('File type must be csv or json'),
  
  // ML model validation
  modelType: body('modelType')
    .isIn(['clustering', 'prediction', 'stress_calculation', 'anomaly_detection'])
    .withMessage('Invalid model type'),
    
  modelVersion: body('version')
    .matches(/^\d+\.\d+\.\d+$/)
    .withMessage('Version must follow semantic versioning (e.g., 1.0.0)'),
  
  // Prediction validation
  predictionType: body('predictionType')
    .isIn(['balance', 'spending', 'income', 'category_spending'])
    .withMessage('Invalid prediction type'),
    
  targetDate: body('targetDate')
    .isISO8601()
    .toDate()
    .custom((value, { req }) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Target date must be in the future');
      }
      return true;
    }),
  
  confidenceLevel: body('confidenceLevel')
    .optional()
    .isFloat({ min: 0.5, max: 0.99 })
    .withMessage('Confidence level must be between 0.5 and 0.99')
};

/**
 * Validation rule sets for different endpoints
 */
const validationSets = {
  // User registration
  userRegistration: [
    validationRules.email,
    validationRules.password,
    validationRules.firstName,
    validationRules.lastName,
    handleValidationErrors
  ],
  
  // User login
  userLogin: [
    validationRules.email,
    body('password').notEmpty().withMessage('Password is required'),
    handleValidationErrors
  ],
  
  // User profile update
  userProfileUpdate: [
    validationRules.firstName,
    validationRules.lastName,
    validationRules.currency,
    validationRules.alertThreshold,
    handleValidationErrors
  ],
  
  // Transaction creation
  transactionCreate: [
    validationRules.amount,
    validationRules.description,
    validationRules.date,
    validationRules.category,
    handleValidationErrors
  ],
  
  // Transaction query
  transactionQuery: [
    validationRules.page,
    validationRules.limit,
    validationRules.startDate,
    validationRules.endDate,
    query('category').optional().trim(),
    handleValidationErrors
  ],
  
  // Prediction creation
  predictionCreate: [
    validationRules.predictionType,
    validationRules.targetDate,
    validationRules.confidenceLevel,
    handleValidationErrors
  ],
  
  // ML model metadata
  modelMetadata: [
    validationRules.modelType,
    validationRules.modelVersion,
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Model name is required and cannot exceed 100 characters'),
    body('algorithm').isIn(['kmeans', 'dbscan', 'lstm', 'linear_regression', 'random_forest', 'gradient_boosting', 'svm', 'neural_network']).withMessage('Invalid algorithm'),
    body('framework').isIn(['scikit-learn', 'tensorflow', 'pytorch', 'xgboost', 'custom']).withMessage('Invalid framework'),
    handleValidationErrors
  ],
  
  // Generic ObjectId validation
  objectIdParam: [
    validationRules.objectId,
    handleValidationErrors
  ],
  
  // User ID parameter validation
  userIdParam: [
    validationRules.userId,
    handleValidationErrors
  ]
};

/**
 * Custom validation middleware for date ranges
 */
const validateDateRange = (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [{
          field: 'dateRange',
          message: 'Start date must be before end date'
        }]
      });
    }
    
    // Check if date range is not too large (e.g., max 2 years)
    const maxRange = 2 * 365 * 24 * 60 * 60 * 1000; // 2 years in milliseconds
    if (end - start > maxRange) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [{
          field: 'dateRange',
          message: 'Date range cannot exceed 2 years'
        }]
      });
    }
  }
  
  next();
};

/**
 * Custom validation middleware for file uploads
 */
const validateFileUpload = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      error: 'Validation failed',
      details: [{
        field: 'file',
        message: 'File is required'
      }]
    });
  }
  
  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (req.file.size > maxSize) {
    return res.status(400).json({
      error: 'Validation failed',
      details: [{
        field: 'file',
        message: 'File size cannot exceed 10MB'
      }]
    });
  }
  
  // Check file type
  const allowedTypes = ['text/csv', 'application/json'];
  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({
      error: 'Validation failed',
      details: [{
        field: 'file',
        message: 'File must be CSV or JSON format'
      }]
    });
  }
  
  next();
};

module.exports = {
  validationRules,
  validationSets,
  handleValidationErrors,
  validateDateRange,
  validateFileUpload
};