/**
 * API Monitoring Service
 * 
 * Comprehensive monitoring system for API interactions, performance metrics,
 * error tracking, and real-time analytics.
 */

const { logger } = require('../config/logger');
const fs = require('fs');
const path = require('path');

class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        byEndpoint: new Map(),
        byMethod: new Map(),
        byStatusCode: new Map(),
        byUser: new Map()
      },
      performance: {
        responseTimes: [],
        averageResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        slowestEndpoints: new Map(),
        fastestEndpoints: new Map()
      },
      errors: {
        total: 0,
        byType: new Map(),
        byEndpoint: new Map(),
        recent: []
      },
      system: {
        startTime: Date.now(),
        lastReset: Date.now(),
        memoryUsage: [],
        cpuUsage: []
      }
    };

    // Start periodic cleanup and aggregation
    this.startPeriodicTasks();
  }

  recordRequest(req, res, responseTime, error = null) {
    const endpoint = this.normalizeEndpoint(req.route?.path || req.path);
    const method = req.method;
    const statusCode = res.statusCode;
    const userId = req.userId?.toString() || 'anonymous';
    const timestamp = new Date();

    // Update request counts
    this.metrics.requests.total++;
    
    if (error || statusCode >= 400) {
      this.metrics.requests.failed++;
      this.recordError(endpoint, method, statusCode, error, timestamp);
    } else {
      this.metrics.requests.successful++;
    }

    // Update endpoint metrics
    this.updateEndpointMetrics(endpoint, method, statusCode, responseTime, userId);

    // Update performance metrics
    this.updatePerformanceMetrics(endpoint, responseTime);

    // Log detailed request info
    this.logRequestDetails(req, res, responseTime, error);
  }

  normalizeEndpoint(path) {
    if (!path) return 'unknown';
    
    // Replace dynamic segments with placeholders
    return path
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9]{24}/g, '/:id') // MongoDB ObjectIds
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid') // UUIDs
      .toLowerCase();
  }

  updateEndpointMetrics(endpoint, method, statusCode, responseTime, userId) {
    // By endpoint
    if (!this.metrics.requests.byEndpoint.has(endpoint)) {
      this.metrics.requests.byEndpoint.set(endpoint, {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0,
        responseTimes: [],
        methods: new Map(),
        statusCodes: new Map(),
        users: new Set()
      });
    }

    const endpointMetrics = this.metrics.requests.byEndpoint.get(endpoint);
    endpointMetrics.total++;
    endpointMetrics.responseTimes.push(responseTime);
    endpointMetrics.users.add(userId);

    if (statusCode >= 400) {
      endpointMetrics.failed++;
    } else {
      endpointMetrics.successful++;
    }

    // Update method counts
    const methodCount = endpointMetrics.methods.get(method) || 0;
    endpointMetrics.methods.set(method, methodCount + 1);

    // Update status code counts
    const statusCount = endpointMetrics.statusCodes.get(statusCode) || 0;
    endpointMetrics.statusCodes.set(statusCode, statusCount + 1);

    // Calculate average response time
    endpointMetrics.averageResponseTime = 
      endpointMetrics.responseTimes.reduce((sum, time) => sum + time, 0) / 
      endpointMetrics.responseTimes.length;

    // By method
    const methodMetrics = this.metrics.requests.byMethod.get(method) || { total: 0, successful: 0, failed: 0 };
    methodMetrics.total++;
    if (statusCode >= 400) {
      methodMetrics.failed++;
    } else {
      methodMetrics.successful++;
    }
    this.metrics.requests.byMethod.set(method, methodMetrics);

    // By status code
    const statusMetrics = this.metrics.requests.byStatusCode.get(statusCode) || 0;
    this.metrics.requests.byStatusCode.set(statusCode, statusMetrics + 1);

    // By user
    const userMetrics = this.metrics.requests.byUser.get(userId) || { total: 0, successful: 0, failed: 0, endpoints: new Set() };
    userMetrics.total++;
    userMetrics.endpoints.add(endpoint);
    if (statusCode >= 400) {
      userMetrics.failed++;
    } else {
      userMetrics.successful++;
    }
    this.metrics.requests.byUser.set(userId, userMetrics);
  }

  updatePerformanceMetrics(endpoint, responseTime) {
    this.metrics.performance.responseTimes.push(responseTime);

    // Keep only last 1000 response times for memory efficiency
    if (this.metrics.performance.responseTimes.length > 1000) {
      this.metrics.performance.responseTimes = this.metrics.performance.responseTimes.slice(-1000);
    }

    // Calculate percentiles
    const sortedTimes = [...this.metrics.performance.responseTimes].sort((a, b) => a - b);
    const length = sortedTimes.length;
    
    this.metrics.performance.averageResponseTime = 
      sortedTimes.reduce((sum, time) => sum + time, 0) / length;
    
    this.metrics.performance.p95ResponseTime = 
      sortedTimes[Math.floor(length * 0.95)] || 0;
    
    this.metrics.performance.p99ResponseTime = 
      sortedTimes[Math.floor(length * 0.99)] || 0;

    // Track slowest endpoints
    const currentSlowest = this.metrics.performance.slowestEndpoints.get(endpoint) || 0;
    if (responseTime > currentSlowest) {
      this.metrics.performance.slowestEndpoints.set(endpoint, responseTime);
    }

    // Track fastest endpoints (for endpoints with multiple requests)
    const endpointMetrics = this.metrics.requests.byEndpoint.get(endpoint);
    if (endpointMetrics && endpointMetrics.total > 1) {
      const currentFastest = this.metrics.performance.fastestEndpoints.get(endpoint) || Infinity;
      if (responseTime < currentFastest) {
        this.metrics.performance.fastestEndpoints.set(endpoint, responseTime);
      }
    }
  }

  recordError(endpoint, method, statusCode, error, timestamp) {
    this.metrics.errors.total++;

    const errorType = error ? error.constructor.name : `HTTP_${statusCode}`;
    const errorCount = this.metrics.errors.byType.get(errorType) || 0;
    this.metrics.errors.byType.set(errorType, errorCount + 1);

    const endpointErrorCount = this.metrics.errors.byEndpoint.get(endpoint) || 0;
    this.metrics.errors.byEndpoint.set(endpoint, endpointErrorCount + 1);

    // Keep recent errors (last 100)
    this.metrics.errors.recent.push({
      timestamp,
      endpoint,
      method,
      statusCode,
      errorType,
      message: error?.message || `HTTP ${statusCode}`,
      stack: error?.stack
    });

    if (this.metrics.errors.recent.length > 100) {
      this.metrics.errors.recent = this.metrics.errors.recent.slice(-100);
    }
  }

  logRequestDetails(req, res, responseTime, error) {
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl || req.url,
      endpoint: this.normalizeEndpoint(req.route?.path || req.path),
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      userId: req.userId?.toString(),
      contentLength: res.get('Content-Length'),
      referrer: req.get('Referrer')
    };

    if (error) {
      logData.error = {
        message: error.message,
        type: error.constructor.name,
        stack: error.stack
      };
    }

    // Log based on response time and status
    if (error || res.statusCode >= 500) {
      logger.error('API Request Error', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('API Request Warning', logData);
    } else if (responseTime > 5000) {
      logger.warn('Slow API Request', logData);
    } else {
      logger.info('API Request', logData);
    }
  }

  getMetrics() {
    // Convert Maps to Objects for JSON serialization
    const serializableMetrics = {
      requests: {
        ...this.metrics.requests,
        byEndpoint: Object.fromEntries(
          Array.from(this.metrics.requests.byEndpoint.entries()).map(([key, value]) => [
            key,
            {
              ...value,
              methods: Object.fromEntries(value.methods),
              statusCodes: Object.fromEntries(value.statusCodes),
              users: Array.from(value.users),
              uniqueUsers: value.users.size
            }
          ])
        ),
        byMethod: Object.fromEntries(this.metrics.requests.byMethod),
        byStatusCode: Object.fromEntries(this.metrics.requests.byStatusCode),
        byUser: Object.fromEntries(
          Array.from(this.metrics.requests.byUser.entries()).map(([key, value]) => [
            key,
            {
              ...value,
              endpoints: Array.from(value.endpoints),
              uniqueEndpoints: value.endpoints.size
            }
          ])
        )
      },
      performance: {
        ...this.metrics.performance,
        slowestEndpoints: Object.fromEntries(this.metrics.performance.slowestEndpoints),
        fastestEndpoints: Object.fromEntries(this.metrics.performance.fastestEndpoints)
      },
      errors: {
        ...this.metrics.errors,
        byType: Object.fromEntries(this.metrics.errors.byType),
        byEndpoint: Object.fromEntries(this.metrics.errors.byEndpoint)
      },
      system: {
        ...this.metrics.system,
        uptime: Date.now() - this.metrics.system.startTime,
        currentMemory: process.memoryUsage(),
        currentCpu: process.cpuUsage()
      }
    };

    return serializableMetrics;
  }

  getHealthStatus() {
    const metrics = this.getMetrics();
    const errorRate = metrics.requests.total > 0 ? 
      (metrics.requests.failed / metrics.requests.total) * 100 : 0;
    
    const avgResponseTime = metrics.performance.averageResponseTime;
    
    let status = 'healthy';
    const issues = [];

    if (errorRate > 10) {
      status = 'unhealthy';
      issues.push(`High error rate: ${errorRate.toFixed(2)}%`);
    } else if (errorRate > 5) {
      status = 'degraded';
      issues.push(`Elevated error rate: ${errorRate.toFixed(2)}%`);
    }

    if (avgResponseTime > 5000) {
      status = status === 'healthy' ? 'degraded' : status;
      issues.push(`High average response time: ${avgResponseTime.toFixed(0)}ms`);
    }

    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
    
    if (memoryUsageMB > 500) {
      status = status === 'healthy' ? 'degraded' : status;
      issues.push(`High memory usage: ${memoryUsageMB.toFixed(0)}MB`);
    }

    return {
      status,
      issues,
      summary: {
        totalRequests: metrics.requests.total,
        errorRate: `${errorRate.toFixed(2)}%`,
        averageResponseTime: `${avgResponseTime.toFixed(0)}ms`,
        uptime: `${Math.floor(metrics.system.uptime / 1000)}s`,
        memoryUsage: `${memoryUsageMB.toFixed(0)}MB`
      }
    };
  }

  startPeriodicTasks() {
    // Update system metrics every 30 seconds
    setInterval(() => {
      this.metrics.system.memoryUsage.push({
        timestamp: Date.now(),
        ...process.memoryUsage()
      });

      this.metrics.system.cpuUsage.push({
        timestamp: Date.now(),
        ...process.cpuUsage()
      });

      // Keep only last 100 system metrics
      if (this.metrics.system.memoryUsage.length > 100) {
        this.metrics.system.memoryUsage = this.metrics.system.memoryUsage.slice(-100);
      }
      if (this.metrics.system.cpuUsage.length > 100) {
        this.metrics.system.cpuUsage = this.metrics.system.cpuUsage.slice(-100);
      }
    }, 30000);

    // Export metrics to file every 5 minutes
    setInterval(() => {
      this.exportMetrics();
    }, 5 * 60 * 1000);
  }

  exportMetrics() {
    try {
      const metricsDir = path.join(process.cwd(), 'logs', 'metrics');
      if (!fs.existsSync(metricsDir)) {
        fs.mkdirSync(metricsDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = path.join(metricsDir, `metrics-${timestamp}.json`);
      
      fs.writeFileSync(filename, JSON.stringify(this.getMetrics(), null, 2));
      
      logger.debug('Metrics exported', { filename });
    } catch (error) {
      logger.error('Failed to export metrics', { error: error.message });
    }
  }

  reset() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        byEndpoint: new Map(),
        byMethod: new Map(),
        byStatusCode: new Map(),
        byUser: new Map()
      },
      performance: {
        responseTimes: [],
        averageResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        slowestEndpoints: new Map(),
        fastestEndpoints: new Map()
      },
      errors: {
        total: 0,
        byType: new Map(),
        byEndpoint: new Map(),
        recent: []
      },
      system: {
        startTime: Date.now(),
        lastReset: Date.now(),
        memoryUsage: [],
        cpuUsage: []
      }
    };

    logger.info('Metrics reset');
  }
}

// Singleton instance
let metricsCollector = null;

function getMetricsCollector() {
  if (!metricsCollector) {
    metricsCollector = new MetricsCollector();
  }
  return metricsCollector;
}

// Express middleware for API monitoring
function apiMonitoringMiddleware(req, res, next) {
  const startTime = Date.now();
  const collector = getMetricsCollector();

  // Capture original end method
  const originalEnd = res.end;
  
  res.end = function(chunk, encoding) {
    const responseTime = Date.now() - startTime;
    
    // Record the request
    collector.recordRequest(req, res, responseTime);
    
    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  // Handle errors
  const originalNext = next;
  next = function(error) {
    if (error) {
      const responseTime = Date.now() - startTime;
      collector.recordRequest(req, res, responseTime, error);
    }
    originalNext(error);
  };

  next();
}

module.exports = {
  MetricsCollector,
  getMetricsCollector,
  apiMonitoringMiddleware
};