const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { Transform } = require('stream');
const { logger } = require('../config/logger');
const { Transaction } = require('../models');
const encryptionService = require('../utils/encryption');

class CSVService {
  constructor() {
    this.supportedFormats = [
      'date,amount,description',
      'date,description,amount',
      'amount,date,description',
      'description,date,amount',
      'transaction_date,transaction_amount,transaction_description',
      'Date,Amount,Description',
      'DATE,AMOUNT,DESCRIPTION'
    ];
    
    this.requiredFields = ['date', 'amount', 'description'];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.maxTransactions = 10000;
    this.largeBatchThreshold = 1000; // Use batch processing for files with more than 1000 transactions
  }

  /**
   * Validate CSV file format and structure
   */
  async validateCSVFile(filePath) {
    return new Promise((resolve, reject) => {
      const results = {
        isValid: false,
        errors: [],
        warnings: [],
        detectedFormat: null,
        sampleRows: [],
        totalRows: 0,
        fileSize: 0
      };

      try {
        // Check file size
        const stats = fs.statSync(filePath);
        results.fileSize = stats.size;
        
        if (stats.size > this.maxFileSize) {
          results.errors.push(`File size (${Math.round(stats.size / 1024 / 1024)}MB) exceeds maximum allowed size (${this.maxFileSize / 1024 / 1024}MB)`);
          return resolve(results);
        }

        const headers = [];
        let rowCount = 0;
        let headerDetected = false;

        const stream = fs.createReadStream(filePath)
          .pipe(csv({
            skipEmptyLines: true,
            skipLinesWithError: true
          }))
          .on('headers', (headerList) => {
            headers.push(...headerList);
            headerDetected = true;
            
            // Detect format
            const normalizedHeaders = headerList.map(h => h.toLowerCase().trim());
            results.detectedFormat = this.detectCSVFormat(normalizedHeaders);
            
            if (!results.detectedFormat) {
              results.errors.push('Unsupported CSV format. Required columns: date, amount, description');
            }
          })
          .on('data', (row) => {
            rowCount++;
            
            // Store first 5 rows as samples
            if (results.sampleRows.length < 5) {
              results.sampleRows.push(row);
            }
            
            // Check row count limit
            if (rowCount > this.maxTransactions) {
              results.errors.push(`File contains too many transactions (${rowCount}). Maximum allowed: ${this.maxTransactions}`);
              stream.destroy();
              return;
            }
            
            // Validate sample rows
            if (rowCount <= 10) {
              const validation = this.validateTransactionRow(row, results.detectedFormat);
              if (!validation.isValid) {
                results.warnings.push(`Row ${rowCount}: ${validation.errors.join(', ')}`);
              }
            }
          })
          .on('end', () => {
            results.totalRows = rowCount;
            
            if (rowCount === 0) {
              results.errors.push('CSV file is empty or contains no valid data');
            }
            
            if (results.errors.length === 0) {
              results.isValid = true;
            }
            
            resolve(results);
          })
          .on('error', (error) => {
            logger.error('CSV validation error:', error);
            results.errors.push(`CSV parsing error: ${error.message}`);
            resolve(results);
          });

      } catch (error) {
        logger.error('File validation error:', error);
        results.errors.push(`File validation error: ${error.message}`);
        resolve(results);
      }
    });
  }

  /**
   * Detect CSV format from headers
   */
  detectCSVFormat(headers) {
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
    
    // Check for exact matches first
    const formats = {
      'standard': ['date', 'amount', 'description'],
      'alternative1': ['date', 'description', 'amount'],
      'alternative2': ['amount', 'date', 'description'],
      'alternative3': ['description', 'date', 'amount'],
      'verbose': ['transaction_date', 'transaction_amount', 'transaction_description']
    };
    
    for (const [formatName, expectedHeaders] of Object.entries(formats)) {
      if (this.arraysEqual(normalizedHeaders, expectedHeaders)) {
        return {
          name: formatName,
          headers: expectedHeaders,
          mapping: this.createFieldMapping(expectedHeaders)
        };
      }
    }
    
    // Check for partial matches or similar field names
    const dateFields = ['date', 'transaction_date', 'trans_date', 'dt'];
    const amountFields = ['amount', 'transaction_amount', 'trans_amount', 'amt', 'value'];
    const descriptionFields = ['description', 'transaction_description', 'trans_description', 'desc', 'memo', 'details'];
    
    const mapping = {};
    let foundFields = 0;
    
    normalizedHeaders.forEach((header, index) => {
      if (dateFields.some(field => header.includes(field))) {
        mapping.date = index;
        foundFields++;
      } else if (amountFields.some(field => header.includes(field))) {
        mapping.amount = index;
        foundFields++;
      } else if (descriptionFields.some(field => header.includes(field))) {
        mapping.description = index;
        foundFields++;
      }
    });
    
    if (foundFields === 3) {
      return {
        name: 'custom',
        headers: normalizedHeaders,
        mapping: mapping
      };
    }
    
    return null;
  }

  /**
   * Create field mapping for CSV format
   */
  createFieldMapping(headers) {
    const mapping = {};
    headers.forEach((header, index) => {
      const normalizedHeader = header.toLowerCase().trim();
      if (normalizedHeader.includes('date')) {
        mapping.date = index;
      } else if (normalizedHeader.includes('amount')) {
        mapping.amount = index;
      } else if (normalizedHeader.includes('description') || normalizedHeader.includes('desc')) {
        mapping.description = index;
      }
    });
    return mapping;
  }

  /**
   * Validate individual transaction row
   */
  validateTransactionRow(row, format) {
    const result = {
      isValid: true,
      errors: [],
      warnings: []
    };

    if (!format) {
      result.isValid = false;
      result.errors.push('No format detected');
      return result;
    }

    const rowArray = Object.values(row);
    
    // Extract fields based on format mapping
    const dateValue = rowArray[format.mapping.date];
    const amountValue = rowArray[format.mapping.amount];
    const descriptionValue = rowArray[format.mapping.description];

    // Validate date
    if (!dateValue || dateValue.trim() === '') {
      result.isValid = false;
      result.errors.push('Date is required');
    } else {
      const parsedDate = this.parseDate(dateValue);
      if (!parsedDate) {
        result.isValid = false;
        result.errors.push('Invalid date format');
      }
    }

    // Validate amount
    if (!amountValue || amountValue.trim() === '') {
      result.isValid = false;
      result.errors.push('Amount is required');
    } else {
      const parsedAmount = this.parseAmount(amountValue);
      if (isNaN(parsedAmount)) {
        result.isValid = false;
        result.errors.push('Invalid amount format');
      }
    }

    // Validate description
    if (!descriptionValue || descriptionValue.trim() === '') {
      result.isValid = false;
      result.errors.push('Description is required');
    } else if (descriptionValue.trim().length > 500) {
      result.warnings.push('Description exceeds 500 characters and will be truncated');
    }

    return result;
  }

  /**
   * Parse date from various formats
   */
  parseDate(dateString) {
    if (!dateString) return null;
    
    const cleanDate = dateString.trim();
    
    // Common date formats
    const formats = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
      /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
      /^\d{1,2}\/\d{1,2}\/\d{4}$/, // M/D/YYYY
      /^\d{1,2}-\d{1,2}-\d{4}$/, // M-D-YYYY
    ];
    
    // Try parsing with Date constructor
    const date = new Date(cleanDate);
    
    if (!isNaN(date.getTime())) {
      // Check if date is reasonable (not too far in past or future)
      const now = new Date();
      const tenYearsAgo = new Date(now.getFullYear() - 10, 0, 1);
      const oneYearFromNow = new Date(now.getFullYear() + 1, 11, 31);
      
      if (date >= tenYearsAgo && date <= oneYearFromNow) {
        return date;
      }
    }
    
    return null;
  }

  /**
   * Parse amount from string
   */
  parseAmount(amountString) {
    if (!amountString) return NaN;
    
    // Remove currency symbols and whitespace
    let cleanAmount = amountString.toString().trim()
      .replace(/[$€£¥₹]/g, '') // Remove currency symbols
      .replace(/,/g, '') // Remove thousands separators
      .replace(/\s/g, ''); // Remove whitespace
    
    // Handle parentheses for negative amounts
    if (cleanAmount.startsWith('(') && cleanAmount.endsWith(')')) {
      cleanAmount = '-' + cleanAmount.slice(1, -1);
    }
    
    const amount = parseFloat(cleanAmount);
    
    // Validate reasonable amount range
    if (!isNaN(amount) && Math.abs(amount) <= 1000000) { // Max $1M per transaction
      return amount;
    }
    
    return NaN;
  }

  /**
   * Process CSV file and extract transactions (with automatic batch processing for large files)
   */
  async processCSVFile(filePath, userId, format, options = {}) {
    // First, check if we should use batch processing
    const validation = await this.validateCSVFile(filePath);
    
    if (validation.totalRows > this.largeBatchThreshold) {
      logger.info('Using batch processing for large file', {
        userId,
        totalRows: validation.totalRows,
        threshold: this.largeBatchThreshold
      });
      
      // Use batch processor for large files
      const batchProcessor = require('./batchProcessor');
      return await batchProcessor.processLargeCSV(filePath, userId, format, options);
    }
    
    // Use standard processing for smaller files
    return this.processCSVFileStandard(filePath, userId, format);
  }

  /**
   * Standard CSV processing for smaller files
   */
  async processCSVFileStandard(filePath, userId, format) {
    return new Promise((resolve, reject) => {
      const results = {
        success: false,
        processedCount: 0,
        errorCount: 0,
        errors: [],
        transactions: [],
        importBatch: encryptionService.generateToken(16)
      };

      const transactions = [];
      let rowCount = 0;

      fs.createReadStream(filePath)
        .pipe(csv({
          skipEmptyLines: true,
          skipLinesWithError: true
        }))
        .on('data', (row) => {
          rowCount++;
          
          try {
            const transaction = this.parseTransactionRow(row, format, userId, results.importBatch);
            
            if (transaction) {
              transactions.push(transaction);
              results.processedCount++;
            } else {
              results.errorCount++;
              results.errors.push(`Row ${rowCount}: Failed to parse transaction`);
            }
          } catch (error) {
            results.errorCount++;
            results.errors.push(`Row ${rowCount}: ${error.message}`);
          }
        })
        .on('end', async () => {
          try {
            if (transactions.length > 0) {
              // Save transactions to database
              const savedTransactions = await Transaction.insertMany(transactions);
              results.transactions = savedTransactions;
              results.success = true;
              
              logger.info('CSV processing completed', {
                userId,
                processedCount: results.processedCount,
                errorCount: results.errorCount,
                importBatch: results.importBatch
              });
            }
            
            resolve(results);
          } catch (error) {
            logger.error('Database save error:', error);
            results.errors.push(`Database error: ${error.message}`);
            resolve(results);
          }
        })
        .on('error', (error) => {
          logger.error('CSV processing error:', error);
          results.errors.push(`Processing error: ${error.message}`);
          resolve(results);
        });
    });
  }

  /**
   * Parse individual transaction row into Transaction model format
   */
  parseTransactionRow(row, format, userId, importBatch) {
    const rowArray = Object.values(row);
    
    const dateValue = rowArray[format.mapping.date];
    const amountValue = rowArray[format.mapping.amount];
    const descriptionValue = rowArray[format.mapping.description];

    const parsedDate = this.parseDate(dateValue);
    const parsedAmount = this.parseAmount(amountValue);
    
    if (!parsedDate || isNaN(parsedAmount) || !descriptionValue) {
      return null;
    }

    return {
      userId: userId,
      date: parsedDate,
      amount: parsedAmount,
      description: descriptionValue.trim().substring(0, 500), // Truncate if too long
      rawData: {
        originalDescription: descriptionValue.trim(),
        source: 'csv_upload',
        importBatch: importBatch
      }
      // Note: category field is omitted to avoid MongoDB validation error
      // It will be added later by ML categorization service
    };
  }

  /**
   * Clean up uploaded file
   */
  async cleanupFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info('Cleaned up uploaded file', { filePath });
      }
    } catch (error) {
      logger.error('File cleanup error:', error);
    }
  }

  /**
   * Get processing statistics for user
   */
  async getProcessingStats(userId, importBatch = null) {
    try {
      const query = { userId };
      if (importBatch) {
        query['rawData.importBatch'] = importBatch;
      }

      const stats = await Transaction.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$rawData.importBatch',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            avgAmount: { $avg: '$amount' },
            minDate: { $min: '$date' },
            maxDate: { $max: '$date' }
          }
        },
        { $sort: { minDate: -1 } }
      ]);

      return stats;
    } catch (error) {
      logger.error('Error getting processing stats:', error);
      throw error;
    }
  }

  /**
   * Utility function to compare arrays
   */
  arraysEqual(a, b) {
    return a.length === b.length && a.every((val, index) => val === b[index]);
  }
}

module.exports = new CSVService();