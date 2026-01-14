const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const dataDeletionService = require('../services/dataDeletionService');
const { logger } = require('../config/logger');

/**
 * @route   GET /api/data-deletion/statistics
 * @desc    Get deletion statistics and options for the authenticated user
 * @access  Private
 */
router.get('/statistics', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const statistics = await dataDeletionService.getDeletionStatistics(userId);

    res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    logger.error('Error getting deletion statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get deletion statistics',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/data-deletion/preview
 * @desc    Preview what data will be deleted
 * @access  Private
 */
router.get('/preview', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const preview = await dataDeletionService.previewDeletion(userId);

    res.status(200).json({
      success: true,
      data: preview
    });
  } catch (error) {
    logger.error('Error previewing deletion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to preview deletion',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/data-deletion/request
 * @desc    Request a data deletion with confirmation token
 * @access  Private
 */
router.post('/request', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { deletionType } = req.body;

    const validTypes = ['account', 'transactions', 'predictions', 'stress'];
    if (deletionType && !validTypes.includes(deletionType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid deletion type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    const request = await dataDeletionService.requestDeletion(userId, deletionType);

    res.status(200).json({
      success: true,
      data: request
    });
  } catch (error) {
    logger.error('Error creating deletion request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create deletion request',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/data-deletion/account
 * @desc    Delete entire user account and all associated data
 * @access  Private
 */
router.delete('/account', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { confirmation } = req.body;

    // Require explicit confirmation
    if (confirmation !== 'DELETE_MY_ACCOUNT') {
      return res.status(400).json({
        success: false,
        message: 'Account deletion requires explicit confirmation. Send { "confirmation": "DELETE_MY_ACCOUNT" } in request body.'
      });
    }

    const result = await dataDeletionService.deleteUserAccount(userId);

    res.status(200).json({
      success: true,
      message: 'Account successfully deleted',
      data: result
    });
  } catch (error) {
    logger.error('Error deleting account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/data-deletion/transactions
 * @desc    Delete all transactions for the authenticated user
 * @access  Private
 */
router.delete('/transactions', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate } = req.query;

    let result;
    if (startDate && endDate) {
      // Delete transactions in date range
      result = await dataDeletionService.deleteTransactionsByDateRange(
        userId,
        new Date(startDate),
        new Date(endDate)
      );
    } else {
      // Delete all transactions
      result = await dataDeletionService.deleteTransactions(userId);
    }

    res.status(200).json({
      success: true,
      message: 'Transactions successfully deleted',
      data: result
    });
  } catch (error) {
    logger.error('Error deleting transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete transactions',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/data-deletion/predictions
 * @desc    Delete all predictions for the authenticated user
 * @access  Private
 */
router.delete('/predictions', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await dataDeletionService.deletePredictions(userId);

    res.status(200).json({
      success: true,
      message: 'Predictions successfully deleted',
      data: result
    });
  } catch (error) {
    logger.error('Error deleting predictions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete predictions',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/data-deletion/stress
 * @desc    Delete all financial stress records for the authenticated user
 * @access  Private
 */
router.delete('/stress', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await dataDeletionService.deleteFinancialStressRecords(userId);

    res.status(200).json({
      success: true,
      message: 'Financial stress records successfully deleted',
      data: result
    });
  } catch (error) {
    logger.error('Error deleting financial stress records:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete financial stress records',
      error: error.message
    });
  }
});

module.exports = router;
