/**
 * Monitoring Dashboard Service
 * 
 * Real-time monitoring dashboard with WebSocket support for live metrics,
 * alerting, and performance visualization.
 */

const { logger } = require('../config/logger');
const { getMetricsCollector } = require('./apiMonitoring');
const { getMLServiceClient } = require('./mlServiceClient');
const { getServiceDiscovery } = require('./serviceDiscovery');
const { getConnectionManager } = require('./connectionPool');

class MonitoringDashboard {
  constructor() {
    this.clients = new Set();
    this.alerts = [];
    this.alertThresholds = {
      errorRate: 10, // percentage
      responseTime: 5000, // milliseconds
      memoryUsage: 500, // MB
      diskSpace: 90, // percentage
      cpuUsage: 80 // percentage
    };
    
    this.startMonitoring();
  }

  // WebSocket client management
  addClient(ws) {
    this.clients.add(ws);
    
    ws.on('close', () => {
      this.clients.delete(ws);
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error', { error: error.message });
      this.clients.delete(ws);
    });

    // Send initial data
    this.sendToClient(ws, {
      type: 'initial',
      data: this.getComprehensiveStatus()
    });

    logger.info('Monitoring client connected', { totalClients: this.clients.size });
  }

  sendToClient(ws, message) {
    try {
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.send(JSON.stringify(message));
      }
    } catch (error) {
      logger.error('Failed to send message to client', { error: error.message });
      this.clients.delete(ws);
    }
  }

  broadcast(message) {
    const deadClients = new Set();
    
    this.clients.forEach(client => {
      try {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(JSON.stringify(message));
        } else {
          deadClients.add(client);
        }
      } catch (error) {
        logger.error('Failed to broadcast to client', { error: error.message });
        deadClients.add(client);
      }
    });

    // Clean up dead clients
    deadClients.forEach(client => this.clients.delete(client));
  }

  getComprehensiveStatus() {
    const metricsCollector = getMetricsCollector();
    const mlClient = getMLServiceClient();
    const serviceDiscovery = getServiceDiscovery();
    const connectionManager = getConnectionManager();

    return {
      timestamp: new Date().toISOString(),
      api: {
        metrics: metricsCollector.getMetrics(),
        health: metricsCollector.getHealthStatus()
      },
      mlService: {
        stats: mlClient.getServiceStats(),
        instances: serviceDiscovery.getStats()
      },
      connections: connectionManager.getAllStats(),
      system: this.getSystemMetrics(),
      alerts: this.getActiveAlerts(),
      summary: this.getSystemSummary()
    };
  }

  getSystemMetrics() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memoryUsage.external / 1024 / 1024), // MB
        rss: Math.round(memoryUsage.rss / 1024 / 1024) // MB
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: Math.floor(process.uptime()),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid
    };
  }

  getSystemSummary() {
    const metricsCollector = getMetricsCollector();
    const metrics = metricsCollector.getMetrics();
    const health = metricsCollector.getHealthStatus();
    const system = this.getSystemMetrics();

    return {
      status: health.status,
      totalRequests: metrics.requests.total,
      errorRate: metrics.requests.total > 0 ? 
        ((metrics.requests.failed / metrics.requests.total) * 100).toFixed(2) + '%' : '0%',
      averageResponseTime: Math.round(metrics.performance.averageResponseTime) + 'ms',
      memoryUsage: system.memory.used + 'MB',
      uptime: this.formatUptime(system.uptime),
      activeAlerts: this.alerts.filter(alert => alert.active).length
    };
  }

  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  checkAlerts() {
    const metricsCollector = getMetricsCollector();
    const metrics = metricsCollector.getMetrics();
    const system = this.getSystemMetrics();
    const newAlerts = [];

    // Error rate alert
    const errorRate = metrics.requests.total > 0 ? 
      (metrics.requests.failed / metrics.requests.total) * 100 : 0;
    
    if (errorRate > this.alertThresholds.errorRate) {
      newAlerts.push({
        id: 'high-error-rate',
        type: 'error',
        severity: errorRate > 20 ? 'critical' : 'warning',
        title: 'High Error Rate',
        message: `Error rate is ${errorRate.toFixed(2)}% (threshold: ${this.alertThresholds.errorRate}%)`,
        value: errorRate,
        threshold: this.alertThresholds.errorRate,
        timestamp: new Date().toISOString()
      });
    }

    // Response time alert
    const avgResponseTime = metrics.performance.averageResponseTime;
    if (avgResponseTime > this.alertThresholds.responseTime) {
      newAlerts.push({
        id: 'slow-response-time',
        type: 'performance',
        severity: avgResponseTime > 10000 ? 'critical' : 'warning',
        title: 'Slow Response Time',
        message: `Average response time is ${Math.round(avgResponseTime)}ms (threshold: ${this.alertThresholds.responseTime}ms)`,
        value: avgResponseTime,
        threshold: this.alertThresholds.responseTime,
        timestamp: new Date().toISOString()
      });
    }

    // Memory usage alert
    const memoryUsageMB = system.memory.used;
    if (memoryUsageMB > this.alertThresholds.memoryUsage) {
      newAlerts.push({
        id: 'high-memory-usage',
        type: 'system',
        severity: memoryUsageMB > 1000 ? 'critical' : 'warning',
        title: 'High Memory Usage',
        message: `Memory usage is ${memoryUsageMB}MB (threshold: ${this.alertThresholds.memoryUsage}MB)`,
        value: memoryUsageMB,
        threshold: this.alertThresholds.memoryUsage,
        timestamp: new Date().toISOString()
      });
    }

    // ML Service health alert
    try {
      const mlStats = getMLServiceClient().getServiceStats();
      const healthyInstances = mlStats.service_discovery?.healthyInstances || 0;
      const totalInstances = mlStats.service_discovery?.totalInstances || 0;
      
      if (totalInstances > 0 && healthyInstances === 0) {
        newAlerts.push({
          id: 'ml-service-down',
          type: 'service',
          severity: 'critical',
          title: 'ML Service Unavailable',
          message: 'All ML service instances are unhealthy',
          value: 0,
          threshold: 1,
          timestamp: new Date().toISOString()
        });
      } else if (totalInstances > 0 && healthyInstances < totalInstances) {
        newAlerts.push({
          id: 'ml-service-degraded',
          type: 'service',
          severity: 'warning',
          title: 'ML Service Degraded',
          message: `Only ${healthyInstances}/${totalInstances} ML service instances are healthy`,
          value: healthyInstances,
          threshold: totalInstances,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error('Failed to check ML service health for alerts', { error: error.message });
    }

    // Update alerts
    this.updateAlerts(newAlerts);
  }

  updateAlerts(newAlerts) {
    const currentTime = Date.now();
    const alertTimeout = 5 * 60 * 1000; // 5 minutes

    // Mark existing alerts as resolved if they're not in new alerts
    this.alerts.forEach(alert => {
      const stillActive = newAlerts.some(newAlert => newAlert.id === alert.id);
      if (!stillActive && alert.active) {
        alert.active = false;
        alert.resolvedAt = new Date().toISOString();
        logger.info('Alert resolved', { alertId: alert.id, title: alert.title });
      }
    });

    // Add new alerts or update existing ones
    newAlerts.forEach(newAlert => {
      const existingAlert = this.alerts.find(alert => alert.id === newAlert.id);
      
      if (existingAlert) {
        // Update existing alert
        existingAlert.active = true;
        existingAlert.lastSeen = newAlert.timestamp;
        existingAlert.value = newAlert.value;
        existingAlert.count = (existingAlert.count || 1) + 1;
      } else {
        // Add new alert
        newAlert.active = true;
        newAlert.count = 1;
        newAlert.firstSeen = newAlert.timestamp;
        newAlert.lastSeen = newAlert.timestamp;
        this.alerts.push(newAlert);
        
        logger.warn('New alert triggered', { 
          alertId: newAlert.id, 
          title: newAlert.title, 
          severity: newAlert.severity 
        });
      }
    });

    // Remove old resolved alerts
    this.alerts = this.alerts.filter(alert => {
      if (!alert.active && alert.resolvedAt) {
        const resolvedTime = new Date(alert.resolvedAt).getTime();
        return (currentTime - resolvedTime) < alertTimeout;
      }
      return true;
    });

    // Broadcast alert updates
    if (newAlerts.length > 0) {
      this.broadcast({
        type: 'alerts',
        data: this.getActiveAlerts()
      });
    }
  }

  getActiveAlerts() {
    return this.alerts.filter(alert => alert.active);
  }

  getAllAlerts() {
    return this.alerts;
  }

  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(alert => alert.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date().toISOString();
      
      logger.info('Alert acknowledged', { alertId, title: alert.title });
      
      this.broadcast({
        type: 'alert-acknowledged',
        data: { alertId, acknowledgedAt: alert.acknowledgedAt }
      });
      
      return true;
    }
    return false;
  }

  updateAlertThresholds(thresholds) {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds };
    
    logger.info('Alert thresholds updated', { thresholds: this.alertThresholds });
    
    this.broadcast({
      type: 'thresholds-updated',
      data: this.alertThresholds
    });
  }

  startMonitoring() {
    // Check alerts every 30 seconds
    setInterval(() => {
      this.checkAlerts();
    }, 30000);

    // Broadcast metrics every 10 seconds
    setInterval(() => {
      if (this.clients.size > 0) {
        this.broadcast({
          type: 'metrics-update',
          data: this.getComprehensiveStatus()
        });
      }
    }, 10000);

    logger.info('Monitoring dashboard started');
  }

  getMetricsHistory(timeRange = '1h') {
    // This would typically query a time-series database
    // For now, return current metrics
    return {
      timeRange,
      data: this.getComprehensiveStatus(),
      message: 'Historical data would be available with time-series database integration'
    };
  }

  exportReport(format = 'json') {
    const report = {
      generatedAt: new Date().toISOString(),
      timeRange: '24h', // Would be configurable
      summary: this.getSystemSummary(),
      metrics: getMetricsCollector().getMetrics(),
      alerts: this.getAllAlerts(),
      system: this.getSystemMetrics()
    };

    if (format === 'json') {
      return JSON.stringify(report, null, 2);
    }
    
    // Could add CSV, PDF formats here
    return report;
  }
}

// Singleton instance
let monitoringDashboard = null;

function getMonitoringDashboard() {
  if (!monitoringDashboard) {
    monitoringDashboard = new MonitoringDashboard();
  }
  return monitoringDashboard;
}

module.exports = {
  MonitoringDashboard,
  getMonitoringDashboard
};