const express = require('express');
const { validationSets, validateDateRange } = require('../config/validation');
const { authenticateToken, validateResourceOwnership } = require('../middleware/auth');
const { uploadSingle, cleanupOnError, validateUploadedFile } = require('../middleware/upload');
const csvService = require('../services/csvService');
const batchProcessor = require('../services/batchProcessor');
const { Transaction } = require('../models');
const { logger } = require('../config/logger');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @route   POST /api/transactions/upload/batch
 * @desc    Upload and process large CSV file with batch processing
 * @access  Private
 */
router.post('/upload/batch',
  cleanupOnError,
  uploadSingle('file'),
  validateUploadedFile,
  async (req, res) => {
    try {
      const { file } = req;
      
      logger.info('Starting batch CSV processing', {
        userId: req.userId,
        filename: file.filename,
        originalname: file.originalname,
        size: file.size
      });

      // Validate CSV file first
      const validationResult = await csvService.validateCSVFile(file.path);
      
      if (!validationResult.isValid) {
        await csvService.cleanupFile(file.path);
        return res.status(400).json({
          error: 'Invalid CSV file',
          message: 'CSV validation failed',
          details: {
            errors: validationResult.errors,
            warnings: validationResult.warnings
          }
        });
      }

      // Start batch processing
      const processingOptions = {
        onProgress: (progress, job) => {
          logger.debug('Batch processing progress', {
            jobId: job.id,
            userId: req.userId,
            progress
          });
        },
        onBatchComplete: (batchResults, batchNumber, job) => {
          logger.debug('Batch completed', {
            jobId: job.id,
            batchNumber,
            successful: batchResults.successful,
            errors: batchResults.errors.length
          });
        },
        onError: (error, job) => {
          logger.error('Batch processing error', {
            jobId: job.id,
            userId: req.userId,
            error: error.message
          });
        }
      };

      const processingResult = await batchProcessor.processLargeCSV(
        file.path,
        req.userId,
        validationResult.detectedFormat,
        processingOptions
      );

      // Clean up uploaded file
      await csvService.cleanupFile(file.path);

      res.status(202).json({
        success: true,
        message: 'Batch processing completed',
        data: {
          jobId: processingResult.jobId,
          importBatch: processingResult.results.importBatch,
          processedCount: processingResult.progress.successfulRows,
          errorCount: processingResult.progress.errorRows,
          totalRows: processingResult.progress.totalRows,
          duration: processingResult.duration,
          validation: {
            detectedFormat: validationResult.detectedFormat.name,
            fileSize: validationResult.fileSize,
            warnings: validationResult.warnings
          }
        }
      });

    } catch (error) {
      logger.error('Batch CSV processing error:', error);
      
      if (req.file) {
        await csvService.cleanupFile(req.file.path);
      }
      
      res.status(500).json({
        error: 'Batch processing failed',
        message: 'Internal server error during batch CSV processing'
      });
    }
  }
);

/**
 * @route   GET /api/transactions/jobs/:jobId/status
 * @desc    Get batch processing job status
 * @access  Private
 */
router.get('/jobs/:jobId/status', async (req, res) => {
  try {
    const { jobId } = req.params;
    const status = batchProcessor.getJobStatus(jobId);
    
    if (!status) {
      return res.status(404).json({
        error: 'Job not found',
        message: 'Processing job not found or expired'
      });
    }

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('Get job status error:', error);
    res.status(500).json({
      error: 'Failed to get job status',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/transactions/jobs/:jobId/results
 * @desc    Get batch processing job results
 * @access  Private
 */
router.get('/jobs/:jobId/results', async (req, res) => {
  try {
    const { jobId } = req.params;
    const results = batchProcessor.getJobResults(jobId);
    
    if (!results) {
      return res.status(404).json({
        error: 'Job not found',
        message: 'Processing job not found or expired'
      });
    }

    res.json({
      success: true,
      data: {
        jobId: results.id,
        status: results.status,
        progress: results.progress,
        duration: results.duration,
        importBatch: results.results.importBatch,
        errorSummary: {
          totalErrors: results.results.errors.length,
          errors: results.results.errors.slice(0, 50) // Limit error details
        }
      }
    });

  } catch (error) {
    logger.error('Get job results error:', error);
    res.status(500).json({
      error: 'Failed to get job results',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/transactions/jobs/:jobId/cancel
 * @desc    Cancel batch processing job
 * @access  Private
 */
router.post('/jobs/:jobId/cancel', async (req, res) => {
  try {
    const { jobId } = req.params;
    const cancelled = batchProcessor.cancelJob(jobId);
    
    if (!cancelled) {
      return res.status(400).json({
        error: 'Cannot cancel job',
        message: 'Job not found, already completed, or cannot be cancelled'
      });
    }

    res.json({
      success: true,
      message: 'Job cancelled successfully'
    });

  } catch (error) {
    logger.error('Cancel job error:', error);
    res.status(500).json({
      error: 'Failed to cancel job',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/transactions/jobs
 * @desc    Get user's processing jobs
 * @access  Private
 */
router.get('/jobs', async (req, res) => {
  try {
    const jobs = batchProcessor.getUserJobs(req.userId);
    
    res.json({
      success: true,
      data: {
        jobs,
        totalJobs: jobs.length
      }
    });

  } catch (error) {
    logger.error('Get user jobs error:', error);
    res.status(500).json({
      error: 'Failed to get jobs',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/transactions/upload
 * @desc    Upload and process CSV file
 * @access  Private
 */
router.post('/upload', 
  cleanupOnError,
  uploadSingle('file'),
  validateUploadedFile,
  async (req, res) => {
    let validationResult = null;
    let processingResult = null;

    try {
      const { file } = req;
      
      logger.info('Starting CSV upload processing', {
        userId: req.userId,
        filename: file.filename,
        originalname: file.originalname,
        size: file.size
      });

      // Step 1: Validate CSV file
      validationResult = await csvService.validateCSVFile(file.path);
      
      if (!validationResult.isValid) {
        await csvService.cleanupFile(file.path);
        return res.status(400).json({
          error: 'Invalid CSV file',
          message: 'CSV validation failed',
          details: {
            errors: validationResult.errors,
            warnings: validationResult.warnings
          }
        });
      }

      // Step 2: Process CSV file if validation passed
      processingResult = await csvService.processCSVFile(
        file.path,
        req.userId,
        validationResult.detectedFormat
      );

      // Step 3: Clean up uploaded file
      await csvService.cleanupFile(file.path);

      if (!processingResult.success) {
        return res.status(400).json({
          error: 'Processing failed',
          message: 'Failed to process CSV file',
          details: {
            processedCount: processingResult.processedCount,
            errorCount: processingResult.errorCount,
            errors: processingResult.errors.slice(0, 10) // Limit error details
          }
        });
      }

      // Step 4: Return success response
      res.status(201).json({
        success: true,
        message: 'CSV file processed successfully',
        data: {
          importBatch: processingResult.importBatch,
          processedCount: processingResult.processedCount,
          errorCount: processingResult.errorCount,
          validation: {
            detectedFormat: validationResult.detectedFormat.name,
            totalRows: validationResult.totalRows,
            fileSize: validationResult.fileSize,
            warnings: validationResult.warnings
          },
          transactions: processingResult.transactions.map(t => ({
            _id: t._id,
            date: t.date,
            amount: t.amount,
            description: t.description,
            category: t.category
          }))
        }
      });

    } catch (error) {
      logger.error('CSV upload processing error:', error);
      
      // Clean up file on error
      if (req.file) {
        await csvService.cleanupFile(req.file.path);
      }
      
      res.status(500).json({
        error: 'Processing failed',
        message: 'Internal server error during CSV processing'
      });
    }
  }
);

/**
 * @route   POST /api/transactions/validate
 * @desc    Validate CSV file without processing
 * @access  Private
 */
router.post('/validate',
  cleanupOnError,
  uploadSingle('file'),
  validateUploadedFile,
  async (req, res) => {
    try {
      const { file } = req;
      
      // Validate CSV file
      const validationResult = await csvService.validateCSVFile(file.path);
      
      // Clean up file
      await csvService.cleanupFile(file.path);
      
      res.json({
        success: true,
        message: 'CSV validation completed',
        data: {
          isValid: validationResult.isValid,
          detectedFormat: validationResult.detectedFormat,
          totalRows: validationResult.totalRows,
          fileSize: validationResult.fileSize,
          sampleRows: validationResult.sampleRows,
          errors: validationResult.errors,
          warnings: validationResult.warnings
        }
      });

    } catch (error) {
      logger.error('CSV validation error:', error);
      
      // Clean up file on error
      if (req.file) {
        await csvService.cleanupFile(req.file.path);
      }
      
      res.status(500).json({
        error: 'Validation failed',
        message: 'Internal server error during CSV validation'
      });
    }
  }
);

/**
 * @route   GET /api/transactions
 * @desc    Get user transactions with filtering and pagination
 * @access  Private
 */
router.get('/', 
  validationSets.transactionQuery,
  validateDateRange,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 50,
        startDate,
        endDate,
        category,
        search,
        sortBy = 'date',
        sortOrder = 'desc'
      } = req.query;

      // Build query
      const query = { userId: req.userId };
      
      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
      }
      
      if (category) {
        query['category.name'] = category;
      }
      
      if (search) {
        query.$text = { $search: search };
      }

      // Build sort
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Execute query with pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const [transactions, totalCount] = await Promise.all([
        Transaction.find(query)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Transaction.countDocuments(query)
      ]);

      const totalPages = Math.ceil(totalCount / parseInt(limit));

      res.json({
        success: true,
        data: {
          transactions,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalCount,
            hasNextPage: parseInt(page) < totalPages,
            hasPrevPage: parseInt(page) > 1
          }
        }
      });

    } catch (error) {
      logger.error('Get transactions error:', error);
      res.status(500).json({
        error: 'Failed to retrieve transactions',
        message: 'Internal server error'
      });
    }
  }
);

/**
 * @route   GET /api/transactions/:id
 * @desc    Get single transaction
 * @access  Private
 */
router.get('/:id',
  validationSets.objectIdParam,
  async (req, res) => {
    try {
      const transaction = await Transaction.findOne({
        _id: req.params.id,
        userId: req.userId
      });

      if (!transaction) {
        return res.status(404).json({
          error: 'Transaction not found',
          message: 'Transaction does not exist or you do not have access to it'
        });
      }

      res.json({
        success: true,
        data: transaction
      });

    } catch (error) {
      logger.error('Get transaction error:', error);
      res.status(500).json({
        error: 'Failed to retrieve transaction',
        message: 'Internal server error'
      });
    }
  }
);

/**
 * @route   POST /api/transactions
 * @desc    Create new transaction manually
 * @access  Private
 */
router.post('/',
  validationSets.transactionCreate,
  async (req, res) => {
    try {
      const { amount, description, date, category } = req.body;

      const transaction = new Transaction({
        userId: req.userId,
        amount,
        description,
        date: new Date(date),
        category: {
          name: category || null,
          confidence: category ? 1.0 : 0,
          isUserVerified: !!category
        },
        rawData: {
          originalDescription: description,
          source: 'manual_entry'
        }
      });

      await transaction.save();

      logger.info('Manual transaction created', {
        userId: req.userId,
        transactionId: transaction._id
      });

      res.status(201).json({
        success: true,
        message: 'Transaction created successfully',
        data: transaction
      });

    } catch (error) {
      logger.error('Create transaction error:', error);
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          error: 'Validation failed',
          message: error.message
        });
      }
      
      res.status(500).json({
        error: 'Failed to create transaction',
        message: 'Internal server error'
      });
    }
  }
);

/**
 * @route   PUT /api/transactions/:id
 * @desc    Update transaction
 * @access  Private
 */
router.put('/:id',
  validationSets.objectIdParam,
  async (req, res) => {
    try {
      const { amount, description, date, category } = req.body;
      
      const updateData = {};
      if (amount !== undefined) updateData.amount = amount;
      if (description !== undefined) updateData.description = description;
      if (date !== undefined) updateData.date = new Date(date);
      if (category !== undefined) {
        updateData.category = {
          name: category,
          confidence: 1.0,
          isUserVerified: true
        };
      }

      const transaction = await Transaction.findOneAndUpdate(
        { _id: req.params.id, userId: req.userId },
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!transaction) {
        return res.status(404).json({
          error: 'Transaction not found',
          message: 'Transaction does not exist or you do not have access to it'
        });
      }

      logger.info('Transaction updated', {
        userId: req.userId,
        transactionId: transaction._id
      });

      res.json({
        success: true,
        message: 'Transaction updated successfully',
        data: transaction
      });

    } catch (error) {
      logger.error('Update transaction error:', error);
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          error: 'Validation failed',
          message: error.message
        });
      }
      
      res.status(500).json({
        error: 'Failed to update transaction',
        message: 'Internal server error'
      });
    }
  }
);

/**
 * @route   DELETE /api/transactions/:id
 * @desc    Delete transaction
 * @access  Private
 */
router.delete('/:id',
  validationSets.objectIdParam,
  async (req, res) => {
    try {
      const transaction = await Transaction.findOneAndDelete({
        _id: req.params.id,
        userId: req.userId
      });

      if (!transaction) {
        return res.status(404).json({
          error: 'Transaction not found',
          message: 'Transaction does not exist or you do not have access to it'
        });
      }

      logger.info('Transaction deleted', {
        userId: req.userId,
        transactionId: transaction._id
      });

      res.json({
        success: true,
        message: 'Transaction deleted successfully'
      });

    } catch (error) {
      logger.error('Delete transaction error:', error);
      res.status(500).json({
        error: 'Failed to delete transaction',
        message: 'Internal server error'
      });
    }
  }
);

/**
 * @route   GET /api/transactions/stats/summary
 * @desc    Get transaction statistics summary
 * @access  Private
 */
router.get('/stats/summary',
  validateDateRange,
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      // Default to last 30 days if no date range provided
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

      const stats = await Transaction.getSpendingSummary(req.userId, start, end);
      const trends = await Transaction.getMonthlyTrends(req.userId, 12);

      res.json({
        success: true,
        data: {
          period: { start, end },
          categoryBreakdown: stats,
          monthlyTrends: trends
        }
      });

    } catch (error) {
      logger.error('Get transaction stats error:', error);
      res.status(500).json({
        error: 'Failed to retrieve statistics',
        message: 'Internal server error'
      });
    }
  }
);

/**
 * @route   GET /api/transactions/imports/:batchId
 * @desc    Get transactions from specific import batch
 * @access  Private
 */
router.get('/imports/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    
    const transactions = await Transaction.find({
      userId: req.userId,
      'rawData.importBatch': batchId
    }).sort({ date: -1 });

    if (transactions.length === 0) {
      return res.status(404).json({
        error: 'Import batch not found',
        message: 'No transactions found for this import batch'
      });
    }

    const stats = await csvService.getProcessingStats(req.userId, batchId);

    res.json({
      success: true,
      data: {
        batchId,
        transactions,
        stats: stats[0] || null
      }
    });

  } catch (error) {
    logger.error('Get import batch error:', error);
    res.status(500).json({
      error: 'Failed to retrieve import batch',
      message: 'Internal server error'
    });
  }
});

module.exports = router;