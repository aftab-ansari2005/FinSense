/**
 * Validation Script for Prediction Update Scheduler (Task 15.3)
 * 
 * Tests the daily prediction update mechanism with:
 * - Scheduler initialization and control
 * - User prediction updates
 * - Data sufficiency checks
 * - ML service integration
 * - Financial stress calculation
 * - WebSocket broadcasting
 * - Manual trigger functionality
 * - Statistics tracking
 */

const mongoose = require('mongoose');
const { getPredictionUpdateScheduler } = require('./src/services/predictionUpdateScheduler');
const { getRealTimeUpdateService } = require('./src/services/realTimeUpdateService');
const User = require('./src/models/User');
const Transaction = require('./src/models/Transaction');
const Prediction = require('./src/models/Prediction');
const FinancialStress = require('./src/models/FinancialStress');

// Test configuration
const TEST_CONFIG = {
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/finsense-test',
  testUserId: null,
  testEmail: 'prediction-test@example.com'
};

// Test results tracking
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, details = '') {
  results.total++;
  if (passed) {
    results.passed++;
    console.log(`✓ ${name}`);
  } else {
    results.failed++;
    console.log(`✗ ${name}`);
    if (details) console.log(`  Details: ${details}`);
  }
  results.tests.push({ name, passed, details });
}

async function setupTestData() {
  console.log('\n📦 Setting up test data...\n');

  try {
    // Clean up existing test data
    await User.deleteMany({ email: TEST_CONFIG.testEmail });
    await Transaction.deleteMany({ userId: TEST_CONFIG.testUserId });
    await Prediction.deleteMany({ userId: TEST_CONFIG.testUserId });
    await FinancialStress.deleteMany({ userId: TEST_CONFIG.testUserId });

    // Create test user
    const testUser = new User({
      email: TEST_CONFIG.testEmail,
      password: 'hashedpassword123',
      name: 'Prediction Test User',
      isActive: true
    });
    await testUser.save();
    TEST_CONFIG.testUserId = testUser._id.toString();

    // Create transaction history (3 months of data)
    const transactions = [];
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);

    let balance = 5000;
    for (let i = 0; i < 90; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      // Add 2-3 transactions per day
      const txCount = Math.floor(Math.random() * 2) + 2;
      for (let j = 0; j < txCount; j++) {
        const amount = Math.random() > 0.3 
          ? -(Math.random() * 100 + 10) // Expense
          : (Math.random() * 500 + 100); // Income

        transactions.push({
          userId: TEST_CONFIG.testUserId,
          date,
          description: amount > 0 ? 'Income' : 'Expense',
          amount,
          category: amount > 0 ? 'Income' : 'Shopping',
          balance: balance += amount
        });
      }
    }

    await Transaction.insertMany(transactions);

    console.log(`✓ Created test user: ${TEST