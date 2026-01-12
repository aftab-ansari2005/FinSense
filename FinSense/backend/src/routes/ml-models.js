/**
 * ML Model Management Routes
 * 
 * This module provides REST API endpoints for managing ML model metadata,
 * including CRUD operations, versioning, and deployment management.
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const MLModelMetadata = require('../models/MLModelMetadata');
const auth = require('../middleware/auth');
const logger = require('../config/logger');

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors in ML models API', { errors: errors.array() });
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Create new model metadata
router.post('/metadata',
  [
    body('modelType').isIn(['clustering', 'prediction', 'stress_calculation', 'anomaly_detection']),
    body('version').matches(/^\d+\.\d+\.\d+$/),
    body('name').isLength({ min: 1, max: 100 }),
    body('algorithm').isIn([
      'kmeans', 'dbscan', 'lstm', 'linear_regression', 'random_forest',
      'gradient_boosting', 'svm', 'neural_network'
    ]),
    body('framework').isIn(['scikit-learn', 'tensorflow', 'pytorch', 'xgboost', 'custom']),
    body('trainingDate').isISO8601(),
    body('trainingDuration').isFloat({ min: 0 }),
    body('datasetInfo.size').isInt({ min: 1 }),
    body('datasetInfo.features').isInt({ min: 1 }),
    body('datasetInfo.timeRange.start').isISO8601(),
    body('datasetInfo.timeRange.end').isISO8601(),
    body('parameters').isObject(),
    body('performance').isObject(),
    body('files.modelPath').notEmpty()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const modelData = req.body;
      
      // Check for existing model with same type and version
      const existingModel = await MLModelMetadata.findOne({
        modelType: modelData.modelType,
        version: modelData.version
      });
      
      if (existingModel) {
        return res.status(409).json({
          error: 'Model version already exists',
          modelType: modelData.modelType,
          version: modelData.version
        });
      }
      
      // Create new model metadata
      const model = new MLModelMetadata(modelData);
      await model.save();
      
      logger.info('Created new ML model metadata', {
        modelId: model._id,
        modelType: model.modelType,
        version: model.version
      });
      
      res.status(201).json({
        id: model._id,
        message: 'Model metadata created successfully',
        model: model
      });
      
    } catch (error) {
      logger.error('Failed to create model metadata', { error: error.message });
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          error: 'Model validation failed',
          details: Object.values(error.errors).map(err => err.message)
        });
      }
      
      res.status(500).json({
        error: 'Failed to create model metadata'
      });
    }
  }
);

// Get model metadata by type and version
router.get('/metadata/:modelType/:version',
  [
    param('modelType').isIn(['clustering', 'prediction', 'stress_calculation', 'anomaly_detection']),
    param('version').matches(/^\d+\.\d+\.\d+$/)
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { modelType, version } = req.params;
      
      const model = await MLModelMetadata.findOne({
        modelType,
        version,
        isActive: true
      });
      
      if (!model) {
        return res.status(404).json({
          error: 'Model not found',
          modelType,
          version
        });
      }
      
      // Record access for monitoring
      await model.recordPrediction();
      
      res.json(model);
      
    } catch (error) {
      logger.error('Failed to get model metadata', { error: error.message });
      res.status(500).json({
        error: 'Failed to retrieve model metadata'
      });
    }
  }
);

// Get latest model metadata by type
router.get('/metadata/:modelType/latest',
  [
    param('modelType').isIn(['clustering', 'prediction', 'stress_calculation', 'anomaly_detection'])
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { modelType } = req.params;
      
      const model = await MLModelMetadata.findLatestVersion(modelType);
      
      if (!model) {
        return res.status(404).json({
          error: 'No models found',
          modelType
        });
      }
      
      res.json(model);
      
    } catch (error) {
      logger.error('Failed to get latest model metadata', { error: error.message });
      res.status(500).json({
        error: 'Failed to retrieve latest model metadata'
      });
    }
  }
);

// List all models with optional filtering
router.get('/metadata',
  [
    query('modelType').optional().isIn(['clustering', 'prediction', 'stress_calculation', 'anomaly_detection']),
    query('status').optional().isIn(['training', 'testing', 'staging', 'production', 'deprecated']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { modelType, status, limit = 20, offset = 0 } = req.query;
      
      // Build query
      const query = { isActive: true };
      if (modelType) query.modelType = modelType;
      if (status) query['deployment.status'] = status;
      
      // Execute query with pagination
      const models = await MLModelMetadata.find(query)
        .sort({ trainingDate: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(offset));
      
      const total = await MLModelMetadata.countDocuments(query);
      
      res.json({
        models,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: offset + limit < total
        }
      });
      
    } catch (error) {
      logger.error('Failed to list models', { error: error.message });
      res.status(500).json({
        error: 'Failed to list models'
      });
    }
  }
);

// Update model deployment status
router.patch('/metadata/:id/deployment',
  [
    param('id').isMongoId(),
    body('status').isIn(['training', 'testing', 'staging', 'production', 'deprecated']),
    body('endpoint').optional().isURL(),
    body('replicas').optional().isInt({ min: 0 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status, endpoint, replicas } = req.body;
      
      const model = await MLModelMetadata.findById(id);
      if (!model) {
        return res.status(404).json({
          error: 'Model not found'
        });
      }
      
      // Update deployment info
      model.deployment.status = status;
      if (endpoint) model.deployment.endpoint = endpoint;
      if (replicas !== undefined) model.deployment.replicas = replicas;
      
      if (status === 'production') {
        await model.deploy(status, endpoint);
      } else {
        await model.save();
      }
      
      logger.info('Updated model deployment status', {
        modelId: id,
        status,
        modelType: model.modelType,
        version: model.version
      });
      
      res.json({
        message: 'Deployment status updated successfully',
        model: model
      });
      
    } catch (error) {
      logger.error('Failed to update deployment status', { error: error.message });
      res.status(500).json({
        error: 'Failed to update deployment status'
      });
    }
  }
);

// Get model performance history
router.get('/metadata/:modelType/performance',
  [
    param('modelType').isIn(['clustering', 'prediction', 'stress_calculation', 'anomaly_detection']),
    query('limit').optional().isInt({ min: 1, max: 50 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { modelType } = req.params;
      const { limit = 10 } = req.query;
      
      const performanceHistory = await MLModelMetadata.comparePerformance(
        modelType, 
        parseInt(limit)
      );
      
      res.json(performanceHistory);
      
    } catch (error) {
      logger.error('Failed to get performance history', { error: error.message });
      res.status(500).json({
        error: 'Failed to retrieve performance history'
      });
    }
  }
);

// Record model prediction (for monitoring)
router.post('/metadata/:id/prediction',
  [
    param('id').isMongoId(),
    body('latency').optional().isFloat({ min: 0 }),
    body('success').isBoolean()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { latency, success } = req.body;
      
      const model = await MLModelMetadata.findById(id);
      if (!model) {
        return res.status(404).json({
          error: 'Model not found'
        });
      }
      
      if (success) {
        await model.recordPrediction(latency);
      } else {
        await model.recordError();
      }
      
      res.json({
        message: 'Prediction recorded successfully'
      });
      
    } catch (error) {
      logger.error('Failed to record prediction', { error: error.message });
      res.status(500).json({
        error: 'Failed to record prediction'
      });
    }
  }
);

// Delete model metadata (soft delete)
router.delete('/metadata/:id',
  [
    param('id').isMongoId()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const model = await MLModelMetadata.findById(id);
      if (!model) {
        return res.status(404).json({
          error: 'Model not found'
        });
      }
      
      // Soft delete by setting isActive to false
      model.isActive = false;
      model.deployment.status = 'deprecated';
      await model.save();
      
      logger.info('Soft deleted model metadata', {
        modelId: id,
        modelType: model.modelType,
        version: model.version
      });
      
      res.json({
        message: 'Model metadata deleted successfully'
      });
      
    } catch (error) {
      logger.error('Failed to delete model metadata', { error: error.message });
      res.status(500).json({
        error: 'Failed to delete model metadata'
      });
    }
  }
);

// Get models needing retraining
router.get('/metadata/retraining/candidates',
  [
    query('maxAge').optional().isInt({ min: 1, max: 365 }),
    query('minErrorRate').optional().isFloat({ min: 0, max: 1 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { maxAge = 30, minErrorRate = 0.1 } = req.query;
      
      const candidates = await MLModelMetadata.findModelsNeedingRetraining(
        parseInt(maxAge),
        parseFloat(minErrorRate)
      );
      
      res.json({
        candidates,
        criteria: {
          maxAge: parseInt(maxAge),
          minErrorRate: parseFloat(minErrorRate)
        }
      });
      
    } catch (error) {
      logger.error('Failed to get retraining candidates', { error: error.message });
      res.status(500).json({
        error: 'Failed to get retraining candidates'
      });
    }
  }
);

// Health check for ML models service
router.get('/health', async (req, res) => {
  try {
    // Check database connectivity
    const modelCount = await MLModelMetadata.countDocuments({ isActive: true });
    
    // Check for active production models
    const productionModels = await MLModelMetadata.countDocuments({
      isActive: true,
      'deployment.status': 'production'
    });
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      statistics: {
        totalModels: modelCount,
        productionModels: productionModels
      }
    });
    
  } catch (error) {
    logger.error('ML models health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      error: 'Database connectivity issues'
    });
  }
});

module.exports = router;