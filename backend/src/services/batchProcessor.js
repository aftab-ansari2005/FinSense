const fs = require('fs');
const csv = require('csv-parser');
const { Transform } = require('stream');
const { logger } = require('../config/logger');
const { Transaction } = require('../models');
const csvService = require('./csvService');

class BatchProcessor {
  constructor() {
    this.batchSize = 100; // Process 100 transactions at a time
    this.maxConcurrentBatches = 3; // Maximum concurrent batch operations
    this.processingJobs = new Map(); // Track active processing jobs
  }

  /**
   * Process large CSV file in batches with progress tracking
   */
  async processLargeCSV(filePath, userId, format, options = {}) {
    const {
      batchSize = this.batchSize,
      onProgress = null,
      onBatchComplete = null,
      onError = null
    } = options;

    const jobId = this.generateJobId();
    const job = {
      id: jobId,
      userId,
      filePath,
      status: 'processing',
      progress: {
        totalRows: 0,
        processedRows: 0,
        successfulRows: 0,
        errorRows: 0,
        currentBatch: 0,
        totalBatches: 0
      },
      results: {
        transactions: [],
        errors: [],
        importBatch: csvService.generateToken ? csvService.generateToken(16) : this.generateJobId()
      },
      startTime: new Date()
    };

    this.processingJobs.set(jobId, job);

    try {
      // First pass: count total rows
      const totalRows = await this.countCSVRows(filePath);
      job.progress.totalRows = totalRows;
      job.progress.totalBatches = Math.ceil(totalRows / batchSize);

      logger.info('Starting batch processing', {
        jobId,
        userId,
        totalRows,
        batchSize,
        totalBatches: job.progress.totalBatches
      });

      // Second pass: process in batches
      await this.processBatches(filePath, format, job, batchSize, {
        onProgress,
        onBatchComplete,
        onError
      });

      job.status = 'completed';
      job.endTime = new Date();
      job.duration = job.endTime - job.startTime;

      logger.info('Batch processing completed', {
        jobId,
        userId,
        duration: job.duration,
        processedRows: job.progress.processedRows,
        successfulRows: job.progress.successfulRows,
        errorRows: job.progress.errorRows
      });

      return {
        success: true,
        jobId,
        results: job.results,
        progress: job.progress,
        duration: job.duration
      };

    } catch (error) {
      job.status = 'failed';
      job.error = error.message;
      job.endTime = new Date();

      logger.error('Batch processing failed', {
        jobId,
        userId,
        error: error.message
      });

      if (onError) {
        onError(error, job);
      }

      throw error;
    }
  }

  /**
   * Count total rows in CSV file
   */
  async countCSVRows(filePath) {
    return new Promise((resolve, reject) => {
      let rowCount = 0;

      fs.createReadStream(filePath)
        .pipe(csv({ skipEmptyLines: true }))
        .on('data', () => {
          rowCount++;
        })
        .on('end', () => {
          resolve(rowCount);
        })
        .on('error', reject);
    });
  }

  /**
   * Process CSV file in batches
   */
  async processBatches(filePath, format, job, batchSize, callbacks) {
    return new Promise((resolve, reject) => {
      let currentBatch = [];
      let rowCount = 0;
      let batchNumber = 0;

      const processCurrentBatch = async () => {
        if (currentBatch.length === 0) return;

        batchNumber++;
        job.progress.currentBatch = batchNumber;

        try {
          const batchResults = await this.processBatch(
            currentBatch,
            format,
            job.userId,
            job.results.importBatch
          );

          // Update progress
          job.progress.successfulRows += batchResults.successful;
          job.progress.errorRows += batchResults.errors.length;
          job.progress.processedRows = job.progress.successfulRows + job.progress.errorRows;

          // Store results
          job.results.transactions.push(...batchResults.transactions);
          job.results.errors.push(...batchResults.errors);

          // Call progress callback
          if (callbacks.onProgress) {
            callbacks.onProgress(job.progress, job);
          }

          // Call batch complete callback
          if (callbacks.onBatchComplete) {
            callbacks.onBatchComplete(batchResults, batchNumber, job);
          }

          logger.debug('Batch processed', {
            jobId: job.id,
            batchNumber,
            batchSize: currentBatch.length,
            successful: batchResults.successful,
            errors: batchResults.errors.length
          });

        } catch (error) {
          logger.error('Batch processing error', {
            jobId: job.id,
            batchNumber,
            error: error.message
          });

          job.results.errors.push({
            batch: batchNumber,
            error: error.message,
            rows: currentBatch.map((_, index) => rowCount - currentBatch.length + index + 1)
          });

          if (callbacks.onError) {
            callbacks.onError(error, job);
          }
        }

        currentBatch = [];
      };

      fs.createReadStream(filePath)
        .pipe(csv({ skipEmptyLines: true }))
        .on('data', async (row) => {
          rowCount++;
          currentBatch.push({ row, rowNumber: rowCount });

          // Process batch when it reaches the batch size
          if (currentBatch.length >= batchSize) {
            await processCurrentBatch();
          }
        })
        .on('end', async () => {
          // Process remaining rows
          if (currentBatch.length > 0) {
            await processCurrentBatch();
          }
          resolve();
        })
        .on('error', reject);
    });
  }

  /**
   * Process a single batch of transactions
   */
  async processBatch(batchData, format, userId, importBatch) {
    const transactions = [];
    const errors = [];
    let successful = 0;

    for (const { row, rowNumber } of batchData) {
      try {
        const transaction = csvService.parseTransactionRow 
          ? csvService.parseTransactionRow(row, format, userId, importBatch)
          : this.parseTransactionRow(row, format, userId, importBatch);

        if (transaction) {
          transactions.push(transaction);
          successful++;
        } else {
          errors.push({
            row: rowNumber,
            error: 'Failed to parse transaction',
            data: row
          });
        }
      } catch (error) {
        errors.push({
          row: rowNumber,
          error: error.message,
          data: row
        });
      }
    }

    // Save transactions to database in batch
    if (transactions.length > 0) {
      try {
        const savedTransactions = await Transaction.insertMany(transactions, {
          ordered: false, // Continue on individual document errors
          rawResult: true
        });

        return {
          successful,
          errors,
          transactions: savedTransactions.insertedIds || transactions
        };
      } catch (error) {
        // Handle bulk insert errors
        if (error.writeErrors) {
          const writeErrors = error.writeErrors.map(err => ({
            row: err.index + 1,
            error: err.errmsg,
            data: transactions[err.index]
          }));
          errors.push(...writeErrors);
          
          // Count successful inserts
          const successfulInserts = transactions.length - error.writeErrors.length;
          return {
            successful: successfulInserts,
            errors,
            transactions: error.insertedIds || []
          };
        }
        throw error;
      }
    }

    return {
      successful,
      errors,
      transactions: []
    };
  }

  /**
   * Fallback transaction parser if csvService doesn't have one
   */
  parseTransactionRow(row, format, userId, importBatch) {
    const rowArray = Object.values(row);
    
    const dateValue = rowArray[format.mapping.date];
    const amountValue = rowArray[format.mapping.amount];
    const descriptionValue = rowArray[format.mapping.description];

    // Basic parsing (simplified version)
    const parsedDate = new Date(dateValue);
    const parsedAmount = parseFloat(amountValue.toString().replace(/[^-\d.]/g, ''));
    
    if (isNaN(parsedDate.getTime()) || isNaN(parsedAmount) || !descriptionValue) {
      return null;
    }

    return {
      userId: userId,
      date: parsedDate,
      amount: parsedAmount,
      description: descriptionValue.trim().substring(0, 500),
      rawData: {
        originalDescription: descriptionValue.trim(),
        source: 'csv_upload',
        importBatch: importBatch
      },
      category: {
        name: null,
        confidence: 0,
        isUserVerified: false
      }
    };
  }

  /**
   * Get processing job status
   */
  getJobStatus(jobId) {
    const job = this.processingJobs.get(jobId);
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      status: job.status,
      progress: job.progress,
      startTime: job.startTime,
      endTime: job.endTime,
      duration: job.endTime ? job.endTime - job.startTime : Date.now() - job.startTime,
      error: job.error
    };
  }

  /**
   * Get processing job results
   */
  getJobResults(jobId) {
    const job = this.processingJobs.get(jobId);
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      status: job.status,
      results: job.results,
      progress: job.progress,
      duration: job.endTime ? job.endTime - job.startTime : null
    };
  }

  /**
   * Cancel processing job
   */
  cancelJob(jobId) {
    const job = this.processingJobs.get(jobId);
    if (!job) {
      return false;
    }

    if (job.status === 'processing') {
      job.status = 'cancelled';
      job.endTime = new Date();
      logger.info('Processing job cancelled', { jobId });
      return true;
    }

    return false;
  }

  /**
   * Clean up completed jobs
   */
  cleanupJobs(maxAge = 24 * 60 * 60 * 1000) { // 24 hours default
    const now = Date.now();
    let cleaned = 0;

    for (const [jobId, job] of this.processingJobs.entries()) {
      if (job.endTime && (now - job.endTime.getTime()) > maxAge) {
        this.processingJobs.delete(jobId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info('Cleaned up old processing jobs', { cleaned });
    }

    return cleaned;
  }

  /**
   * Get all active jobs for a user
   */
  getUserJobs(userId) {
    const userJobs = [];
    
    for (const job of this.processingJobs.values()) {
      if (job.userId.toString() === userId.toString()) {
        userJobs.push({
          id: job.id,
          status: job.status,
          progress: job.progress,
          startTime: job.startTime,
          endTime: job.endTime
        });
      }
    }

    return userJobs;
  }

  /**
   * Generate unique job ID
   */
  generateJobId() {
    return `batch_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Process with streaming for memory efficiency
   */
  async processWithStreaming(filePath, userId, format, options = {}) {
    const { onProgress, onError } = options;
    const jobId = this.generateJobId();
    
    return new Promise((resolve, reject) => {
      const results = {
        jobId,
        processedCount: 0,
        errorCount: 0,
        errors: [],
        importBatch: this.generateJobId()
      };

      let batch = [];
      const batchSize = 50;

      const processBatch = async () => {
        if (batch.length === 0) return;

        try {
          const batchResults = await this.processBatch(batch, format, userId, results.importBatch);
          results.processedCount += batchResults.successful;
          results.errorCount += batchResults.errors.length;
          results.errors.push(...batchResults.errors);

          if (onProgress) {
            onProgress({
              processed: results.processedCount,
              errors: results.errorCount
            });
          }
        } catch (error) {
          results.errorCount += batch.length;
          results.errors.push({
            batch: Math.ceil(results.processedCount / batchSize),
            error: error.message
          });

          if (onError) {
            onError(error);
          }
        }

        batch = [];
      };

      fs.createReadStream(filePath)
        .pipe(csv({ skipEmptyLines: true }))
        .on('data', async (row) => {
          batch.push({ row, rowNumber: results.processedCount + results.errorCount + 1 });

          if (batch.length >= batchSize) {
            await processBatch();
          }
        })
        .on('end', async () => {
          if (batch.length > 0) {
            await processBatch();
          }
          resolve(results);
        })
        .on('error', (error) => {
          if (onError) {
            onError(error);
          }
          reject(error);
        });
    });
  }
}

module.exports = new BatchProcessor();