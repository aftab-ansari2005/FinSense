/**
 * Connection Pool Manager
 * 
 * Manages HTTP connections to external services with pooling,
 * monitoring, and automatic cleanup.
 */

const { Agent } = require('http');
const { Agent: HttpsAgent } = require('https');
const { logger } = require('../config/logger');

class ConnectionPool {
  constructor(options = {}) {
    this.maxSockets = options.maxSockets || 50;
    this.maxFreeSockets = options.maxFreeSockets || 10;
    this.timeout = options.timeout || 30000;
    this.keepAlive = options.keepAlive !== false;
    this.keepAliveMsecs = options.keepAliveMsecs || 1000;
    
    // Create HTTP and HTTPS agents with connection pooling
    this.httpAgent = new Agent({
      keepAlive: this.keepAlive,
      keepAliveMsecs: this.keepAliveMsecs,
      maxSockets: this.maxSockets,
      maxFreeSockets: this.maxFreeSockets,
      timeout: this.timeout
    });

    this.httpsAgent = new HttpsAgent({
      keepAlive: this.keepAlive,
      keepAliveMsecs: this.keepAliveMsecs,
      maxSockets: this.maxSockets,
      maxFreeSockets: this.maxFreeSockets,
      timeout: this.timeout
    });

    // Connection statistics
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      pooledConnections: 0,
      connectionErrors: 0,
      lastReset: Date.now()
    };

    // Monitor connection events
    this.setupMonitoring();
    
    // Periodic cleanup
    this.startCleanupTimer();
  }

  setupMonitoring() {
    // HTTP Agent monitoring
    this.httpAgent.on('free', (socket, options) => {
      this.stats.pooledConnections++;
      logger.debug('HTTP connection returned to pool', {
        host: options.host,
        port: options.port,
        pooledConnections: this.stats.pooledConnections
      });
    });

    this.httpAgent.on('connect', (res, socket, head) => {
      this.stats.totalConnections++;
      this.stats.activeConnections++;
      logger.debug('New HTTP connection established', {
        totalConnections: this.stats.totalConnections,
        activeConnections: this.stats.activeConnections
      });
    });

    // HTTPS Agent monitoring
    this.httpsAgent.on('free', (socket, options) => {
      this.stats.pooledConnections++;
      logger.debug('HTTPS connection returned to pool', {
        host: options.host,
        port: options.port,
        pooledConnections: this.stats.pooledConnections
      });
    });

    this.httpsAgent.on('connect', (res, socket, head) => {
      this.stats.totalConnections++;
      this.stats.activeConnections++;
      logger.debug('New HTTPS connection established', {
        totalConnections: this.stats.totalConnections,
        activeConnections: this.stats.activeConnections
      });
    });
  }

  getAgent(protocol) {
    return protocol === 'https:' ? this.httpsAgent : this.httpAgent;
  }

  getStats() {
    const httpSockets = this.httpAgent.sockets;
    const httpFreeSockets = this.httpAgent.freeSockets;
    const httpsSockets = this.httpsAgent.sockets;
    const httpsFreeSockets = this.httpsAgent.freeSockets;

    // Count active sockets
    let httpActiveCount = 0;
    let httpFreeCount = 0;
    let httpsActiveCount = 0;
    let httpsFreeCount = 0;

    Object.values(httpSockets).forEach(socketArray => {
      httpActiveCount += socketArray.length;
    });

    Object.values(httpFreeSockets).forEach(socketArray => {
      httpFreeCount += socketArray.length;
    });

    Object.values(httpsSockets).forEach(socketArray => {
      httpsActiveCount += socketArray.length;
    });

    Object.values(httpsFreeSockets).forEach(socketArray => {
      httpsFreeCount += socketArray.length;
    });

    return {
      ...this.stats,
      currentConnections: {
        http: {
          active: httpActiveCount,
          free: httpFreeCount,
          total: httpActiveCount + httpFreeCount
        },
        https: {
          active: httpsActiveCount,
          free: httpsFreeCount,
          total: httpsActiveCount + httpsFreeCount
        }
      },
      configuration: {
        maxSockets: this.maxSockets,
        maxFreeSockets: this.maxFreeSockets,
        keepAlive: this.keepAlive,
        timeout: this.timeout
      },
      uptime: Date.now() - this.stats.lastReset
    };
  }

  startCleanupTimer() {
    // Clean up idle connections every 5 minutes
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  cleanup() {
    const beforeStats = this.getStats();
    
    // Destroy idle sockets
    this.destroyIdleSockets(this.httpAgent);
    this.destroyIdleSockets(this.httpsAgent);
    
    const afterStats = this.getStats();
    
    logger.info('Connection pool cleanup completed', {
      before: beforeStats.currentConnections,
      after: afterStats.currentConnections,
      cleaned: {
        http: beforeStats.currentConnections.http.total - afterStats.currentConnections.http.total,
        https: beforeStats.currentConnections.https.total - afterStats.currentConnections.https.total
      }
    });
  }

  destroyIdleSockets(agent) {
    Object.keys(agent.freeSockets).forEach(name => {
      const sockets = agent.freeSockets[name];
      if (sockets) {
        sockets.forEach(socket => {
          if (socket.readyState === 'open') {
            socket.destroy();
          }
        });
        agent.freeSockets[name] = [];
      }
    });
  }

  reset() {
    logger.info('Resetting connection pool');
    
    // Destroy all connections
    this.destroyAllSockets(this.httpAgent);
    this.destroyAllSockets(this.httpsAgent);
    
    // Reset statistics
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      pooledConnections: 0,
      connectionErrors: 0,
      lastReset: Date.now()
    };
    
    logger.info('Connection pool reset completed');
  }

  destroyAllSockets(agent) {
    // Destroy active sockets
    Object.keys(agent.sockets).forEach(name => {
      const sockets = agent.sockets[name];
      if (sockets) {
        sockets.forEach(socket => socket.destroy());
        agent.sockets[name] = [];
      }
    });

    // Destroy free sockets
    Object.keys(agent.freeSockets).forEach(name => {
      const sockets = agent.freeSockets[name];
      if (sockets) {
        sockets.forEach(socket => socket.destroy());
        agent.freeSockets[name] = [];
      }
    });
  }

  destroy() {
    logger.info('Destroying connection pool');
    this.reset();
    
    // Remove all listeners
    this.httpAgent.removeAllListeners();
    this.httpsAgent.removeAllListeners();
  }
}

// Service registry for managing multiple connection pools
class ServiceConnectionManager {
  constructor() {
    this.pools = new Map();
    this.defaultPoolOptions = {
      maxSockets: 50,
      maxFreeSockets: 10,
      timeout: 30000,
      keepAlive: true,
      keepAliveMsecs: 1000
    };
  }

  createPool(serviceName, options = {}) {
    const poolOptions = { ...this.defaultPoolOptions, ...options };
    const pool = new ConnectionPool(poolOptions);
    
    this.pools.set(serviceName, pool);
    
    logger.info(`Created connection pool for service: ${serviceName}`, poolOptions);
    
    return pool;
  }

  getPool(serviceName) {
    return this.pools.get(serviceName);
  }

  getOrCreatePool(serviceName, options = {}) {
    let pool = this.pools.get(serviceName);
    if (!pool) {
      pool = this.createPool(serviceName, options);
    }
    return pool;
  }

  getAllStats() {
    const stats = {};
    this.pools.forEach((pool, serviceName) => {
      stats[serviceName] = pool.getStats();
    });
    return stats;
  }

  cleanupAll() {
    logger.info('Cleaning up all connection pools');
    this.pools.forEach((pool, serviceName) => {
      try {
        pool.cleanup();
      } catch (error) {
        logger.error(`Failed to cleanup pool for ${serviceName}`, { error: error.message });
      }
    });
  }

  resetAll() {
    logger.info('Resetting all connection pools');
    this.pools.forEach((pool, serviceName) => {
      try {
        pool.reset();
      } catch (error) {
        logger.error(`Failed to reset pool for ${serviceName}`, { error: error.message });
      }
    });
  }

  destroyAll() {
    logger.info('Destroying all connection pools');
    this.pools.forEach((pool, serviceName) => {
      try {
        pool.destroy();
      } catch (error) {
        logger.error(`Failed to destroy pool for ${serviceName}`, { error: error.message });
      }
    });
    this.pools.clear();
  }
}

// Singleton instance
let connectionManager = null;

function getConnectionManager() {
  if (!connectionManager) {
    connectionManager = new ServiceConnectionManager();
  }
  return connectionManager;
}

// Graceful shutdown handler
process.on('SIGTERM', () => {
  if (connectionManager) {
    logger.info('Gracefully shutting down connection pools');
    connectionManager.destroyAll();
  }
});

process.on('SIGINT', () => {
  if (connectionManager) {
    logger.info('Gracefully shutting down connection pools');
    connectionManager.destroyAll();
  }
});

module.exports = {
  ConnectionPool,
  ServiceConnectionManager,
  getConnectionManager
};