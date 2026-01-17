/**
 * Monitoring Routes
 * 
 * API endpoints for accessing monitoring data, metrics, alerts,
 * and system health information.
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logger } = require('../config/logger');
const { getMetricsCollector } = require('../services/apiMonitoring');
const { getMonitoringDashboard } = require('../services/monitoringDashboard');

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors in monitoring API', { errors: errors.array() });
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * Public Health Check (no authentication required)
 */
router.get('/health',
  async (req, res) => {
    try {
      const metricsCollector = getMetricsCollector();
      const health = metricsCollector.getHealthStatus();
      
      res.status(health.status === 'healthy' ? 200 : 503).json({
        status: health.status,
        timestamp: new Date().toISOString(),
        summary: health.summary,
        issues: health.issues
      });
    } catch (error) {
      logger.error('Health check failed', { error: error.message });
      res.status(503).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * Detailed System Status (requires authentication)
 */
router.get('/status',
  authenticateToken,
  async (req, res) => {
    try {
      const dashboard = getMonitoringDashboard();
      const status = dashboard.getComprehensiveStatus();
      
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      logger.error('Failed to get system status', { error: error.message });
      res.status(500).json({
        error: 'Failed to get system status',
        message: error.message
      });
    }
  }
);

/**
 * API Metrics
 */
router.get('/metrics',
  authenticateToken,
  [
    query('format').optional().isIn(['json', 'prometheus']),
    query('timeRange').optional().isIn(['1h', '6h', '24h', '7d'])
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { format = 'json', timeRange = '1h' } = req.query;
      const metricsCollector = getMetricsCollector();
      
      if (format === 'prometheus') {
        // Return Prometheus-formatted metrics
        const metrics = metricsCollector.getMetrics();
        const prometheusMetrics = formatPrometheusMetrics(metrics);
        
        res.set('Content-Type', 'text/plain');
        res.send(prometheusMetrics);
      } else {
        const metrics = metricsCollector.getMetrics();
        
        res.json({
          success: true,
          timeRange,
          data: metrics,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error('Failed to get metrics', { error: error.message });
      res.status(500).json({
        error: 'Failed to get metrics',
        message: error.message
      });
    }
  }
);

/**
 * Performance Metrics
 */
router.get('/performance',
  authenticateToken,
  [
    query('endpoint').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { endpoint, limit = 20 } = req.query;
      const metricsCollector = getMetricsCollector();
      const metrics = metricsCollector.getMetrics();
      
      let performanceData = {
        overall: metrics.performance,
        endpoints: {}
      };

      // Filter by endpoint if specified
      if (endpoint) {
        const endpointMetrics = metrics.requests.byEndpoint[endpoint];
        if (endpointMetrics) {
          performanceData.endpoints[endpoint] = endpointMetrics;
        }
      } else {
        // Get top endpoints by request count
        const sortedEndpoints = Object.entries(metrics.requests.byEndpoint)
          .sort(([,a], [,b]) => b.total - a.total)
          .slice(0, limit);
        
        performanceData.endpoints = Object.fromEntries(sortedEndpoints);
      }

      res.json({
        success: true,
        data: performanceData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to get performance metrics', { error: error.message });
      res.status(500).json({
        error: 'Failed to get performance metrics',
        message: error.message
      });
    }
  }
);

/**
 * Error Tracking
 */
router.get('/errors',
  authenticateToken,
  [
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('type').optional().isString(),
    query('endpoint').optional().isString()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { limit = 50, type, endpoint } = req.query;
      const metricsCollector = getMetricsCollector();
      const metrics = metricsCollector.getMetrics();
      
      let errors = metrics.errors.recent;

      // Filter by type if specified
      if (type) {
        errors = errors.filter(error => error.errorType === type);
      }

      // Filter by endpoint if specified
      if (endpoint) {
        errors = errors.filter(error => error.endpoint === endpoint);
      }

      // Limit results
      errors = errors.slice(-limit);

      res.json({
        success: true,
        data: {
          recent: errors,
          summary: {
            total: metrics.errors.total,
            byType: metrics.errors.byType,
            byEndpoint: metrics.errors.byEndpoint
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to get error data', { error: error.message });
      res.status(500).json({
        error: 'Failed to get error data',
        message: error.message
      });
    }
  }
);

/**
 * Alerts Management
 */
router.get('/alerts',
  authenticateToken,
  [
    query('active').optional().isBoolean(),
    query('severity').optional().isIn(['info', 'warning', 'critical'])
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { active, severity } = req.query;
      const dashboard = getMonitoringDashboard();
      
      let alerts = dashboard.getAllAlerts();

      // Filter by active status
      if (active !== undefined) {
        alerts = alerts.filter(alert => alert.active === active);
      }

      // Filter by severity
      if (severity) {
        alerts = alerts.filter(alert => alert.severity === severity);
      }

      res.json({
        success: true,
        data: alerts,
        summary: {
          total: alerts.length,
          active: alerts.filter(alert => alert.active).length,
          bySeverity: alerts.reduce((acc, alert) => {
            acc[alert.severity] = (acc[alert.severity] || 0) + 1;
            return acc;
          }, {})
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to get alerts', { error: error.message });
      res.status(500).json({
        error: 'Failed to get alerts',
        message: error.message
      });
    }
  }
);

/**
 * Acknowledge Alert
 */
router.post('/alerts/:alertId/acknowledge',
  authenticateToken,
  [
    param('alertId').notEmpty()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { alertId } = req.params;
      const dashboard = getMonitoringDashboard();
      
      const success = dashboard.acknowledgeAlert(alertId);
      
      if (success) {
        res.json({
          success: true,
          message: 'Alert acknowledged successfully',
          alertId,
          acknowledgedBy: req.userId,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(404).json({
          error: 'Alert not found',
          alertId
        });
      }
    } catch (error) {
      logger.error('Failed to acknowledge alert', { error: error.message });
      res.status(500).json({
        error: 'Failed to acknowledge alert',
        message: error.message
      });
    }
  }
);

/**
 * Update Alert Thresholds (admin only)
 */
router.put('/alerts/thresholds',
  authenticateToken,
  requireRole(['admin']),
  [
    body('errorRate').optional().isFloat({ min: 0, max: 100 }),
    body('responseTime').optional().isInt({ min: 100, max: 60000 }),
    body('memoryUsage').optional().isInt({ min: 100, max: 2000 }),
    body('diskSpace').optional().isFloat({ min: 50, max: 99 }),
    body('cpuUsage').optional().isFloat({ min: 50, max: 99 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const thresholds = req.body;
      const dashboard = getMonitoringDashboard();
      
      dashboard.updateAlertThresholds(thresholds);
      
      logger.info('Alert thresholds updated', { 
        thresholds, 
        updatedBy: req.userId 
      });
      
      res.json({
        success: true,
        message: 'Alert thresholds updated successfully',
        thresholds,
        updatedBy: req.userId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to update alert thresholds', { error: error.message });
      res.status(500).json({
        error: 'Failed to update alert thresholds',
        message: error.message
      });
    }
  }
);

/**
 * System Information
 */
router.get('/system',
  authenticateToken,
  async (req, res) => {
    try {
      const dashboard = getMonitoringDashboard();
      const status = dashboard.getComprehensiveStatus();
      
      res.json({
        success: true,
        data: {
          system: status.system,
          connections: status.connections,
          mlService: status.mlService
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to get system information', { error: error.message });
      res.status(500).json({
        error: 'Failed to get system information',
        message: error.message
      });
    }
  }
);

/**
 * Export Report
 */
router.get('/report',
  authenticateToken,
  [
    query('format').optional().isIn(['json', 'csv']),
    query('timeRange').optional().isIn(['1h', '6h', '24h', '7d'])
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { format = 'json', timeRange = '24h' } = req.query;
      const dashboard = getMonitoringDashboard();
      
      const report = dashboard.exportReport(format);
      
      if (format === 'json') {
        res.json({
          success: true,
          data: JSON.parse(report),
          timeRange
        });
      } else {
        res.set('Content-Type', 'text/csv');
        res.set('Content-Disposition', `attachment; filename="monitoring-report-${Date.now()}.csv"`);
        res.send(report);
      }
    } catch (error) {
      logger.error('Failed to export report', { error: error.message });
      res.status(500).json({
        error: 'Failed to export report',
        message: error.message
      });
    }
  }
);

/**
 * Reset Metrics (admin only)
 */
router.post('/metrics/reset',
  authenticateToken,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const metricsCollector = getMetricsCollector();
      metricsCollector.reset();
      
      logger.info('Metrics reset by admin', { adminId: req.userId });
      
      res.json({
        success: true,
        message: 'Metrics reset successfully',
        resetBy: req.userId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to reset metrics', { error: error.message });
      res.status(500).json({
        error: 'Failed to reset metrics',
        message: error.message
      });
    }
  }
);

// Helper function to format metrics for Prometheus
function formatPrometheusMetrics(metrics) {
  let output = '';
  
  // Request metrics
  output += `# HELP api_requests_total Total number of API requests\n`;
  output += `# TYPE api_requests_total counter\n`;
  output += `api_requests_total ${metrics.requests.total}\n\n`;
  
  output += `# HELP api_requests_successful_total Total number of successful API requests\n`;
  output += `# TYPE api_requests_successful_total counter\n`;
  output += `api_requests_successful_total ${metrics.requests.successful}\n\n`;
  
  output += `# HELP api_requests_failed_total Total number of failed API requests\n`;
  output += `# TYPE api_requests_failed_total counter\n`;
  output += `api_requests_failed_total ${metrics.requests.failed}\n\n`;
  
  // Response time metrics
  output += `# HELP api_response_time_average Average response time in milliseconds\n`;
  output += `# TYPE api_response_time_average gauge\n`;
  output += `api_response_time_average ${metrics.performance.averageResponseTime}\n\n`;
  
  output += `# HELP api_response_time_p95 95th percentile response time in milliseconds\n`;
  output += `# TYPE api_response_time_p95 gauge\n`;
  output += `api_response_time_p95 ${metrics.performance.p95ResponseTime}\n\n`;
  
  // Error metrics
  output += `# HELP api_errors_total Total number of errors\n`;
  output += `# TYPE api_errors_total counter\n`;
  output += `api_errors_total ${metrics.errors.total}\n\n`;
  
  // System metrics
  const memoryUsage = process.memoryUsage();
  output += `# HELP system_memory_used_bytes Memory usage in bytes\n`;
  output += `# TYPE system_memory_used_bytes gauge\n`;
  output += `system_memory_used_bytes ${memoryUsage.heapUsed}\n\n`;
  
  output += `# HELP system_uptime_seconds System uptime in seconds\n`;
  output += `# TYPE system_uptime_seconds gauge\n`;
  output += `system_uptime_seconds ${Math.floor(process.uptime())}\n\n`;
  
  return output;
}

module.exports = router;
