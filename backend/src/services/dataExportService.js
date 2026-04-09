const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Prediction = require('../models/Prediction');
const FinancialStress = require('../models/FinancialStress');
const { logger } = require('../config/logger');
const { Parser } = require('json2csv');

/**
 * Data Export Service
 * Provides user data export functionality for GDPR compliance
 */
class DataExportService {
  /**
   * Export all user data in JSON format
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Complete user data
   */
  async exportUserDataJSON(userId) {
    try {
      logger.info(`Exporting user data (JSON) for user: ${userId}`);

      // Fetch all user data
      const [user, transactions, predictions, stressRecords] = await Promise.all([
        User.findById(userId).select('-passwordHash').lean(),
        Transaction.find({ userId }).lean(),
        Prediction.find({ userId }).lean(),
        FinancialStress.find({ userId }).lean()
      ]);

      if (!user) {
        throw new Error('User not found');
      }

      // Compile complete data export
      const exportData = {
        exportMetadata: {
          exportDate: new Date().toISOString(),
          userId: userId,
          format: 'JSON',
          version: '1.0'
        },
        userData: {
          profile: {
            email: user.email,
            firstName: user.profile?.firstName,
            lastName: user.profile?.lastName,
            preferences: user.profile?.preferences,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          }
        },
        transactions: {
          count: transactions.length,
          data: transactions.map(t => ({
            id: t._id,
            date: t.date,
            amount: t.amount,
            description: t.description,
            category: t.category,
            rawData: t.rawData,
            createdAt: t.createdAt
          }))
        },
        predictions: {
          count: predictions.length,
          data: predictions.map(p => ({
            id: p._id,
            predictionDate: p.predictionDate,
            targetDate: p.targetDate,
            predictedBalance: p.predictedBalance,
            confidenceInterval: p.confidenceInterval,
            modelVersion: p.modelVersion,
            accuracy: p.accuracy,
            createdAt: p.createdAt
          }))
        },
        financialStress: {
          count: stressRecords.length,
          data: stressRecords.map(s => ({
            id: s._id,
            score: s.score,
            factors: s.factors,
            recommendations: s.recommendations,
            calculatedAt: s.calculatedAt
          }))
        },
        summary: {
          totalTransactions: transactions.length,
          totalPredictions: predictions.length,
          totalStressRecords: stressRecords.length,
          accountAge: this._calculateAccountAge(user.createdAt)
        }
      };

      logger.info(`Successfully exported user data (JSON) for user: ${userId}`);
      return exportData;
    } catch (error) {
      logger.error(`Error exporting user data (JSON) for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Export user transactions in CSV format
   * @param {string} userId - User ID
   * @returns {Promise<string>} CSV formatted transaction data
   */
  async exportTransactionsCSV(userId) {
    try {
      logger.info(`Exporting transactions (CSV) for user: ${userId}`);

      const transactions = await Transaction.find({ userId }).lean();

      if (transactions.length === 0) {
        return 'No transactions found';
      }

      // Define CSV fields
      const fields = [
        { label: 'Transaction ID', value: '_id' },
        { label: 'Date', value: 'date' },
        { label: 'Amount', value: 'amount' },
        { label: 'Description', value: 'description' },
        { label: 'Category', value: 'category.name' },
        { label: 'Category Confidence', value: 'category.confidence' },
        { label: 'User Verified', value: 'category.isUserVerified' },
        { label: 'Original Description', value: 'rawData.originalDescription' },
        { label: 'Source', value: 'rawData.source' },
        { label: 'Created At', value: 'createdAt' }
      ];

      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(transactions);

      logger.info(`Successfully exported transactions (CSV) for user: ${userId}`);
      return csv;
    } catch (error) {
      logger.error(`Error exporting transactions (CSV) for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Export user predictions in CSV format
   * @param {string} userId - User ID
   * @returns {Promise<string>} CSV formatted prediction data
   */
  async exportPredictionsCSV(userId) {
    try {
      logger.info(`Exporting predictions (CSV) for user: ${userId}`);

      const predictions = await Prediction.find({ userId }).lean();

      if (predictions.length === 0) {
        return 'No predictions found';
      }

      // Define CSV fields
      const fields = [
        { label: 'Prediction ID', value: '_id' },
        { label: 'Prediction Date', value: 'predictionDate' },
        { label: 'Target Date', value: 'targetDate' },
        { label: 'Predicted Balance', value: 'predictedBalance' },
        { label: 'Confidence Lower', value: 'confidenceInterval.lower' },
        { label: 'Confidence Upper', value: 'confidenceInterval.upper' },
        { label: 'Model Version', value: 'modelVersion' },
        { label: 'Accuracy', value: 'accuracy' },
        { label: 'Created At', value: 'createdAt' }
      ];

      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(predictions);

      logger.info(`Successfully exported predictions (CSV) for user: ${userId}`);
      return csv;
    } catch (error) {
      logger.error(`Error exporting predictions (CSV) for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Export complete user data package (all formats)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Complete export package
   */
  async exportCompleteDataPackage(userId) {
    try {
      logger.info(`Exporting complete data package for user: ${userId}`);

      const [jsonData, transactionsCSV, predictionsCSV] = await Promise.all([
        this.exportUserDataJSON(userId),
        this.exportTransactionsCSV(userId),
        this.exportPredictionsCSV(userId)
      ]);

      const exportPackage = {
        json: jsonData,
        csv: {
          transactions: transactionsCSV,
          predictions: predictionsCSV
        },
        metadata: {
          exportDate: new Date().toISOString(),
          userId: userId,
          formats: ['JSON', 'CSV']
        }
      };

      logger.info(`Successfully exported complete data package for user: ${userId}`);
      return exportPackage;
    } catch (error) {
      logger.error(`Error exporting complete data package for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get export statistics for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Export statistics
   */
  async getExportStatistics(userId) {
    try {
      const [transactionCount, predictionCount, stressCount, user] = await Promise.all([
        Transaction.countDocuments({ userId }),
        Prediction.countDocuments({ userId }),
        FinancialStress.countDocuments({ userId }),
        User.findById(userId).select('createdAt')
      ]);

      if (!user) {
        throw new Error('User not found');
      }

      return {
        userId,
        statistics: {
          totalTransactions: transactionCount,
          totalPredictions: predictionCount,
          totalStressRecords: stressCount,
          accountAge: this._calculateAccountAge(user.createdAt),
          estimatedExportSize: this._estimateExportSize(transactionCount, predictionCount, stressCount)
        },
        availableFormats: ['JSON', 'CSV'],
        exportOptions: {
          fullExport: 'All data in JSON format',
          transactionsCSV: 'Transactions only in CSV format',
          predictionsCSV: 'Predictions only in CSV format',
          completePackage: 'All data in both JSON and CSV formats'
        }
      };
    } catch (error) {
      logger.error(`Error getting export statistics for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate account age in days
   * @private
   */
  _calculateAccountAge(createdAt) {
    const now = new Date();
    const created = new Date(createdAt);
    const diffTime = Math.abs(now - created);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return {
      days: diffDays,
      months: Math.floor(diffDays / 30),
      years: Math.floor(diffDays / 365)
    };
  }

  /**
   * Estimate export size in KB
   * @private
   */
  _estimateExportSize(transactionCount, predictionCount, stressCount) {
    // Rough estimates: transaction ~1KB, prediction ~0.5KB, stress ~2KB
    const estimatedKB = (transactionCount * 1) + (predictionCount * 0.5) + (stressCount * 2);
    return {
      estimatedKB: Math.ceil(estimatedKB),
      estimatedMB: (estimatedKB / 1024).toFixed(2),
      humanReadable: this._formatBytes(estimatedKB * 1024)
    };
  }

  /**
   * Format bytes to human readable string
   * @private
   */
  _formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

module.exports = new DataExportService();
