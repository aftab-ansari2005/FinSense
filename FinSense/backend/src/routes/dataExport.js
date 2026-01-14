const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const dataExportService = require('../services/dataExportService');
const { logger } = require('../config/logger');

/**
 * @route   GET /api/data-export/statistics
 * @desc    Get export statistics for the authenticated user
 * @access  Private
 */
router.get('/statistics', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const statistics = await dataExportService.getExportStatistics(userId);

    res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    logger.error('Error getting export statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get export statistics',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/data-export/json
 * @desc    Export all user data in JSON format
 * @access  Private
 */
router.get('/json', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const exportData = await dataExportService.exportUserDataJSON(userId);

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="finsense-data-export-${userId}-${Date.now()}.json"`);

    res.status(200).json(exportData);
  } catch (error) {
    logger.error('Error exporting user data (JSON):', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export user data',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/data-export/csv/transactions
 * @desc    Export user transactions in CSV format
 * @access  Private
 */
router.get('/csv/transactions', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const csv = await dataExportService.exportTransactionsCSV(userId);

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="finsense-transactions-${userId}-${Date.now()}.csv"`);

    res.status(200).send(csv);
  } catch (error) {
    logger.error('Error exporting transactions (CSV):', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export transactions',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/data-export/csv/predictions
 * @desc    Export user predictions in CSV format
 * @access  Private
 */
router.get('/csv/predictions', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const csv = await dataExportService.exportPredictionsCSV(userId);

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="finsense-predictions-${userId}-${Date.now()}.csv"`);

    res.status(200).send(csv);
  } catch (error) {
    logger.error('Error exporting predictions (CSV):', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export predictions',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/data-export/complete
 * @desc    Export complete data package (JSON + CSV)
 * @access  Private
 */
router.get('/complete', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const exportPackage = await dataExportService.exportCompleteDataPackage(userId);

    // Set headers for JSON download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="finsense-complete-export-${userId}-${Date.now()}.json"`);

    res.status(200).json(exportPackage);
  } catch (error) {
    logger.error('Error exporting complete data package:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export complete data package',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/data-export/request
 * @desc    Request a data export (for async processing in future)
 * @access  Private
 */
router.post('/request', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { format, includeTransactions, includePredictions } = req.body;

    // For now, return immediate export info
    // In production, this could queue an async job
    const statistics = await dataExportService.getExportStatistics(userId);

    res.status(200).json({
      success: true,
      message: 'Export request received',
      data: {
        requestId: `export-${userId}-${Date.now()}`,
        status: 'ready',
        format: format || 'JSON',
        statistics: statistics.statistics,
        downloadLinks: {
          json: `/api/data-export/json`,
          transactionsCSV: `/api/data-export/csv/transactions`,
          predictionsCSV: `/api/data-export/csv/predictions`,
          complete: `/api/data-export/complete`
        }
      }
    });
  } catch (error) {
    logger.error('Error processing export request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process export request',
      error: error.message
    });
  }
});

module.exports = router;
