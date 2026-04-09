const { logger } = require('./logger');
const models = require('../models');

/**
 * Create database indexes for optimal performance
 */
async function createIndexes() {
  try {
    logger.info('Creating database indexes...');
    
    // User indexes
    await models.User.collection.createIndex({ email: 1 }, { unique: true });
    await models.User.collection.createIndex({ 'profile.preferences.currency': 1 });
    await models.User.collection.createIndex({ createdAt: -1 });
    await models.User.collection.createIndex({ isActive: 1 });
    
    // Transaction indexes
    await models.Transaction.collection.createIndex({ userId: 1, date: -1 });
    await models.Transaction.collection.createIndex({ userId: 1, 'category.name': 1 });
    await models.Transaction.collection.createIndex({ userId: 1, amount: 1 });
    await models.Transaction.collection.createIndex({ 'rawData.importBatch': 1 });
    await models.Transaction.collection.createIndex({ date: -1, amount: 1 });
    
    // Text index for transaction search
    await models.Transaction.collection.createIndex({
      description: 'text',
      'rawData.originalDescription': 'text',
      notes: 'text'
    });
    
    // Prediction indexes
    await models.Prediction.collection.createIndex({ userId: 1, predictionDate: -1 });
    await models.Prediction.collection.createIndex({ userId: 1, targetDate: 1 });
    await models.Prediction.collection.createIndex({ userId: 1, predictionType: 1, isActive: 1 });
    await models.Prediction.collection.createIndex({ modelVersion: 1, predictionDate: -1 });
    
    // Financial Stress indexes
    await models.FinancialStress.collection.createIndex({ userId: 1, calculatedAt: -1 });
    await models.FinancialStress.collection.createIndex({ userId: 1, level: 1, isActive: 1 });
    await models.FinancialStress.collection.createIndex({ score: 1, calculatedAt: -1 });
    
    // ML Model Metadata indexes
    await models.MLModelMetadata.collection.createIndex({ modelType: 1, version: 1 }, { unique: true });
    await models.MLModelMetadata.collection.createIndex({ modelType: 1, 'deployment.status': 1 });
    await models.MLModelMetadata.collection.createIndex({ trainingDate: -1 });
    await models.MLModelMetadata.collection.createIndex({ 'performance.validation.r2Score': -1 });
    
    logger.info('Database indexes created successfully');
  } catch (error) {
    logger.error('Error creating database indexes:', error);
    throw error;
  }
}

/**
 * Drop all indexes (useful for testing or rebuilding)
 */
async function dropIndexes() {
  try {
    logger.info('Dropping database indexes...');
    
    const collections = [
      models.User.collection,
      models.Transaction.collection,
      models.Prediction.collection,
      models.FinancialStress.collection,
      models.MLModelMetadata.collection
    ];
    
    for (const collection of collections) {
      await collection.dropIndexes();
    }
    
    logger.info('Database indexes dropped successfully');
  } catch (error) {
    logger.error('Error dropping database indexes:', error);
    throw error;
  }
}

/**
 * Get index information for all collections
 */
async function getIndexInfo() {
  try {
    const indexInfo = {};
    
    const collections = {
      users: models.User.collection,
      transactions: models.Transaction.collection,
      predictions: models.Prediction.collection,
      financialstresses: models.FinancialStress.collection,
      mlmodelmetadatas: models.MLModelMetadata.collection
    };
    
    for (const [name, collection] of Object.entries(collections)) {
      indexInfo[name] = await collection.indexes();
    }
    
    return indexInfo;
  } catch (error) {
    logger.error('Error getting index information:', error);
    throw error;
  }
}

module.exports = {
  createIndexes,
  dropIndexes,
  getIndexInfo
};