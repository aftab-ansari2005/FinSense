require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const WebSocket = require('ws');

const database = require('./src/config/database');
const { logger, apiLogger } = require('./src/config/logger');
const { apiMonitoringMiddleware } = require('./src/services/apiMonitoring');
const { getMonitoringDashboard } = require('./src/services/monitoringDashboard');
const { getRealTimeUpdateService } = require('./src/services/realTimeUpdateService');
const { getPredictionUpdateScheduler } = require('./src/services/predictionUpdateScheduler');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(apiLogger);

// API monitoring middleware
app.use(apiMonitoringMiddleware);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await database.healthCheck();
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: dbHealth,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// API routes
const authRoutes = require('./src/routes/auth');
const transactionRoutes = require('./src/routes/transactions');
const mlModelRoutes = require('./src/routes/ml-models');
const mlIntegrationRoutes = require('./src/routes/ml-integration');
const monitoringRoutes = require('./src/routes/monitoring');
const dataExportRoutes = require('./src/routes/dataExport');
const dataDeletionRoutes = require('./src/routes/dataDeletion');
const predictionUpdatesRoutes = require('./src/routes/predictionUpdates');

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/ml/models', mlModelRoutes);
app.use('/api/ml', mlIntegrationRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/data-export', dataExportRoutes);
app.use('/api/data-deletion', dataDeletionRoutes);
app.use('/api/prediction-updates', predictionUpdatesRoutes);

// Placeholder routes (to be implemented)
app.use('/api/dashboard', (req, res) => res.json({ message: 'Dashboard routes - Coming soon' }));

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
async function startServer() {
  try {
    // Connect to database
    await database.connect();
    
    // Create HTTP server
    const server = http.createServer(app);
    
    // Setup WebSocket server for monitoring dashboard
    const wss = new WebSocket.Server({ 
      server,
      path: '/ws/monitoring'
    });
    
    // Initialize monitoring dashboard
    const monitoringDashboard = getMonitoringDashboard();
    
    wss.on('connection', (ws, req) => {
      logger.info('WebSocket connection established for monitoring', {
        ip: '[IP_REDACTED]',
        userAgent: req.headers['user-agent']
      });
      
      monitoringDashboard.addClient(ws);
    });

    // Setup WebSocket server for real-time updates
    const realtimeWss = new WebSocket.Server({
      server,
      path: '/ws/realtime'
    });

    // Initialize real-time update service
    const realTimeService = getRealTimeUpdateService();
    realTimeService.startHeartbeat();

    // Initialize and start prediction update scheduler
    const predictionScheduler = getPredictionUpdateScheduler();
    const cronSchedule = process.env.PREDICTION_UPDATE_CRON || '0 2 * * *'; // Default: 2 AM daily
    predictionScheduler.start(cronSchedule);
    logger.info(`Prediction update scheduler started with schedule: ${cronSchedule}`);

    realtimeWss.on('connection', (ws, req) => {
      // Extract token from query string or headers
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('token') || req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        logger.warn('WebSocket connection attempt without token');
        ws.close(1008, 'Authentication required');
        return;
      }

      // Verify token and extract userId
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const userId = decoded.userId;

        logger.info('Real-time WebSocket connection established', {
          userId,
          userAgent: req.headers['user-agent']
        });

        realTimeService.addClient(ws, userId);
      } catch (error) {
        logger.error('WebSocket authentication failed:', error);
        ws.close(1008, 'Invalid token');
      }
    });
    
    // Graceful shutdown handler for WebSocket and scheduler
    process.on('SIGTERM', () => {
      realTimeService.closeAllConnections();
      predictionScheduler.stop();
    });

    process.on('SIGINT', () => {
      realTimeService.closeAllConnections();
      predictionScheduler.stop();
    });
    
    // Start HTTP server
    server.listen(PORT, () => {
      logger.info(`FinSense Backend Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`WebSocket monitoring available at ws://localhost:${PORT}/ws/monitoring`);
      logger.info(`WebSocket real-time updates available at ws://localhost:${PORT}/ws/realtime`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await database.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await database.disconnect();
  process.exit(0);
});

startServer();

module.exports = app;