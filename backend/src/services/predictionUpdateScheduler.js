const cron = require('node-cron');
const { logger } = require('../config/logger');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Prediction = require('../models/Prediction');
const FinancialStress = require('../models/FinancialStress');
const { getRealTimeUpdateService } = require('./realTimeUpdateService');
const mlServiceClient = require('./mlServiceClient');

/**
 * Prediction Update Scheduler
 * Manages daily prediction updates and incremental data processing
 */
class PredictionUpdateScheduler {
  constructor() {
    this.isRunning = false;
    this.scheduledTask = null;
    this.updateInProgress = new Set(); // Track users currently being updated
    this.lastUpdateTime = null;
    this.updateStats = {
      totalUpdates: 0,
      successfulUpdates: 0,
      failedUpdates: 0,
      lastRunDuration: 0
    };
  }

  /**
   * Start the prediction update scheduler
   * Runs daily at 2:00 AM by default
   * @param {string} cronExpression - Cron expression for scheduling (default: '0 2 * * *')
   */
  start(cronExpression = '0 2 * * *') {
    if (this.isRunning) {
      logger.warn('Prediction update scheduler is already running');
      return;
    }

    this.scheduledTask = cron.schedule(cronExpression, async () => {
      await this.runDailyUpdate();
    });

    this.isRunning = true;
    logger.info(`Prediction update scheduler started with cron: ${cronExpression}`);
  }

  /**
   * Stop the prediction update scheduler
   */
  stop() {
    if (this.scheduledTask) {
      this.scheduledTask.stop();
      this.scheduledTask = null;
    }

    this.isRunning = false;
    logger.info('Prediction update scheduler stopped');
  }

  /**
   * Run daily prediction update for all active users
   */
  async runDailyUpdate() {
    const startTime = Date.now();
    logger.info('Starting daily prediction update');

    try {
      // Get all active users
      const users = await User.find({ isActive: true }).select('_id email');
      logger.info(`Found ${users.length} active users for prediction update`);

      // Process users in batches to avoid overwhelming the system
      const batchSize = 10;
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        await Promise.all(
          batch.map(user => this.updateUserPredictions(user._id.toString()))
        );
      }

      const duration = Date.now() - startTime;
      this.updateStats.lastRunDuration = duration;
      this.lastUpdateTime = new Date();

      logger.info(`Daily prediction update completed in ${duration}ms`, {
        totalUsers: users.length,
        successful: this.updateStats.successfulUpdates,
        failed: this.updateStats.failedUpdates
      });
    } catch (error) {
      logger.error('Error during daily prediction update:', error);
    }
  }

  /**
   * Update predictions for a specific user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Update result
   */
  async updateUserPredictions(userId) {
    // Check if update already in progress for this user
    if (this.updateInProgress.has(userId)) {
      logger.warn(`Prediction update already in progress for user ${userId}`);
      return { success: false, reason: 'update_in_progress' };
    }

    this.updateInProgress.add(userId);
    this.updateStats.totalUpdates++;

    try {
      logger.info(`Updating predictions for user ${userId}`);

      // Check if user has sufficient transaction history
      const hasEnoughData = await this.checkSufficientData(userId);
      if (!hasEnoughData) {
        logger.info(`User ${userId} does not have sufficient data for predictions`);
        this.updateInProgress.delete(userId);
        return { success: false, reason: 'insufficient_data' };
      }

      // Get recent transactions for incremental processing
      const recentTransactions = await this.getRecentTransactions(userId);

      // Generate new predictions using ML service
      const predictions = await this.generatePredictions(userId, recentTransactions);

      if (!predictions || predictions.length === 0) {
        logger.warn(`No predictions generated for user ${userId}`);
        this.updateStats.failedUpdates++;
        this.updateInProgress.delete(userId);
        return { success: false, reason: 'no_predictions' };
      }

      // Save predictions to database
      await this.savePredictions(userId, predictions);

      // Calculate financial stress based on new predictions
      const stressData = await this.calculateFinancialStress(userId, predictions);

      // Broadcast updates via WebSocket
      await this.broadcastUpdates(userId, predictions, stressData);

      this.updateStats.successfulUpdates++;
      this.updateInProgress.delete(userId);

      logger.info(`Successfully updated predictions for user ${userId}`, {
        predictionsCount: predictions.length,
        stressScore: stressData?.score
      });

      return {
        success: true,
        predictionsCount: predictions.length,
        stressScore: stressData?.score
      };
    } catch (error) {
      logger.error(`Error updating predictions for user ${userId}:`, error);
      this.updateStats.failedUpdates++;
      this.updateInProgress.delete(userId);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user has sufficient transaction data for predictions
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if sufficient data exists
   * @private
   */
  async checkSufficientData(userId) {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const transactionCount = await Transaction.countDocuments({
      userId,
      date: { $gte: threeMonthsAgo }
    });

    // Require at least 10 transactions in the last 3 months
    return transactionCount >= 10;
  }

  /**
   * Get recent transactions for incremental processing
   * @param {string} userId - User ID
   * @param {number} days - Number of days to look back (default: 30)
   * @returns {Promise<Array>} Recent transactions
   * @private
   */
  async getRecentTransactions(userId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await Transaction.find({
      userId,
      date: { $gte: startDate }
    })
    .sort({ date: 1 })
    .lean();
  }

  /**
   * Generate predictions using ML service
   * @param {string} userId - User ID
   * @param {Array} recentTransactions - Recent transaction data
   * @returns {Promise<Array>} Generated predictions
   * @private
   */
  async generatePredictions(userId, recentTransactions) {
    try {
      // Get all historical transactions for context
      const allTransactions = await Transaction.find({ userId })
        .sort({ date: 1 })
        .lean();

      // Calculate daily balances from transactions
      const balanceData = this.calculateBalanceHistory(allTransactions);

      // Call ML service to generate predictions
      const response = await mlServiceClient.generatePredictions(
        userId,
        balanceData,
        { predictionDays: 30, includeConfidence: true }
      );

      // Transform ML service response to prediction format
      if (response.predictions && Array.isArray(response.predictions)) {
        return response.predictions.map((pred, index) => ({
          targetDate: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000),
          predictedBalance: pred.predicted_balance || pred.value,
          confidenceInterval: pred.confidence_interval || {
            lower: pred.lower_bound,
            upper: pred.upper_bound,
            level: 0.95
          },
          modelVersion: response.model_version || 'v1.0',
          accuracy: response.metrics || {},
          features: response.features || {}
        }));
      }

      return [];
    } catch (error) {
      logger.error(`Error generating predictions for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate balance history from transactions
   * @param {Array} transactions - Transaction array
   * @returns {Array} Balance history
   * @private
   */
  calculateBalanceHistory(transactions) {
    const balanceData = [];
    let currentBalance = 0;

    // Group transactions by date
    const transactionsByDate = {};
    transactions.forEach(tx => {
      const dateKey = new Date(tx.date).toISOString().split('T')[0];
      if (!transactionsByDate[dateKey]) {
        transactionsByDate[dateKey] = [];
      }
      transactionsByDate[dateKey].push(tx);
    });

    // Calculate daily balances
    const sortedDates = Object.keys(transactionsByDate).sort();
    sortedDates.forEach(dateKey => {
      const dayTransactions = transactionsByDate[dateKey];
      dayTransactions.forEach(tx => {
        currentBalance += tx.amount;
      });
      balanceData.push({
        date: dateKey,
        balance: currentBalance
      });
    });

    return balanceData;
  }

  /**
   * Save predictions to database
   * @param {string} userId - User ID
   * @param {Array} predictions - Prediction data
   * @private
   */
  async savePredictions(userId, predictions) {
    // Deactivate old predictions
    await Prediction.updateMany(
      { userId, isActive: true },
      { isActive: false }
    );

    // Save new predictions
    const predictionDocs = predictions.map(pred => ({
      userId,
      predictionDate: new Date(),
      targetDate: pred.targetDate,
      predictionType: 'balance',
      predictedBalance: pred.predictedBalance,
      confidenceInterval: pred.confidenceInterval,
      modelVersion: pred.modelVersion || 'v1.0',
      accuracy: pred.accuracy,
      features: pred.features || {},
      isActive: true
    }));

    await Prediction.insertMany(predictionDocs);
    logger.info(`Saved ${predictionDocs.length} predictions for user ${userId}`);
  }

  /**
   * Calculate financial stress based on predictions
   * @param {string} userId - User ID
   * @param {Array} predictions - Prediction data
   * @returns {Promise<Object>} Financial stress data
   * @private
   */
  async calculateFinancialStress(userId, predictions) {
    try {
      // Get recent transactions for stress calculation
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const transactions = await Transaction.find({
        userId,
        date: { $gte: threeMonthsAgo }
      }).lean();

      // Calculate current balance
      const currentBalance = transactions.reduce((sum, tx) => sum + tx.amount, 0);

      // Transform predictions for ML service
      const predictionData = predictions.map(pred => ({
        date: pred.targetDate,
        predicted_balance: pred.predictedBalance,
        confidence_lower: pred.confidenceInterval?.lower,
        confidence_upper: pred.confidenceInterval?.upper
      }));

      // Call ML service to calculate financial stress
      const response = await mlServiceClient.calculateStressScore(
        userId,
        currentBalance,
        predictionData,
        transactions
      );

      if (!response || response.stress_score === undefined) {
        return null;
      }

      // Map stress score to level
      const score = response.stress_score;
      let level = 'low';
      if (score > 0.75) level = 'critical';
      else if (score > 0.5) level = 'high';
      else if (score > 0.25) level = 'moderate';

      // Transform factors
      const factors = (response.factors || []).map(factor => ({
        category: factor.category || 'spending_trend',
        impact: factor.impact || 0,
        description: factor.description || '',
        severity: factor.severity || 'medium'
      }));

      // Transform recommendations
      const recommendations = (response.recommendations || []).map(rec => ({
        type: rec.type || 'reduce_spending',
        priority: rec.priority || 'medium',
        title: rec.title || '',
        description: rec.description || '',
        potentialImpact: rec.potential_impact || 0,
        actionItems: rec.action_items || []
      }));

      // Save financial stress data
      const stressData = new FinancialStress({
        userId,
        score,
        level,
        factors,
        recommendations,
        calculatedAt: new Date(),
        basedOnPeriod: {
          startDate: threeMonthsAgo,
          endDate: new Date(),
          transactionCount: transactions.length
        },
        metrics: response.metrics || {},
        alerts: (response.alerts || []).map(alert => ({
          type: alert.type || 'overspending',
          severity: alert.severity || 'warning',
          message: alert.message || '',
          triggeredAt: new Date(),
          acknowledged: false
        })),
        isActive: true
      });

      await stressData.save();
      logger.info(`Calculated financial stress for user ${userId}:`, {
        score,
        level
      });

      return stressData;
    } catch (error) {
      logger.error(`Error calculating financial stress for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Broadcast updates to connected clients via WebSocket
   * @param {string} userId - User ID
   * @param {Array} predictions - Prediction data
   * @param {Object} stressData - Financial stress data
   * @private
   */
  async broadcastUpdates(userId, predictions, stressData) {
    try {
      const realTimeService = getRealTimeUpdateService();

      // Broadcast prediction update
      if (predictions && predictions.length > 0) {
        realTimeService.broadcastPredictionUpdate(userId, {
          predictions: predictions.slice(0, 30), // Send first 30 days
          updatedAt: new Date().toISOString()
        });
      }

      // Broadcast financial stress update
      if (stressData) {
        realTimeService.broadcastFinancialStressUpdate(userId, {
          score: stressData.score,
          level: stressData.level,
          factors: stressData.factors.slice(0, 3), // Top 3 factors
          recommendations: stressData.recommendations.slice(0, 5) // Top 5 recommendations
        });

        // Send alert if stress level is high or critical
        if (stressData.level === 'high' || stressData.level === 'critical') {
          realTimeService.broadcastAlert(userId, {
            title: 'Financial Stress Alert',
            message: `Your financial stress level is ${stressData.level}`,
            priority: stressData.level === 'critical' ? 'urgent' : 'high',
            category: 'financial_stress',
            score: stressData.score
          });
        }
      }

      // Broadcast dashboard update
      realTimeService.broadcastDashboardUpdate(userId, {
        predictionsUpdated: true,
        stressUpdated: !!stressData,
        timestamp: new Date().toISOString()
      });

      logger.debug(`Broadcasted updates to user ${userId}`);
    } catch (error) {
      logger.error(`Error broadcasting updates for user ${userId}:`, error);
    }
  }

  /**
   * Manually trigger prediction update for a specific user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Update result
   */
  async triggerManualUpdate(userId) {
    logger.info(`Manual prediction update triggered for user ${userId}`);
    return await this.updateUserPredictions(userId);
  }

  /**
   * Get scheduler statistics
   * @returns {Object} Scheduler statistics
   */
  getStatistics() {
    return {
      isRunning: this.isRunning,
      lastUpdateTime: this.lastUpdateTime,
      updateInProgress: this.updateInProgress.size,
      stats: { ...this.updateStats }
    };
  }

  /**
   * Reset statistics
   */
  resetStatistics() {
    this.updateStats = {
      totalUpdates: 0,
      successfulUpdates: 0,
      failedUpdates: 0,
      lastRunDuration: 0
    };
    logger.info('Prediction update statistics reset');
  }
}

// Singleton instance
let instance = null;

/**
 * Get the singleton instance of PredictionUpdateScheduler
 * @returns {PredictionUpdateScheduler}
 */
function getPredictionUpdateScheduler() {
  if (!instance) {
    instance = new PredictionUpdateScheduler();
  }
  return instance;
}

module.exports = { getPredictionUpdateScheduler };
