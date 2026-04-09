/**
 * ML Service Integration Routes
 * 
 * This module provides REST API endpoints that integrate with the Python ML service,
 * including transaction categorization, financial predictions, stress scoring,
 * and alert management.
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken, validateResourceOwnership } = require('../middleware/auth');
const { logger } = require('../config/logger');
const { Transaction, FinancialStress } = require('../models');
const { getMLServiceClient } = require('../services/mlServiceClient');
const { getServiceDiscovery } = require('../services/serviceDiscovery');
const { getConnectionManager } = require('../services/connectionPool');

const router = express.Router();

// Initialize services
const mlClient = getMLServiceClient();
const serviceDiscovery = getServiceDiscovery();
const connectionManager = getConnectionManager();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors in ML integration API', { errors: errors.array() });
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * Transaction Categorization Endpoint
 */
router.post('/categorize',
  authenticateToken,
  [
    body('transactions').isArray({ min: 1, max: 1000 }),
    body('transactions.*.id').notEmpty(),
    body('transactions.*.date').isISO8601(),
    body('transactions.*.amount').isFloat(),
    body('transactions.*.description').isLength({ min: 1, max: 500 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { transactions } = req.body;
      const userId = req.userId.toString();

      logger.info(`Categorizing ${transactions.length} transactions for user ${userId}`);

      const response = await mlClient.categorizeTransactions(userId, transactions);
      
      logger.info(`Successfully categorized transactions`, {
        userId,
        transactionCount: transactions.length,
        processingTime: response.processing_time
      });

      res.json({
        success: true,
        results: response.results,
        metadata: {
          model_version: response.model_version,
          processing_time: response.processing_time,
          total_processed: response.total_processed,
          clustering_stats: response.clustering_stats
        }
      });

    } catch (error) {
      logger.error('Transaction categorization failed', { 
        error: error.message,
        userId: req.userId
      });

      if (error.message.includes('Circuit breaker is OPEN')) {
        return res.status(503).json({
          error: 'ML service temporarily unavailable',
          message: 'Please try again later'
        });
      }

      res.status(500).json({
        error: 'Categorization failed',
        message: error.message
      });
    }
  }
);

/**
 * Financial Prediction Endpoint
 */
router.post('/predict',
  authenticateToken,
  [
    body('balance_data').isArray({ min: 30 }),
    body('prediction_days').optional().isInt({ min: 1, max: 365 }),
    body('include_confidence').optional().isBoolean()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { balance_data, prediction_days = 30, include_confidence = true } = req.body;
      const userId = req.userId.toString();

      logger.info(`Generating predictions for user ${userId}`, {
        dataPoints: balance_data.length,
        predictionDays: prediction_days
      });

      const response = await mlClient.generatePredictions(userId, balance_data, {
        predictionDays: prediction_days,
        includeConfidence: include_confidence
      });
      
      logger.info(`Successfully generated predictions`, {
        userId,
        predictionsCount: response.predictions.length,
        modelAccuracy: response.model_accuracy
      });

      res.json({
        success: true,
        predictions: response.predictions,
        metadata: {
          model_version: response.model_version,
          model_accuracy: response.model_accuracy,
          confidence_intervals: response.confidence_intervals,
          preprocessing_stats: response.preprocessing_stats,
          generated_at: response.generated_at
        }
      });

    } catch (error) {
      logger.error('Financial prediction failed', { 
        error: error.message,
        userId: req.userId
      });

      if (error.message.includes('Circuit breaker is OPEN')) {
        return res.status(503).json({
          error: 'ML service temporarily unavailable',
          message: 'Please try again later'
        });
      }

      res.status(500).json({
        error: 'Prediction failed',
        message: error.message
      });
    }
  }
);

/**
 * Financial Stress Score Calculation Endpoint
 */
router.post('/stress-score',
  authenticateToken,
  [
    body('current_balance').isFloat(),
    body('predictions').isArray({ min: 1 }),
    body('transaction_history').isArray({ min: 1 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { current_balance, predictions, transaction_history } = req.body;
      const userId = req.userId.toString();

      logger.info(`Calculating stress score for user ${userId}`);

      const response = await mlClient.calculateStressScore(
        userId, 
        current_balance, 
        predictions, 
        transaction_history
      );
      
      // Store stress score in database
      try {
        await FinancialStress.create({
          userId: req.userId,
          stressScore: response.stress_score,
          riskLevel: response.risk_level,
          factors: response.factors,
          recommendations: response.recommendations,
          calculatedAt: new Date(response.calculated_at)
        });
      } catch (dbError) {
        logger.warn('Failed to store stress score in database', { error: dbError.message });
      }

      logger.info(`Successfully calculated stress score`, {
        userId,
        stressScore: response.stress_score,
        riskLevel: response.risk_level,
        alertsCount: response.alerts?.length || 0
      });

      res.json({
        success: true,
        stress_score: response.stress_score,
        risk_level: response.risk_level,
        factors: response.factors,
        recommendations: response.recommendations,
        alerts: response.alerts,
        metadata: {
          calculated_at: response.calculated_at,
          alert_summary: response.alert_summary,
          recommendation_summary: response.recommendation_summary
        }
      });

    } catch (error) {
      logger.error('Stress score calculation failed', { 
        error: error.message,
        userId: req.userId,
        status: error.response?.status 
      });

      if (error.message === 'Circuit breaker is OPEN') {
        return res.status(503).json({
          error: 'ML service temporarily unavailable',
          message: 'Please try again later'
        });
      }

      res.status(error.response?.status || 500).json({
        error: 'Stress score calculation failed',
        message: error.response?.data?.error || error.message
      });
    }
  }
);

/**
 * User Learning Corrections Endpoint
 */
router.post('/learning/corrections',
  authenticateToken,
  [
    body('corrections').isArray({ min: 1, max: 100 }),
    body('corrections.*.transaction_id').notEmpty(),
    body('corrections.*.original_category').notEmpty(),
    body('corrections.*.corrected_category').notEmpty(),
    body('corrections.*.confidence_score').isFloat({ min: 0, max: 1 }),
    body('corrections.*.transaction_description').notEmpty(),
    body('corrections.*.transaction_amount').isFloat(),
    body('corrections.*.transaction_date').isISO8601()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { corrections } = req.body;
      const userId = req.userId.toString();

      // Add user_id to each correction
      const correctionsWithUserId = corrections.map(correction => ({
        ...correction,
        user_id: userId
      }));

      logger.info(`Submitting ${corrections.length} user corrections for learning`);

      const response = await mlClient.submitLearningCorrections(correctionsWithUserId);
      
      logger.info(`Successfully submitted corrections`, {
        userId,
        correctionsCount: corrections.length,
        learningResults: response.learning_results
      });

      res.json({
        success: true,
        corrections_processed: response.corrections_processed,
        learning_results: response.learning_results,
        global_stats: response.global_stats
      });

    } catch (error) {
      logger.error('Learning corrections submission failed', { 
        error: error.message,
        userId: req.userId,
        status: error.response?.status 
      });

      res.status(error.response?.status || 500).json({
        error: 'Learning corrections failed',
        message: error.response?.data?.error || error.message
      });
    }
  }
);

/**
 * Get User Learning Statistics
 */
router.get('/learning/stats',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.userId.toString();

      const response = await mlClient.getUserLearningStats(userId);
      
      res.json({
        success: true,
        user_stats: response.user_stats
      });

    } catch (error) {
      logger.error('Failed to get learning statistics', { 
        error: error.message,
        userId: req.userId,
        status: error.response?.status 
      });

      res.status(error.response?.status || 500).json({
        error: 'Failed to get learning statistics',
        message: error.response?.data?.error || error.message
      });
    }
  }
);

/**
 * Alert Management Endpoints
 */

// Get user alerts
router.get('/alerts',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.userId.toString();

      const response = await mlClient.getUserAlerts(userId);
      
      res.json({
        success: true,
        alerts: response.active_alerts,
        total_count: response.total_count
      });

    } catch (error) {
      logger.error('Failed to get user alerts', { 
        error: error.message,
        userId: req.userId,
        status: error.response?.status 
      });

      res.status(error.response?.status || 500).json({
        error: 'Failed to get alerts',
        message: error.response?.data?.error || error.message
      });
    }
  }
);

// Acknowledge alert
router.post('/alerts/:alertId/acknowledge',
  authenticateToken,
  [
    param('alertId').notEmpty()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { alertId } = req.params;
      const userId = req.userId.toString();

      const response = await mlClient.acknowledgeAlert(userId, alertId);
      
      res.json({
        success: true,
        message: response.message,
        alert_id: alertId
      });

    } catch (error) {
      logger.error('Failed to acknowledge alert', { 
        error: error.message,
        userId: req.userId,
        alertId: req.params.alertId,
        status: error.response?.status 
      });

      res.status(error.response?.status || 500).json({
        error: 'Failed to acknowledge alert',
        message: error.response?.data?.error || error.message
      });
    }
  }
);

// Get user recommendations
router.get('/recommendations',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.userId.toString();

      const response = await mlClient.getUserRecommendations(userId);
      
      res.json({
        success: true,
        recommendations: response.data.recommendations,
        total_count: response.data.total_count
      });

    } catch (error) {
      logger.error('Failed to get user recommendations', { 
        error: error.message,
        userId: req.userId,
        status: error.response?.status 
      });

      res.status(error.response?.status || 500).json({
        error: 'Failed to get recommendations',
        message: error.response?.data?.error || error.message
      });
    }
  }
);

// Update recommendation status
router.put('/recommendations/:recommendationId/status',
  authenticateToken,
  [
    param('recommendationId').notEmpty(),
    body('status').isIn(['pending', 'in_progress', 'completed', 'dismissed']),
    body('progress_note').optional().isString()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { recommendationId } = req.params;
      const { status, progress_note } = req.body;
      const userId = req.userId.toString();

      const response = await mlClient.updateRecommendationStatus(userId, recommendationId, status, progress_note);
      
      res.json({
        success: true,
        message: response.message,
        recommendation_id: recommendationId,
        new_status: status
      });

    } catch (error) {
      logger.error('Failed to update recommendation status', { 
        error: error.message,
        userId: req.userId,
        recommendationId: req.params.recommendationId,
        status: error.response?.status 
      });

      res.status(error.response?.status || 500).json({
        error: 'Failed to update recommendation status',
        message: error.response?.data?.error || error.message
      });
    }
  }
);

/**
 * Dashboard Data Aggregation Endpoint
 */
router.get('/dashboard',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.userId;
      const days = parseInt(req.query.days) || 30;

      logger.info(`Aggregating dashboard data for user ${userId}`);

      // Get recent transactions
      const recentTransactions = await Transaction.find({ userId })
        .sort({ date: -1 })
        .limit(100)
        .lean();

      if (recentTransactions.length === 0) {
        return res.json({
          success: true,
          message: 'No transaction data available',
          data: {
            transactions: [],
            balance_data: [],
            predictions: [],
            stress_score: null,
            alerts: [],
            recommendations: []
          }
        });
      }

      // Prepare balance data from transactions
      const balanceData = [];
      let runningBalance = 0;
      
      // Calculate running balance (simplified - in production, you'd want actual balance history)
      recentTransactions.reverse().forEach(transaction => {
        runningBalance += transaction.amount;
        balanceData.push({
          date: transaction.date.toISOString(),
          balance: runningBalance
        });
      });

      // Parallel ML service calls
      const promises = [];

      // 1. Get predictions if we have enough data
      if (balanceData.length >= 30) {
        promises.push(
          mlClient.generatePredictions(userId.toString(), balanceData.slice(-60), {
            prediction_days: days,
            include_confidence: true
          }).catch(error => {
            logger.warn('Prediction failed in dashboard aggregation', { error: error.message });
            return null;
          })
        );
      } else {
        promises.push(Promise.resolve(null));
      }

      // 2. Get stress score if we have predictions
      promises.push(
        Promise.resolve().then(async () => {
          if (balanceData.length >= 30) {
            try {
              return await mlClient.calculateStressScore(
                userId.toString(),
                runningBalance,
                balanceData.slice(-30).map(item => ({ predicted_balance: item.balance })),
                recentTransactions.slice(-30)
              );
            } catch (error) {
              logger.warn('Stress score failed in dashboard aggregation', { error: error.message });
              return null;
            }
          }
          return null;
        })
      );

      // 3. Get alerts
      promises.push(
        mlClient.getUserAlerts(userId).catch(error => {
          logger.warn('Alerts failed in dashboard aggregation', { error: error.message });
          return null;
        })
      );

      // 4. Get recommendations
      promises.push(
        mlClient.getUserRecommendations(userId).catch(error => {
          logger.warn('Recommendations failed in dashboard aggregation', { error: error.message });
          return null;
        })
      );

      const [predictionsResponse, stressResponse, alertsResponse, recommendationsResponse] = await Promise.all(promises);

      // Aggregate results
      const dashboardData = {
        transactions: recentTransactions.slice(-30), // Last 30 transactions
        balance_data: balanceData.slice(-30), // Last 30 days of balance
        predictions: predictionsResponse?.predictions || [],
        stress_score: stressResponse ? {
          score: stressResponse.stress_score,
          risk_level: stressResponse.risk_level,
          factors: stressResponse.factors,
          calculated_at: stressResponse.calculated_at
        } : null,
        alerts: alertsResponse?.active_alerts || [],
        recommendations: recommendationsResponse?.recommendations || [],
        metadata: {
          data_period_days: days,
          last_updated: new Date().toISOString(),
          ml_service_status: {
            predictions: !!predictionsResponse,
            stress_score: !!stressResponse,
            alerts: !!alertsResponse,
            recommendations: !!recommendationsResponse
          }
        }
      };

      logger.info(`Successfully aggregated dashboard data`, {
        userId,
        transactionsCount: dashboardData.transactions.length,
        predictionsCount: dashboardData.predictions.length,
        alertsCount: dashboardData.alerts.length,
        recommendationsCount: dashboardData.recommendations.length
      });

      res.json({
        success: true,
        data: dashboardData
      });

    } catch (error) {
      logger.error('Dashboard data aggregation failed', { 
        error: error.message,
        userId: req.userId
      });

      res.status(500).json({
        error: 'Dashboard data aggregation failed',
        message: error.message
      });
    }
  }
);

/**
 * ML Service Health Check
 */
router.get('/health',
  async (req, res) => {
    try {
      const response = await mlClient.checkHealth();
      
      res.json({
        ml_service_status: 'healthy',
        ml_service_data: response,
        service_stats: mlClient.getServiceStats(),
        service_discovery: serviceDiscovery.getStats(),
        connection_pools: connectionManager.getAllStats(),
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('ML service health check failed', { error: error.message });
      
      res.status(503).json({
        ml_service_status: 'unhealthy',
        error: error.message,
        service_stats: mlClient.getServiceStats(),
        service_discovery: serviceDiscovery.getStats(),
        connection_pools: connectionManager.getAllStats(),
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * Service Management Endpoints
 */

// Get detailed service statistics
router.get('/stats',
  async (req, res) => {
    try {
      const stats = {
        ml_service_client: mlClient.getServiceStats(),
        service_discovery: serviceDiscovery.getStats(),
        connection_pools: connectionManager.getAllStats(),
        system_info: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu_usage: process.cpuUsage(),
          node_version: process.version,
          platform: process.platform
        },
        timestamp: new Date().toISOString()
      };

      res.json(stats);
    } catch (error) {
      logger.error('Failed to get service statistics', { error: error.message });
      res.status(500).json({
        error: 'Failed to get service statistics',
        message: error.message
      });
    }
  }
);

// Reset circuit breakers
router.post('/circuit-breakers/reset',
  async (req, res) => {
    try {
      mlClient.resetCircuitBreakers();
      
      logger.info('Circuit breakers reset by admin request');
      
      res.json({
        success: true,
        message: 'All circuit breakers have been reset',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to reset circuit breakers', { error: error.message });
      res.status(500).json({
        error: 'Failed to reset circuit breakers',
        message: error.message
      });
    }
  }
);

// Cleanup connection pools
router.post('/connections/cleanup',
  async (req, res) => {
    try {
      connectionManager.cleanupAll();
      
      logger.info('Connection pools cleaned up by admin request');
      
      res.json({
        success: true,
        message: 'Connection pools have been cleaned up',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to cleanup connection pools', { error: error.message });
      res.status(500).json({
        error: 'Failed to cleanup connection pools',
        message: error.message
      });
    }
  }
);

// Service discovery management
router.get('/service-discovery/instances',
  async (req, res) => {
    try {
      const instances = serviceDiscovery.getAllInstances();
      
      res.json({
        instances: instances.map(instance => instance.getStats()),
        total_count: instances.length,
        healthy_count: serviceDiscovery.getHealthyInstances().length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to get service instances', { error: error.message });
      res.status(500).json({
        error: 'Failed to get service instances',
        message: error.message
      });
    }
  }
);

// Register new service instance
router.post('/service-discovery/instances',
  [
    body('id').notEmpty(),
    body('url').isURL(),
    body('weight').optional().isInt({ min: 1, max: 100 }),
    body('priority').optional().isInt({ min: 1, max: 10 }),
    body('tags').optional().isArray()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id, url, weight, priority, tags } = req.body;
      
      const instance = serviceDiscovery.registerInstance(id, url, {
        weight: weight || 1,
        priority: priority || 1,
        tags: tags || []
      });
      
      logger.info(`Service instance registered via API: ${id}`, { url, weight, priority, tags });
      
      res.status(201).json({
        success: true,
        message: 'Service instance registered successfully',
        instance: instance.getStats(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to register service instance', { error: error.message });
      res.status(500).json({
        error: 'Failed to register service instance',
        message: error.message
      });
    }
  }
);

// Unregister service instance
router.delete('/service-discovery/instances/:id',
  [
    param('id').notEmpty()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      
      serviceDiscovery.unregisterInstance(id);
      
      logger.info(`Service instance unregistered via API: ${id}`);
      
      res.json({
        success: true,
        message: 'Service instance unregistered successfully',
        instance_id: id,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to unregister service instance', { error: error.message });
      res.status(500).json({
        error: 'Failed to unregister service instance',
        message: error.message
      });
    }
  }
);

module.exports = router;
