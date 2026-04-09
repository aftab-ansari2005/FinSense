const csvService = require('../../src/services/csvService');
const fs = require('fs');
const path = require('path');
const { User, Transaction } = require('../../src/models');

describe('CSV Service', () => {
  let testUser;
  const testFilesDir = path.join(__dirname, '../fixtures');

  beforeAll(() => {
    // Create test fixtures directory
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true });
    }
  });

  beforeEach(async () => {
    await Transaction.deleteMany({});
    await User.deleteMany({});
    
    testUser = new User({
      email: 'test@example.com',
      passwordHash: 'TestPassword123!'
    });
    await testUser.save();
  });

  afterAll(() => {
    // Clean up test files
    if (fs.existsSync(testFilesDir)) {
      fs.rmSync(testFilesDir, { recursive: true, force: true });
    }
  });

  describe('CSV Format Detection', () => {
    test('should detect standard format', () => {
      const headers = ['date', 'amount', 'description'];
      const format = csvService.detectCSVFormat(headers);
      
      expect(format).toBeDefined();
      expect(format.name).toBe('standard');
      expect(format.mapping.date).toBe(0);
      expect(format.mapping.amount).toBe(1);
      expect(format.mapping.description).toBe(2);
    });

    test('should detect alternative format', () => {
      const headers = ['date', 'description', 'amount'];
      const format = csvService.detectCSVFormat(headers);
      
      expect(format).toBeDefined();
      expect(format.name).toBe('alternative1');
      expect(format.mapping.date).toBe(0);
      expect(format.mapping.description).toBe(1);
      expect(format.mapping.amount).toBe(2);
    });

    test('should detect verbose format', () => {
      const headers = ['transaction_date', 'transaction_amount', 'transaction_description'];
      const format = csvService.detectCSVFormat(headers);
      
      expect(format).toBeDefined();
      expect(format.name).toBe('verbose');
    });

    test('should return null for invalid format', () => {
      const headers = ['invalid', 'headers', 'format'];
      const format = csvService.detectCSVFormat(headers);
      
      expect(format).toBeNull();
    });
  });

  describe('Date Parsing', () => {
    test('should parse various date formats', () => {
      const dates = [
        '2024-01-15',
        '01/15/2024',
        '01-15-2024',
        '1/15/2024',
        '1-15-2024'
      ];

      dates.forEach(dateString => {
        const parsed = csvService.parseDate(dateString);
        expect(parsed).toBeInstanceOf(Date);
        expect(parsed.getFullYear()).toBe(2024);
        expect(parsed.getMonth()).toBe(0); // January
        expect(parsed.getDate()).toBe(15);
      });
    });

    test('should return null for invalid dates', () => {
      const invalidDates = [
        'invalid-date',
        '2024-13-01', // Invalid month
        '2024-01-32', // Invalid day
        '1900-01-01', // Too old
        '2030-01-01'  // Too far in future
      ];

      invalidDates.forEach(dateString => {
        const parsed = csvService.parseDate(dateString);
        expect(parsed).toBeNull();
      });
    });
  });

  describe('Amount Parsing', () => {
    test('should parse various amount formats', () => {
      const amounts = [
        { input: '100.50', expected: 100.50 },
        { input: '-100.50', expected: -100.50 },
        { input: '$100.50', expected: 100.50 },
        { input: '(100.50)', expected: -100.50 },
        { input: '1,000.50', expected: 1000.50 },
        { input: '€100.50', expected: 100.50 }
      ];

      amounts.forEach(({ input, expected }) => {
        const parsed = csvService.parseAmount(input);
        expect(parsed).toBe(expected);
      });
    });

    test('should return NaN for invalid amounts', () => {
      const invalidAmounts = [
        'invalid',
        'abc123',
        '1000000.01', // Too large
        ''
      ];

      invalidAmounts.forEach(amountString => {
        const parsed = csvService.parseAmount(amountString);
        expect(parsed).toBeNaN();
      });
    });
  });

  describe('Transaction Row Validation', () => {
    const validFormat = {
      name: 'standard',
      mapping: { date: 0, amount: 1, description: 2 }
    };

    test('should validate valid transaction row', () => {
      const row = {
        '0': '2024-01-15',
        '1': '-100.50',
        '2': 'Grocery Store'
      };

      const validation = csvService.validateTransactionRow(row, validFormat);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should detect missing required fields', () => {
      const row = {
        '0': '2024-01-15',
        '1': '', // Missing amount
        '2': 'Grocery Store'
      };

      const validation = csvService.validateTransactionRow(row, validFormat);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Amount is required');
    });

    test('should detect invalid data types', () => {
      const row = {
        '0': 'invalid-date',
        '1': 'invalid-amount',
        '2': 'Grocery Store'
      };

      const validation = csvService.validateTransactionRow(row, validFormat);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid date format');
      expect(validation.errors).toContain('Invalid amount format');
    });
  });

  describe('CSV File Validation', () => {
    test('should validate valid CSV file', async () => {
      // Create test CSV file
      const csvContent = 'date,amount,description\n2024-01-15,-100.50,Grocery Store\n2024-01-14,-45.00,Gas Station';
      const testFile = path.join(testFilesDir, 'valid.csv');
      fs.writeFileSync(testFile, csvContent);

      const validation = await csvService.validateCSVFile(testFile);
      
      expect(validation.isValid).toBe(true);
      expect(validation.detectedFormat).toBeDefined();
      expect(validation.totalRows).toBe(2);
      expect(validation.errors).toHaveLength(0);

      // Clean up
      fs.unlinkSync(testFile);
    });

    test('should detect invalid CSV format', async () => {
      // Create invalid CSV file
      const csvContent = 'invalid,headers,format\ndata1,data2,data3';
      const testFile = path.join(testFilesDir, 'invalid.csv');
      fs.writeFileSync(testFile, csvContent);

      const validation = await csvService.validateCSVFile(testFile);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);

      // Clean up
      fs.unlinkSync(testFile);
    });

    test('should detect empty CSV file', async () => {
      // Create empty CSV file
      const testFile = path.join(testFilesDir, 'empty.csv');
      fs.writeFileSync(testFile, '');

      const validation = await csvService.validateCSVFile(testFile);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('CSV file is empty or contains no valid data');

      // Clean up
      fs.unlinkSync(testFile);
    });
  });

  describe('Transaction Row Parsing', () => {
    const validFormat = {
      name: 'standard',
      mapping: { date: 0, amount: 1, description: 2 }
    };

    test('should parse valid transaction row', () => {
      const row = {
        '0': '2024-01-15',
        '1': '-100.50',
        '2': 'Grocery Store Purchase'
      };

      const transaction = csvService.parseTransactionRow(row, validFormat, testUser._id, 'batch123');
      
      expect(transaction).toBeDefined();
      expect(transaction.userId).toBe(testUser._id);
      expect(transaction.amount).toBe(-100.50);
      expect(transaction.description).toBe('Grocery Store Purchase');
      expect(transaction.rawData.importBatch).toBe('batch123');
      expect(transaction.rawData.source).toBe('csv_upload');
    });

    test('should return null for invalid row', () => {
      const row = {
        '0': 'invalid-date',
        '1': 'invalid-amount',
        '2': 'Description'
      };

      const transaction = csvService.parseTransactionRow(row, validFormat, testUser._id, 'batch123');
      expect(transaction).toBeNull();
    });

    test('should truncate long descriptions', () => {
      const longDescription = 'a'.repeat(600);
      const row = {
        '0': '2024-01-15',
        '1': '-100.50',
        '2': longDescription
      };

      const transaction = csvService.parseTransactionRow(row, validFormat, testUser._id, 'batch123');
      
      expect(transaction.description).toHaveLength(500);
      expect(transaction.rawData.originalDescription).toBe(longDescription);
    });
  });

  describe('Utility Functions', () => {
    test('should compare arrays correctly', () => {
      expect(csvService.arraysEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(csvService.arraysEqual([1, 2, 3], [3, 2, 1])).toBe(false);
      expect(csvService.arraysEqual([1, 2], [1, 2, 3])).toBe(false);
    });
  });
});