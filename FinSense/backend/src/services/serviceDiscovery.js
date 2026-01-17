/**
 * Service Discovery and Load Balancing
 * 
 * Manages discovery of ML service instances and provides load balancing
 * across multiple instances for high availability and performance.
 */

const axios = require('axios');
const { logger } = require('../config/logger');

class ServiceInstance {
  constructor(id, url, options = {}) {
    this.id = id;
    this.url = url;
    this.weight = options.weight || 1;
    this.priority = options.priority || 1;
    this.tags = options.tags || [];
    
    // Health tracking
    this.isHealthy = true;
    this.lastHealthCheck = null;
    this.consecutiveFailures = 0;
    this.responseTime = null;
    
    // Load tracking
    this.activeRequests = 0;
    this.totalRequests = 0;
    this.successfulRequests = 0;
    this.failedRequests = 0;
    
    // Timestamps
    this.registeredAt = new Date();
    this.lastUsed = null;
  }

  recordRequest() {
    this.activeRequests++;
    this.totalRequests++;
    this.lastUsed = new Date();
  }

  recordSuccess(responseTime) {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    this.successfulRequests++;
    this.responseTime = responseTime;
    this.consecutiveFailures = 0;
    this.isHealthy = true;
  }

  recordFailure() {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    this.failedRequests++;
    this.consecutiveFailures++;
    
    // Mark as unhealthy after 3 consecutive failures
    if (this.consecutiveFailures >= 3) {
      this.isHealthy = false;
    }
  }

  getStats() {
    return {
      id: this.id,
      url: this.url,
      isHealthy: this.isHealthy,
      weight: this.weight,
      priority: this.priority,
      tags: this.tags,
      activeRequests: this.activeRequests,
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      consecutiveFailures: this.consecutiveFailures,
      responseTime: this.responseTime,
      successRate: this.totalRequests > 0 ? this.successfulRequests / this.totalRequests : 0,
      lastHealthCheck: this.lastHealthCheck,
      lastUsed: this.lastUsed,
      registeredAt: this.registeredAt
    };
  }
}

class LoadBalancer {
  constructor(strategy = 'round-robin') {
    this.strategy = strategy;
    this.currentIndex = 0;
  }

  selectInstance(instances) {
    const healthyInstances = instances.filter(instance => instance.isHealthy);
    
    if (healthyInstances.length === 0) {
      throw new Error('No healthy service instances available');
    }

    switch (this.strategy) {
      case 'round-robin':
        return this.roundRobin(healthyInstances);
      case 'weighted-round-robin':
        return this.weightedRoundRobin(healthyInstances);
      case 'least-connections':
        return this.leastConnections(healthyInstances);
      case 'least-response-time':
        return this.leastResponseTime(healthyInstances);
      case 'random':
        return this.random(healthyInstances);
      case 'priority':
        return this.priority(healthyInstances);
      default:
        return this.roundRobin(healthyInstances);
    }
  }

  roundRobin(instances) {
    const instance = instances[this.currentIndex % instances.length];
    this.currentIndex = (this.currentIndex + 1) % instances.length;
    return instance;
  }

  weightedRoundRobin(instances) {
    const totalWeight = instances.reduce((sum, instance) => sum + instance.weight, 0);
    let randomWeight = Math.random() * totalWeight;
    
    for (const instance of instances) {
      randomWeight -= instance.weight;
      if (randomWeight <= 0) {
        return instance;
      }
    }
    
    return instances[0]; // Fallback
  }

  leastConnections(instances) {
    return instances.reduce((min, instance) => 
      instance.activeRequests < min.activeRequests ? instance : min
    );
  }

  leastResponseTime(instances) {
    const instancesWithResponseTime = instances.filter(instance => instance.responseTime !== null);
    
    if (instancesWithResponseTime.length === 0) {
      return this.leastConnections(instances);
    }
    
    return instancesWithResponseTime.reduce((min, instance) => 
      instance.responseTime < min.responseTime ? instance : min
    );
  }

  random(instances) {
    return instances[Math.floor(Math.random() * instances.length)];
  }

  priority(instances) {
    // Sort by priority (higher priority first), then by least connections
    const sortedInstances = instances.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.activeRequests - b.activeRequests;
    });
    
    return sortedInstances[0];
  }
}

class ServiceDiscovery {
  constructor(options = {}) {
    this.serviceName = options.serviceName || 'ml-service';
    this.healthCheckInterval = options.healthCheckInterval || 30000; // 30 seconds
    this.healthCheckTimeout = options.healthCheckTimeout || 5000; // 5 seconds
    this.loadBalancer = new LoadBalancer(options.loadBalancingStrategy || 'least-connections');
    
    this.instances = new Map();
    this.healthCheckTimer = null;
    
    // Start health checking
    this.startHealthChecking();
  }

  registerInstance(id, url, options = {}) {
    const instance = new ServiceInstance(id, url, options);
    this.instances.set(id, instance);
    
    logger.info(`Registered service instance: ${id}`, {
      url,
      weight: instance.weight,
      priority: instance.priority,
      tags: instance.tags
    });
    
    // Immediate health check for new instance
    this.checkInstanceHealth(instance);
    
    return instance;
  }

  unregisterInstance(id) {
    const instance = this.instances.get(id);
    if (instance) {
      this.instances.delete(id);
      logger.info(`Unregistered service instance: ${id}`, {
        url: instance.url,
        stats: instance.getStats()
      });
    }
  }

  getInstance() {
    const instances = Array.from(this.instances.values());
    
    if (instances.length === 0) {
      throw new Error('No service instances registered');
    }
    
    return this.loadBalancer.selectInstance(instances);
  }

  getInstanceById(id) {
    return this.instances.get(id);
  }

  getAllInstances() {
    return Array.from(this.instances.values());
  }

  getHealthyInstances() {
    return Array.from(this.instances.values()).filter(instance => instance.isHealthy);
  }

  async checkInstanceHealth(instance) {
    try {
      const startTime = Date.now();
      
      const response = await axios.get(`${instance.url}/health`, {
        timeout: this.healthCheckTimeout,
        validateStatus: (status) => status < 500
      });
      
      const responseTime = Date.now() - startTime;
      instance.lastHealthCheck = new Date();
      
      if (response.status === 200) {
        const wasUnhealthy = !instance.isHealthy;
        instance.recordSuccess(responseTime);
        
        if (wasUnhealthy) {
          logger.info(`Service instance recovered: ${instance.id}`, {
            url: instance.url,
            responseTime
          });
        }
      } else {
        instance.recordFailure();
        logger.warn(`Service instance health check failed: ${instance.id}`, {
          url: instance.url,
          status: response.status,
          consecutiveFailures: instance.consecutiveFailures
        });
      }
      
    } catch (error) {
      instance.recordFailure();
      instance.lastHealthCheck = new Date();
      
      logger.warn(`Service instance health check error: ${instance.id}`, {
        url: instance.url,
        error: error.message,
        consecutiveFailures: instance.consecutiveFailures
      });
    }
  }

  startHealthChecking() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    this.healthCheckTimer = setInterval(async () => {
      const instances = Array.from(this.instances.values());
      
      // Check all instances in parallel
      await Promise.all(instances.map(instance => 
        this.checkInstanceHealth(instance).catch(error => {
          logger.error(`Health check failed for instance ${instance.id}`, {
            error: error.message
          });
        })
      ));
      
    }, this.healthCheckInterval);
    
    logger.info(`Started health checking for ${this.serviceName}`, {
      interval: this.healthCheckInterval,
      timeout: this.healthCheckTimeout
    });
  }

  stopHealthChecking() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
      logger.info(`Stopped health checking for ${this.serviceName}`);
    }
  }

  getStats() {
    const instances = Array.from(this.instances.values());
    const healthyCount = instances.filter(instance => instance.isHealthy).length;
    
    return {
      serviceName: this.serviceName,
      totalInstances: instances.length,
      healthyInstances: healthyCount,
      unhealthyInstances: instances.length - healthyCount,
      loadBalancingStrategy: this.loadBalancer.strategy,
      instances: instances.map(instance => instance.getStats()),
      aggregateStats: {
        totalRequests: instances.reduce((sum, instance) => sum + instance.totalRequests, 0),
        successfulRequests: instances.reduce((sum, instance) => sum + instance.successfulRequests, 0),
        failedRequests: instances.reduce((sum, instance) => sum + instance.failedRequests, 0),
        activeRequests: instances.reduce((sum, instance) => sum + instance.activeRequests, 0),
        averageResponseTime: this.calculateAverageResponseTime(instances)
      }
    };
  }

  calculateAverageResponseTime(instances) {
    const instancesWithResponseTime = instances.filter(instance => instance.responseTime !== null);
    
    if (instancesWithResponseTime.length === 0) {
      return null;
    }
    
    const totalResponseTime = instancesWithResponseTime.reduce(
      (sum, instance) => sum + instance.responseTime, 0
    );
    
    return totalResponseTime / instancesWithResponseTime.length;
  }

  // Auto-discovery from environment variables or configuration
  autoDiscoverInstances() {
    // Check if ML service is enabled
    const mlServiceEnabled = process.env.ML_SERVICE_ENABLED !== 'false';
    
    if (!mlServiceEnabled) {
      logger.info('ML service is disabled, skipping service discovery');
      return;
    }
    
    const mlServiceUrls = process.env.ML_SERVICE_URLS;
    
    if (mlServiceUrls) {
      const urls = mlServiceUrls.split(',').map(url => url.trim());
      
      urls.forEach((url, index) => {
        const instanceId = `ml-service-${index + 1}`;
        this.registerInstance(instanceId, url, {
          weight: 1,
          priority: 1,
          tags: ['auto-discovered']
        });
      });
      
      logger.info(`Auto-discovered ${urls.length} ML service instances`);
    } else {
      // Default single instance
      const defaultUrl = process.env.ML_SERVICE_URL || 'http://localhost:5001';
      this.registerInstance('ml-service-default', defaultUrl, {
        weight: 1,
        priority: 1,
        tags: ['default']
      });
      
      logger.info('Using default ML service instance', { url: defaultUrl });
    }
  }

  destroy() {
    this.stopHealthChecking();
    this.instances.clear();
    logger.info(`Service discovery destroyed for ${this.serviceName}`);
  }
}

// Singleton instance
let serviceDiscovery = null;

function createServiceDiscovery(options = {}) {
  if (!serviceDiscovery) {
    serviceDiscovery = new ServiceDiscovery(options);
    serviceDiscovery.autoDiscoverInstances();
  }
  return serviceDiscovery;
}

function getServiceDiscovery() {
  if (!serviceDiscovery) {
    return createServiceDiscovery();
  }
  return serviceDiscovery;
}

// Graceful shutdown
process.on('SIGTERM', () => {
  if (serviceDiscovery) {
    serviceDiscovery.destroy();
  }
});

process.on('SIGINT', () => {
  if (serviceDiscovery) {
    serviceDiscovery.destroy();
  }
});

module.exports = {
  ServiceInstance,
  LoadBalancer,
  ServiceDiscovery,
  createServiceDiscovery,
  getServiceDiscovery
};