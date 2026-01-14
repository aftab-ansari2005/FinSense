const { logger } = require('../config/logger');
const { sanitizeObject } = require('../utils/piiSanitizer');

/**
 * Real-Time Update Service
 * Manages WebSocket connections and broadcasts real-time updates to clients
 */
class RealTimeUpdateService {
  constructor() {
    this.clients = new Map(); // Map of userId -> Set of WebSocket connections
    this.connectionCount = 0;
  }

  /**
   * Add a new client connection
   * @param {WebSocket} ws - WebSocket connection
   * @param {string} userId - User ID
   */
  addClient(ws, userId) {
    if (!userId) {
      logger.warn('Attempted to add client without userId');
      return;
    }

    // Initialize user's connection set if it doesn't exist
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }

    // Add connection to user's set
    this.clients.get(userId).add(ws);
    this.connectionCount++;

    logger.info(`Real-time client connected`, {
      userId,
      totalConnections: this.connectionCount,
      userConnections: this.clients.get(userId).size
    });

    // Set up connection handlers
    this.setupConnectionHandlers(ws, userId);

    // Send welcome message
    this.sendToClient(ws, {
      type: 'connection',
      status: 'connected',
      message: 'Real-time updates enabled',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Set up WebSocket connection event handlers
   * @param {WebSocket} ws - WebSocket connection
   * @param {string} userId - User ID
   * @private
   */
  setupConnectionHandlers(ws, userId) {
    // Handle incoming messages
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        this.handleClientMessage(ws, userId, data);
      } catch (error) {
        logger.error('Error parsing WebSocket message:', error);
        this.sendError(ws, 'Invalid message format');
      }
    });

    // Handle connection close
    ws.on('close', () => {
      this.removeClient(ws, userId);
    });

    // Handle errors
    ws.on('error', (error) => {
      logger.error(`WebSocket error for user ${userId}:`, error);
      this.removeClient(ws, userId);
    });

    // Handle ping/pong for connection health
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });
  }

  /**
   * Handle messages from clients
   * @param {WebSocket} ws - WebSocket connection
   * @param {string} userId - User ID
   * @param {Object} data - Message data
   * @private
   */
  handleClientMessage(ws, userId, data) {
    logger.debug(`Received message from user ${userId}:`, sanitizeObject(data));

    switch (data.type) {
      case 'ping':
        this.sendToClient(ws, { type: 'pong', timestamp: new Date().toISOString() });
        break;

      case 'subscribe':
        // Handle subscription to specific update types
        this.handleSubscription(ws, userId, data.channels);
        break;

      case 'unsubscribe':
        // Handle unsubscription
        this.handleUnsubscription(ws, userId, data.channels);
        break;

      default:
        logger.warn(`Unknown message type: ${data.type}`);
    }
  }

  /**
   * Handle subscription requests
   * @param {WebSocket} ws - WebSocket connection
   * @param {string} userId - User ID
   * @param {Array<string>} channels - Channels to subscribe to
   * @private
   */
  handleSubscription(ws, userId, channels = []) {
    if (!ws.subscriptions) {
      ws.subscriptions = new Set();
    }

    channels.forEach(channel => {
      ws.subscriptions.add(channel);
    });

    this.sendToClient(ws, {
      type: 'subscribed',
      channels: Array.from(ws.subscriptions),
      timestamp: new Date().toISOString()
    });

    logger.info(`User ${userId} subscribed to channels:`, channels);
  }

  /**
   * Handle unsubscription requests
   * @param {WebSocket} ws - WebSocket connection
   * @param {string} userId - User ID
   * @param {Array<string>} channels - Channels to unsubscribe from
   * @private
   */
  handleUnsubscription(ws, userId, channels = []) {
    if (!ws.subscriptions) {
      return;
    }

    channels.forEach(channel => {
      ws.subscriptions.delete(channel);
    });

    this.sendToClient(ws, {
      type: 'unsubscribed',
      channels: channels,
      timestamp: new Date().toISOString()
    });

    logger.info(`User ${userId} unsubscribed from channels:`, channels);
  }

  /**
   * Remove a client connection
   * @param {WebSocket} ws - WebSocket connection
   * @param {string} userId - User ID
   */
  removeClient(ws, userId) {
    if (!userId || !this.clients.has(userId)) {
      return;
    }

    const userConnections = this.clients.get(userId);
    userConnections.delete(ws);
    this.connectionCount--;

    // Remove user entry if no more connections
    if (userConnections.size === 0) {
      this.clients.delete(userId);
    }

    logger.info(`Real-time client disconnected`, {
      userId,
      totalConnections: this.connectionCount,
      userConnections: userConnections.size
    });
  }

  /**
   * Send message to a specific client
   * @param {WebSocket} ws - WebSocket connection
   * @param {Object} data - Data to send
   * @private
   */
  sendToClient(ws, data) {
    if (ws.readyState === 1) { // WebSocket.OPEN
      try {
        ws.send(JSON.stringify(data));
      } catch (error) {
        logger.error('Error sending message to client:', error);
      }
    }
  }

  /**
   * Send error message to client
   * @param {WebSocket} ws - WebSocket connection
   * @param {string} message - Error message
   * @private
   */
  sendError(ws, message) {
    this.sendToClient(ws, {
      type: 'error',
      message: message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast update to a specific user
   * @param {string} userId - User ID
   * @param {Object} update - Update data
   */
  broadcastToUser(userId, update) {
    if (!this.clients.has(userId)) {
      return;
    }

    const userConnections = this.clients.get(userId);
    const sanitizedUpdate = sanitizeObject(update);

    userConnections.forEach(ws => {
      // Check if client is subscribed to this channel
      if (update.channel && ws.subscriptions && !ws.subscriptions.has(update.channel)) {
        return;
      }

      this.sendToClient(ws, {
        ...sanitizedUpdate,
        timestamp: new Date().toISOString()
      });
    });

    logger.debug(`Broadcasted update to user ${userId}:`, {
      type: update.type,
      channel: update.channel
    });
  }

  /**
   * Broadcast transaction update
   * @param {string} userId - User ID
   * @param {Object} transaction - Transaction data
   */
  broadcastTransactionUpdate(userId, transaction) {
    this.broadcastToUser(userId, {
      type: 'transaction_update',
      channel: 'transactions',
      data: transaction
    });
  }

  /**
   * Broadcast prediction update
   * @param {string} userId - User ID
   * @param {Object} prediction - Prediction data
   */
  broadcastPredictionUpdate(userId, prediction) {
    this.broadcastToUser(userId, {
      type: 'prediction_update',
      channel: 'predictions',
      data: prediction
    });
  }

  /**
   * Broadcast financial stress update
   * @param {string} userId - User ID
   * @param {Object} stressData - Financial stress data
   */
  broadcastFinancialStressUpdate(userId, stressData) {
    this.broadcastToUser(userId, {
      type: 'financial_stress_update',
      channel: 'financial_stress',
      data: stressData
    });
  }

  /**
   * Broadcast dashboard update
   * @param {string} userId - User ID
   * @param {Object} dashboardData - Dashboard data
   */
  broadcastDashboardUpdate(userId, dashboardData) {
    this.broadcastToUser(userId, {
      type: 'dashboard_update',
      channel: 'dashboard',
      data: dashboardData
    });
  }

  /**
   * Broadcast alert
   * @param {string} userId - User ID
   * @param {Object} alert - Alert data
   */
  broadcastAlert(userId, alert) {
    this.broadcastToUser(userId, {
      type: 'alert',
      channel: 'alerts',
      data: alert,
      priority: alert.priority || 'normal'
    });
  }

  /**
   * Start heartbeat to keep connections alive
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((connections, userId) => {
        connections.forEach(ws => {
          if (ws.isAlive === false) {
            logger.warn(`Terminating inactive connection for user ${userId}`);
            return ws.terminate();
          }

          ws.isAlive = false;
          ws.ping();
        });
      });
    }, 30000); // 30 seconds

    logger.info('Real-time update heartbeat started');
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      logger.info('Real-time update heartbeat stopped');
    }
  }

  /**
   * Get connection statistics
   * @returns {Object} Connection statistics
   */
  getStatistics() {
    return {
      totalConnections: this.connectionCount,
      totalUsers: this.clients.size,
      userConnections: Array.from(this.clients.entries()).map(([userId, connections]) => ({
        userId,
        connections: connections.size
      }))
    };
  }

  /**
   * Close all connections
   */
  closeAllConnections() {
    this.clients.forEach((connections, userId) => {
      connections.forEach(ws => {
        this.sendToClient(ws, {
          type: 'server_shutdown',
          message: 'Server is shutting down',
          timestamp: new Date().toISOString()
        });
        ws.close();
      });
    });

    this.clients.clear();
    this.connectionCount = 0;
    this.stopHeartbeat();

    logger.info('All real-time connections closed');
  }
}

// Singleton instance
let instance = null;

/**
 * Get the singleton instance of RealTimeUpdateService
 * @returns {RealTimeUpdateService}
 */
function getRealTimeUpdateService() {
  if (!instance) {
    instance = new RealTimeUpdateService();
  }
  return instance;
}

module.exports = { getRealTimeUpdateService };
