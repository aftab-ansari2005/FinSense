const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Prediction = require('../models/Prediction');
const FinancialStress = require('../models/FinancialStress');
const { logger } = require('../config/logger');

/**
 * Data Deletion Service
 * Provides GDPR-compliant data deletion functionality
 */
class DataDeletionService {
  /**
   * Preview what data will be deleted for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Deletion preview
   */
  async previewDeletion(userId) {
    try {
      logger.info(`Previewing deletion for user: ${userId}`);

      const [user, transactionCount, predictionCount, stressCount] = await Promise.all([
        User.findById(userId).select('-passwordHash').lean(),
        Transaction.countDocuments({ userId }),
        Prediction.countDocuments({ userId }),
        FinancialStress.countDocuments({ userId })
      ]);

      if (!user) {
        throw new Error('User not found');
      }

      return {
        userId,
        preview: {
          userProfile: {
            email: user.email,
            createdAt: user.createdAt,
            accountAge: this._calculateAccountAge(user.createdAt)
          },
          dataToDelete: {
            transactions: transactionCount,
            predictions: predictionCount,
            financialStressRecords: stressCount,
            userAccount: 1
          },
          totalRecords: transactionCount + predictionCount + stressCount + 1,
          warning: 'This action is irreversible. All data will be permanently deleted.',
          affectedCollections: ['users', 'transactions', 'predictions', 'financialstresses']
        }
      };
    } catch (error) {
      logger.error(`Error previewing deletion for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Delete all user data (complete account deletion)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteUserAccount(userId) {
    try {
      logger.info(`Starting complete account deletion for user: ${userId}`);

      // Get counts before deletion for audit
      const [user, transactionCount, predictionCount, stressCount] = await Promise.all([
        User.findById(userId).select('email createdAt'),
        Transaction.countDocuments({ userId }),
        Prediction.countDocuments({ userId }),
        FinancialStress.countDocuments({ userId })
      ]);

      if (!user) {
        throw new Error('User not found');
      }

      // Perform deletion in parallel
      const deletionResults = await Promise.all([
        Transaction.deleteMany({ userId }),
        Prediction.deleteMany({ userId }),
        FinancialStress.deleteMany({ userId }),
        User.findByIdAndDelete(userId)
      ]);

      const result = {
        success: true,
        deletedAt: new Date().toISOString(),
        userId,
        userEmail: user.email,
        deletedRecords: {
          transactions: deletionResults[0].deletedCount,
          predictions: deletionResults[1].deletedCount,
          financialStressRecords: deletionResults[2].deletedCount,
          userAccount: deletionResults[3] ? 1 : 0
        },
        totalDeleted: deletionResults[0].deletedCount + 
                      deletionResults[1].deletedCount + 
                      deletionResults[2].deletedCount + 
                      (deletionResults[3] ? 1 : 0),
        accountAge: this._calculateAccountAge(user.createdAt)
      };

      // Audit log
      logger.info(`Account deletion completed for user ${userId}:`, {
        email: user.email,
        deletedRecords: result.deletedRecords,
        totalDeleted: result.totalDeleted
      });

      return result;
    } catch (error) {
      logger.error(`Error deleting account for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Delete all transactions for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteTransactions(userId) {
    try {
      logger.info(`Deleting all transactions for user: ${userId}`);

      const result = await Transaction.deleteMany({ userId });

      const deletionResult = {
        success: true,
        deletedAt: new Date().toISOString(),
        userId,
        dataType: 'transactions',
        deletedCount: result.deletedCount
      };

      logger.info(`Deleted ${result.deletedCount} transactions for user ${userId}`);
      return deletionResult;
    } catch (error) {
      logger.error(`Error deleting transactions for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Delete all predictions for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Deletion result
   */
  async deletePredictions(userId) {
    try {
      logger.info(`Deleting all predictions for user: ${userId}`);

      const result = await Prediction.deleteMany({ userId });

      const deletionResult = {
        success: true,
        deletedAt: new Date().toISOString(),
        userId,
        dataType: 'predictions',
        deletedCount: result.deletedCount
      };

      logger.info(`Deleted ${result.deletedCount} predictions for user ${userId}`);
      return deletionResult;
    } catch (error) {
      logger.error(`Error deleting predictions for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Delete all financial stress records for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteFinancialStressRecords(userId) {
    try {
      logger.info(`Deleting all financial stress records for user: ${userId}`);

      const result = await FinancialStress.deleteMany({ userId });

      const deletionResult = {
        success: true,
        deletedAt: new Date().toISOString(),
        userId,
        dataType: 'financialStressRecords',
        deletedCount: result.deletedCount
      };

      logger.info(`Deleted ${result.deletedCount} financial stress records for user ${userId}`);
      return deletionResult;
    } catch (error) {
      logger.error(`Error deleting financial stress records for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Delete transactions within a date range
   * @param {string} userId - User ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Deletion result
   */
  async deleteTransactionsByDateRange(userId, startDate, endDate) {
    try {
      logger.info(`Deleting transactions for user ${userId} between ${startDate} and ${endDate}`);

      const result = await Transaction.deleteMany({
        userId,
        date: {
          $gte: startDate,
          $lte: endDate
        }
      });

      const deletionResult = {
        success: true,
        deletedAt: new Date().toISOString(),
        userId,
        dataType: 'transactions',
        dateRange: {
          start: startDate,
          end: endDate
        },
        deletedCount: result.deletedCount
      };

      logger.info(`Deleted ${result.deletedCount} transactions for user ${userId} in date range`);
      return deletionResult;
    } catch (error) {
      logger.error(`Error deleting transactions by date range for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Request deletion with confirmation token
   * @param {string} userId - User ID
   * @param {string} deletionType - Type of deletion (account, transactions, predictions, stress)
   * @returns {Promise<Object>} Deletion request details
   */
  async requestDeletion(userId, deletionType = 'account') {
    try {
      logger.info(`Deletion request received for user ${userId}, type: ${deletionType}`);

      const user = await User.findById(userId).select('email createdAt');
      if (!user) {
        throw new Error('User not found');
      }

      // Generate confirmation token (in production, this would be a secure token)
      const confirmationToken = `del_${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Get preview of what will be deleted
      const preview = await this.previewDeletion(userId);

      return {
        success: true,
        requestId: confirmationToken,
        userId,
        userEmail: user.email,
        deletionType,
        requestedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        preview: preview.preview,
        confirmationRequired: true,
        instructions: 'To confirm deletion, use the confirmation token within 24 hours.',
        warning: 'This action is irreversible and will permanently delete your data.'
      };
    } catch (error) {
      logger.error(`Error creating deletion request for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get deletion statistics for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Deletion statistics
   */
  async getDeletionStatistics(userId) {
    try {
      const [transactionCount, predictionCount, stressCount, user] = await Promise.all([
        Transaction.countDocuments({ userId }),
        Prediction.countDocuments({ userId }),
        FinancialStress.countDocuments({ userId }),
        User.findById(userId).select('email createdAt')
      ]);

      if (!user) {
        throw new Error('User not found');
      }

      return {
        userId,
        userEmail: user.email,
        statistics: {
          totalTransactions: transactionCount,
          totalPredictions: predictionCount,
          totalStressRecords: stressCount,
          totalRecords: transactionCount + predictionCount + stressCount + 1,
          accountAge: this._calculateAccountAge(user.createdAt)
        },
        deletionOptions: {
          completeAccount: 'Delete entire account and all associated data',
          transactionsOnly: 'Delete all transaction records',
          predictionsOnly: 'Delete all prediction records',
          stressRecordsOnly: 'Delete all financial stress records',
          dateRange: 'Delete transactions within a specific date range'
        },
        gdprCompliance: {
          rightToErasure: true,
          dataPortability: 'Export data before deletion using /api/data-export endpoints',
          confirmationRequired: true,
          irreversible: true
        }
      };
    } catch (error) {
      logger.error(`Error getting deletion statistics for user ${userId}:`, error);
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
}

module.exports = new DataDeletionService();
