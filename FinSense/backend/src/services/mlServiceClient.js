/**
 * ML Service Client
 * 
 * Dedicated service for handling communication with the Python ML service.
 * Includes advanced features like circuit breaker, retry logic, health monitoring,
 * and connection pooling.
 */

const axios = require('axios');
const { logger } = require('../config/logger');

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.timeout = options.timeout || 60000; // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 10000; // 10 seconds
    
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now();
    
    // Statistics
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      circuitOpenCount: 0,
      lastStateChange: Date.now()
    };
  }

  async call(fn, context = '') {
    this.stats.totalRequests++;
    
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        this.stats.circuitOpenCount++;
        throw new Error(`Circuit breaker is OPEN for ${context}. Next attempt in ${Math.ceil((this.nextAttempt - Date.now()) / 1000)}s`);
      } else {
        this.state = 'HALF_OPEN';
        this.stats.lastStateChange = Date.now();
        logger.info(`Circuit breaker transitioning to HALF_OPEN for ${context}`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess(context);
      return result;
    } catch (error) {
      this.onFailure(context, error);
      throw error;
    }
  }

  onSuccess(context) {
    this.failureCount = 0;
    if (this.state !== 'CLOSED') {
      this.state = 'CLOSED';
      this.stats.lastStateChange = Date.now();
      logger.info(`Circuit breaker CLOSED for ${context}`);
    }
    this.stats.successfulRequests++;
  }

  onFailure(context, error) {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.stats.failedRequests++;
    
    logger.warn(`Circuit breaker failure ${this.failureCount}/${this.failureThreshold} for ${context}`, {
      error: error.message,
      status: error.response?.status
    });
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      this.stats.lastStateChange = Date.now();
      logger.error(`Circuit breaker OPEN for ${context}. Next attempt at ${new Date(this.nextAttempt).toISOString()}`);
    }
  }

  getStats() {
    return {
      ...this.stats,
      state: this.state,
      failureCount: this.failureCount,
      nextAttempt: this.state === 'OPEN' ? new Date(this.nextAttempt).toISOString() : null,
      healthRatio: this.stats.totalRequests > 0 ? this.stats.successfulRequests / this.stats.totalRequests : 1
    };
  }

  reset() {
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED';
    this.nextAttempt = Date.now();
    this.stats.lastStateChange = Date.now();
    logger.info('Circuit breaker manually reset');
  }
}

class MLServiceClient {
  constructor(options = {}) {
    this.baseURL = options.baseURL || process.env.ML_SERVICE_URL || 'http://localhost:5001';
    this.timeout = options.timeout || parseInt(process.env.ML_SERVICE_TIMEOUT) || 30000;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    
    // Create axios instance with connection pooling
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FinSense-Backend/1.0.0'
      },
      // Connection pooling settings
      maxRedirects: 3,
      validateStatus: (status) => status < 500, // Don't throw on 4xx errors
    });

    // Circuit breakers for different service endpoints
    this.circuitBreakers = {
      categorize: new CircuitBreaker({ failureThreshold: 3, timeout: 30000 }),
      predict: new CircuitBreaker({ failureThreshold: 3, timeout: 60000 }),
      stress: new CircuitBreaker({ failureThreshold: 5, timeout: 45000 }),
      learning: new CircuitBreaker({ failureThreshold: 10, timeout: 30000 }),
      alerts: new CircuitBreaker({ failureThreshold: 5, timeout: 30000 }),
      health: new CircuitBreaker({ failureThreshold: 2, timeout: 15000 })
    };

    // Request/Response interceptors
    this.setupInterceptors();
    
    // Health monitoring
    this.healthStatus = {
      isHealthy: true,
      lastHealthCheck: null,
      consecutiveFailures: 0,
      responseTime: null
    };

    // Start periodic health checks
    this.startHealthMonitoring();
  }

  setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        config.metadata = { startTime: Date.now() };
        logger.debug(`ML Service Request: ${config.method?.toUpperCase()} ${config.url}`, {
          timeout: config.timeout,
          retries: config.retries || 0
        });
        return config;
      },
      (error) => {
        logger.error('ML Service Request Error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        const duration = Date.now() - response.config.metadata.startTime;
        this.healthStatus.responseTime = duration;
        
        logger.debug(`ML Service Response: ${response.status} ${response.config.url}`, {
          duration: `${duration}ms`,
          dataSize: JSON.stringify(response.data).length
        });
        
        return response;
      },
      (error) => {
        const duration = error.config?.metadata ? Date.now() - error.config.metadata.startTime : null;
        
        logger.warn('ML Service Response Error', {
          url: error.config?.url,
          status: error.response?.status,
          duration: duration ? `${duration}ms` : 'unknown',
          error: error.message
        });
        
        return Promise.reject(error);
      }
    );
  }

  async retryRequest(requestFn, context, retries = this.maxRetries) {
    let lastError;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await requestFn();
        
        if (attempt > 1) {
          logger.info(`ML Service request succeeded on attempt ${attempt}/${retries} for ${context}`);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        logger.warn(`ML Service request attempt ${attempt}/${retries} failed for ${context}`, {
          error: error.message,
          status: error.response?.status,
          willRetry: attempt < retries
        });
        
        if (attempt === retries) {
          break;
        }
        
        // Exponential backoff with jitter
        const delay = this.retryDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  async categorizeTransactions(userId, transactions, options = {}) {
    const context = 'categorize';
    const circuitBreaker = this.circuitBreakers[context];
    
    return await circuitBreaker.call(async () => {
      return await this.retryRequest(async () => {
        const response = await this.client.post('/ml/categorize', {
          user_id: userId,
          transactions,
          model_version: options.modelVersion
        });
        
        if (response.status >= 400) {
          throw new Error(`ML Service error: ${response.data.error || 'Unknown error'}`);
        }
        
        return response.data;
      }, context);
    }, context);
  }

  async generatePredictions(userId, balanceData, options = {}) {
    const context = 'predict';
    const circuitBreaker = this.circuitBreakers[context];
    
    return await circuitBreaker.call(async () => {
      return await this.retryRequest(async () => {
        const response = await this.client.post('/ml/predict', {
          user_id: userId,
          balance_data: balanceData,
          prediction_days: options.predictionDays || 30,
          include_confidence: options.includeConfidence !== false,
          model_version: options.modelVersion
        });
        
        if (response.status >= 400) {
          throw new Error(`ML Service error: ${response.data.error || 'Unknown error'}`);
        }
        
        return response.data;
      }, context);
    }, context);
  }

  async calculateStressScore(userId, currentBalance, predictions, transactionHistory, options = {}) {
    const context = 'stress';
    const circuitBreaker = this.circuitBreakers[context];
    
    return await circuitBreaker.call(async () => {
      return await this.retryRequest(async () => {
        const response = await this.client.post('/ml/stress-score', {
          user_id: userId,
          current_balance: currentBalance,
          predictions,
          transaction_history: transactionHistory
        });
        
        if (response.status >= 400) {
          throw new Error(`ML Service error: ${response.data.error || 'Unknown error'}`);
        }
        
        return response.data;
      }, context);
    }, context);
  }

  async submitLearningCorrections(corrections) {
    const context = 'learning';
    const circuitBreaker = this.circuitBreakers[context];
    
    return await circuitBreaker.call(async () => {
      return await this.retryRequest(async () => {
        const response = await this.client.post('/ml/learning/submit-correction', {
          corrections
        });
        
        if (response.status >= 400) {
          throw new Error(`ML Service error: ${response.data.error || 'Unknown error'}`);
        }
        
        return response.data;
      }, context);
    }, context);
  }

  async getUserLearningStats(userId) {
    const context = 'learning';
    const circuitBreaker = this.circuitBreakers[context];
    
    return await circuitBreaker.call(async () => {
      return await this.retryRequest(async () => {
        const response = await this.client.get(`/ml/learning/stats/${userId}`);
        
        if (response.status >= 400) {
          throw new Error(`ML Service error: ${response.data.error || 'Unknown error'}`);
        }
        
        return response.data;
      }, context);
    }, context);
  }

  async getUserAlerts(userId) {
    const context = 'alerts';
    const circuitBreaker = this.circuitBreakers[context];
    
    return await circuitBreaker.call(async () => {
      return await this.retryRequest(async () => {
        const response = await this.client.get(`/ml/alerts/${userId}`);
        
        if (response.status >= 400) {
          throw new Error(`ML Service error: ${response.data.error || 'Unknown error'}`);
        }
        
        return response.data;
      }, context);
    }, context);
  }

  async acknowledgeAlert(userId, alertId) {
    const context = 'alerts';
    const circuitBreaker = this.circuitBreakers[context];
    
    return await circuitBreaker.call(async () => {
      return await this.retryRequest(async () => {
        const response = await this.client.post(`/ml/alerts/${userId}/${alertId}/acknowledge`);
        
        if (response.status >= 400) {
          throw new Error(`ML Service error: ${response.data.error || 'Unknown error'}`);
        }
        
        return response.data;
      }, context);
    }, context);
  }

  async getUserRecommendations(userId) {
    const context = 'alerts';
    const circuitBreaker = this.circuitBreakers[context];
    
    return await circuitBreaker.call(async () => {
      return await this.retryRequest(async () => {
        const response = await this.client.get(`/ml/recommendations/${userId}`);
        
        if (response.status >= 400) {
          throw new Error(`ML Service error: ${response.data.error || 'Unknown error'}`);
        }
        
        return response.data;
      }, context);
    }, context);
  }

  async updateRecommendationStatus(userId, recommendationId, status, progressNote) {
    const context = 'alerts';
    const circuitBreaker = this.circuitBreakers[context];
    
    return await circuitBreaker.call(async () => {
      return await this.retryRequest(async () => {
        const response = await this.client.put(`/ml/recommendations/${userId}/${recommendationId}/status`, {
          status,
          progress_note: progressNote
        });
        
        if (response.status >= 400) {
          throw new Error(`ML Service error: ${response.data.error || 'Unknown error'}`);
        }
        
        return response.data;
      }, context);
    }, context);
  }

  async checkHealth() {
    const context = 'health';
    const circuitBreaker = this.circuitBreakers[context];
    
    try {
      const result = await circuitBreaker.call(async () => {
        const startTime = Date.now();
        const response = await this.client.get('/health', { timeout: 5000 });
        
        this.healthStatus = {
          isHealthy: true,
          lastHealthCheck: new Date().toISOString(),
          consecutiveFailures: 0,
          responseTime: Date.now() - startTime,
          serviceData: response.data
        };
        
        return response.data;
      }, context);
      
      return result;
    } catch (error) {
      this.healthStatus.consecutiveFailures++;
      this.healthStatus.isHealthy = this.healthStatus.consecutiveFailures < 3;
      this.healthStatus.lastHealthCheck = new Date().toISOString();
      
      throw error;
    }
  }

  startHealthMonitoring() {
    // Perform health check every 30 seconds
    setInterval(async () => {
      try {
        await this.checkHealth();
        logger.debug('ML Service health check passed');
      } catch (error) {
        logger.warn('ML Service health check failed', { 
          error: error.message,
          consecutiveFailures: this.healthStatus.consecutiveFailures
        });
      }
    }, 30000);
  }

  getServiceStats() {
    const circuitBreakerStats = {};
    Object.keys(this.circuitBreakers).forEach(key => {
      circuitBreakerStats[key] = this.circuitBreakers[key].getStats();
    });

    return {
      baseURL: this.baseURL,
      timeout: this.timeout,
      maxRetries: this.maxRetries,
      health: this.healthStatus,
      circuitBreakers: circuitBreakerStats,
      timestamp: new Date().toISOString()
    };
  }

  resetCircuitBreakers() {
    Object.values(this.circuitBreakers).forEach(cb => cb.reset());
    logger.info('All circuit breakers reset');
  }

  // Batch operations for efficiency
  async batchRequest(requests) {
    const results = await Promise.allSettled(requests.map(async (request) => {
      const { method, endpoint, data, context } = request;
      
      switch (method.toLowerCase()) {
        case 'get':
          return await this.client.get(endpoint);
        case 'post':
          return await this.client.post(endpoint, data);
        case 'put':
          return await this.client.put(endpoint, data);
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
    }));

    return results.map((result, index) => ({
      request: requests[index],
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value.data : null,
      error: result.status === 'rejected' ? result.reason.message : null
    }));
  }
}

// Singleton instance
let mlServiceClient = null;

function createMLServiceClient(options = {}) {
  if (!mlServiceClient) {
    mlServiceClient = new MLServiceClient(options);
    logger.info('ML Service Client initialized', {
      baseURL: mlServiceClient.baseURL,
      timeout: mlServiceClient.timeout,
      maxRetries: mlServiceClient.maxRetries
    });
  }
  return mlServiceClient;
}

function getMLServiceClient() {
  if (!mlServiceClient) {
    return createMLServiceClient();
  }
  return mlServiceClient;
}

module.exports = {
  MLServiceClient,
  CircuitBreaker,
  createMLServiceClient,
  getMLServiceClient
};