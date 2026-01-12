const mongoose = require('mongoose');
const { logger } = require('./logger');
const { createIndexes } = require('./indexes');
const { seedDatabase } = require('./seed');

class DatabaseConnection {
  constructor() {
    this.connection = null;
    this.retryCount = 0;
    this.maxRetries = 5;
    this.retryDelay = 5000; // 5 seconds
  }

  async connect() {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/finsense';
      
      const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10, // Connection pooling
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferMaxEntries: 0,
        retryWrites: true,
        w: 'majority'
      };

      this.connection = await mongoose.connect(mongoUri, options);
      
      logger.info('MongoDB connected successfully');
      this.retryCount = 0; // Reset retry count on successful connection
      
      // Handle connection events
      mongoose.connection.on('error', this.handleError.bind(this));
      mongoose.connection.on('disconnected', this.handleDisconnection.bind(this));
      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
      });

      // Create indexes after successful connection
      await createIndexes();
      
      // Seed database in development environment
      if (process.env.NODE_ENV === 'development' && process.env.SEED_DATABASE === 'true') {
        await seedDatabase();
      }

      return this.connection;
    } catch (error) {
      logger.error('MongoDB connection failed:', error);
      await this.handleConnectionFailure(error);
    }
  }

  async handleConnectionFailure(error) {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      logger.info(`Retrying MongoDB connection (${this.retryCount}/${this.maxRetries}) in ${this.retryDelay}ms...`);
      
      setTimeout(() => {
        this.connect();
      }, this.retryDelay);
    } else {
      logger.error('Max retry attempts reached. Could not connect to MongoDB.');
      process.exit(1);
    }
  }

  handleError(error) {
    logger.error('MongoDB connection error:', error);
  }

  handleDisconnection() {
    logger.warn('MongoDB disconnected. Attempting to reconnect...');
  }

  async disconnect() {
    if (this.connection) {
      await mongoose.disconnect();
      logger.info('MongoDB disconnected');
    }
  }

  // Health check method
  async healthCheck() {
    try {
      await mongoose.connection.db.admin().ping();
      return { status: 'healthy', timestamp: new Date() };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return { status: 'unhealthy', error: error.message, timestamp: new Date() };
    }
  }
}

module.exports = new DatabaseConnection();