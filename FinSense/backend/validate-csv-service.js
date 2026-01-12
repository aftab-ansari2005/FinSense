const fs = require('fs');
const path = require('path');
const csvService = require('./src/services/csvService');

async function validateCSVService() {
  try {
    console.log('🔍 Starting CSV service validation...');
    
    // Test CSV format detection
    console.log('\n📋 Testing CSV format detection...');
    
    const standardFormat = csvService.detectCSVFormat(['date', 'amount', 'description']);
    if (!standardFormat || standardFormat.name !== 'standard') {
      throw new Error('Standard format detection failed');
    }
    console.log('✅ Standard format detection passed');
    
    const alternativeFormat = csvService.detectCSVFormat(['date', 'description', 'amount']);
    if (!alternativeFormat || alternativeFormat.name !== 'alternative1') {
      throw new Error('Alternative format detection failed');
    }
    console.log('✅ Alternative format detection passed');
    
    const invalidFormat = csvService.detectCSVFormat(['invalid', 'headers', 'format']);
    if (invalidFormat !== null) {
      throw new Error('Invalid format should return null');
    }
    console.log('✅ Invalid format detection passed');
    
    // Test date parsing
    console.log('\n📅 Testing date parsing...');
    
    const validDates = [
      '2024-01-15',
      '01/15/2024',
      '01-15-2024',
      '1/15/2024'
    ];
    
    validDates.forEach(dateString => {
      const parsed = csvService.parseDate(dateString);
      if (!parsed || !(parsed instanceof Date)) {
        throw new Error(`Date parsing failed for: ${dateString}`);
      }
    });
    console.log('✅ Valid date parsing passed');
    
    const invalidDates = ['invalid-date', '2024-13-01', '1900-01-01'];
    invalidDates.forEach(dateString => {
      const parsed = csvService.parseDate(dateString);
      if (parsed !== null) {
        throw new Error(`Invalid date should return null: ${dateString}`);
      }
    });
    console.log('✅ Invalid date parsing passed');
    
    // Test amount parsing
    console.log('\n💰 Testing amount parsing...');
    
    const validAmounts = [
      { input: '100.50', expected: 100.50 },
      { input: '-100.50', expected: -100.50 },
      { input: '$100.50', expected: 100.50 },
      { input: '(100.50)', expected: -100.50 },
      { input: '1,000.50', expected: 1000.50 }
    ];
    
    validAmounts.forEach(({ input, expected }) => {
      const parsed = csvService.parseAmount(input);
      if (parsed !== expected) {
        throw new Error(`Amount parsing failed for ${input}: expected ${expected}, got ${parsed}`);
      }
    });
    console.log('✅ Valid amount parsing passed');
    
    const invalidAmounts = ['invalid', 'abc123', ''];
    invalidAmounts.forEach(amountString => {
      const parsed = csvService.parseAmount(amountString);
      if (!isNaN(parsed)) {
        throw new Error(`Invalid amount should return NaN: ${amountString}`);
      }
    });
    console.log('✅ Invalid amount parsing passed');
    
    // Test transaction row validation
    console.log('\n📝 Testing transaction row validation...');
    
    const validFormat = {
      name: 'standard',
      mapping: { date: 0, amount: 1, description: 2 }
    };
    
    const validRow = {
      '0': '2024-01-15',
      '1': '-100.50',
      '2': 'Grocery Store'
    };
    
    const validation = csvService.validateTransactionRow(validRow, validFormat);
    if (!validation.isValid || validation.errors.length > 0) {
      throw new Error('Valid row validation failed');
    }
    console.log('✅ Valid row validation passed');
    
    const invalidRow = {
      '0': 'invalid-date',
      '1': 'invalid-amount',
      '2': 'Description'
    };
    
    const invalidValidation = csvService.validateTransactionRow(invalidRow, validFormat);
    if (invalidValidation.isValid || invalidValidation.errors.length === 0) {
      throw new Error('Invalid row should fail validation');
    }
    console.log('✅ Invalid row validation passed');
    
    // Test transaction row parsing
    console.log('\n🔄 Testing transaction row parsing...');
    
    const testUserId = '507f1f77bcf86cd799439011'; // Mock ObjectId
    const parsedTransaction = csvService.parseTransactionRow(validRow, validFormat, testUserId, 'batch123');
    
    if (!parsedTransaction) {
      throw new Error('Transaction parsing failed');
    }
    
    if (parsedTransaction.amount !== -100.50) {
      throw new Error('Transaction amount parsing failed');
    }
    
    if (parsedTransaction.description !== 'Grocery Store') {
      throw new Error('Transaction description parsing failed');
    }
    
    if (parsedTransaction.rawData.importBatch !== 'batch123') {
      throw new Error('Transaction batch assignment failed');
    }
    
    console.log('✅ Transaction row parsing passed');
    
    // Test CSV file creation and validation
    console.log('\n📄 Testing CSV file validation...');
    
    // Create a temporary test CSV file
    const testDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir);
    }
    
    const testFile = path.join(testDir, 'test.csv');
    const csvContent = 'date,amount,description\n2024-01-15,-100.50,Grocery Store\n2024-01-14,-45.00,Gas Station';
    fs.writeFileSync(testFile, csvContent);
    
    const fileValidation = await csvService.validateCSVFile(testFile);
    
    if (!fileValidation.isValid) {
      throw new Error(`CSV file validation failed: ${fileValidation.errors.join(', ')}`);
    }
    
    if (fileValidation.totalRows !== 2) {
      throw new Error(`Expected 2 rows, got ${fileValidation.totalRows}`);
    }
    
    if (!fileValidation.detectedFormat) {
      throw new Error('Format detection failed for valid CSV');
    }
    
    console.log('✅ CSV file validation passed');
    
    // Test utility functions
    console.log('\n🔧 Testing utility functions...');
    
    if (!csvService.arraysEqual([1, 2, 3], [1, 2, 3])) {
      throw new Error('Array equality check failed for equal arrays');
    }
    
    if (csvService.arraysEqual([1, 2, 3], [3, 2, 1])) {
      throw new Error('Array equality check failed for different arrays');
    }
    
    console.log('✅ Utility functions passed');
    
    // Clean up
    fs.unlinkSync(testFile);
    fs.rmdirSync(testDir);
    console.log('✅ Test files cleaned up');
    
    console.log('\n🎉 All CSV service validations passed successfully!');
    console.log('\n📊 Validation Summary:');
    console.log('  ✅ CSV format detection (standard, alternative, invalid)');
    console.log('  ✅ Date parsing (valid and invalid formats)');
    console.log('  ✅ Amount parsing (various formats and currencies)');
    console.log('  ✅ Transaction row validation');
    console.log('  ✅ Transaction row parsing');
    console.log('  ✅ CSV file validation');
    console.log('  ✅ Utility functions');
    console.log('  ✅ File cleanup');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ CSV service validation failed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run validation if this file is executed directly
if (require.main === module) {
  validateCSVService()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Validation script error:', error);
      process.exit(1);
    });
}

module.exports = validateCSVService;