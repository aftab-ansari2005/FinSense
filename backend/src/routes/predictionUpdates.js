const express = require('express');
const router = express.Router();
const demoData = require('../config/demoData');
const { authenticateToken } = require('../middleware/auth');
const { getPredictionUpdateScheduler } = require('../services/predictionUpdateScheduler');
const { logger } = require('../config/logger');

/**
 * @route   POST /api/prediction-updates/trigger
 * @desc    Manually trigger prediction update for authenticated user
 * @access  Private
 */
router.post('/trigger', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    if (demoData.isDemoMode()) {
      return res.status(200).json({
        success: true,
        message: 'Prediction update completed successfully',
        data: { predictionsCount: 30, stressScore: 0.34 }
      });
    }

    const scheduler = getPredictionUpdateScheduler();

    logger.info(`Manual prediction update triggered by user ${userId}`);

    const result = await scheduler.triggerManualUpdate(userId);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Prediction update completed successfully',
        data: {
          predictionsCount: result.predictionsCount,
          stressScore: result.stressScore
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Prediction update failed',
        reason: result.reason,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Error triggering manual prediction update:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger prediction update',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/prediction-updates/statistics
 * @desc    Get prediction update scheduler statistics
 * @access  Private
 */
router.get('/statistics', authenticateToken, async (req, res) => {
  try {
    if (demoData.isDemoMode()) {
      return res.status(200).json({
        success: true,
        data: {
          isRunning: false,
          lastUpdateTime: new Date().toISOString(),
          updateInProgress: false,
          stats: { totalUpdates: 1, successfulUpdates: 1, failedUpdates: 0, lastRunDuration: 120 }
        }
      });
    }

    const scheduler = getPredictionUpdateScheduler();
    const stats = scheduler.getStatistics();

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching prediction update statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/prediction-updates/reset-statistics
 * @desc    Reset prediction update statistics (admin only)
 * @access  Private
 */
router.post('/reset-statistics', authenticateToken, async (req, res) => {
  try {
    if (demoData.isDemoMode()) {
      return res.status(200).json({ success: true, message: 'Statistics reset successfully' });
    }

    const scheduler = getPredictionUpdateScheduler();
    scheduler.resetStatistics();

    logger.info('Prediction update statistics reset');

    res.status(200).json({
      success: true,
      message: 'Statistics reset successfully'
    });
  } catch (error) {
    logger.error('Error resetting prediction update statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset statistics',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/prediction-updates/status
 * @desc    Get scheduler status
 * @access  Private
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    if (demoData.isDemoMode()) {
      return res.status(200).json({
        success: true,
        data: {
          isRunning: false,
          lastUpdateTime: new Date().toISOString(),
          updateInProgress: false,
          successRate: '100.00%'
        }
      });
    }

    const scheduler = getPredictionUpdateScheduler();
    const stats = scheduler.getStatistics();

    res.status(200).json({
      success: true,
      data: {
        isRunning: stats.isRunning,
        lastUpdateTime: stats.lastUpdateTime,
        updateInProgress: stats.updateInProgress,
        successRate: stats.stats.totalUpdates > 0 
          ? (stats.stats.successfulUpdates / stats.stats.totalUpdates * 100).toFixed(2) + '%'
          : 'N/A'
      }
    });
  } catch (error) {
    logger.error('Error fetching scheduler status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch status',
      error: error.message
    });
  }
});

module.exports = router;
