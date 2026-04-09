const mongoose = require('mongoose');
const { User, Transaction, Prediction, FinancialStress, MLModelMetadata } = require('./src/models');
const database = require('./src/config/database');
const { logger } = require('./src/config/logger');

async function validateDataLayer() {
  try {
    console.log('🔍 Starting data layer validation...');
    
    // Connect to database
    await database.connect();
    console.log('✅ Database connection successful');
    
    // Test User model
    console.log('\n📝 Testing User model...');
    const testUser = new User({
      email: 'test@finsense.com',
      passwordHash: 'TestPassword123!',
      profile: {
        firstName: 'Test',
        lastName: 'User',
        preferences: {
          currency: 'USD',
          alertThreshold: 0.8
        }
      }
    });
    
    await testUser.save();
    console.log('✅ User model validation passed');
    
    // Test password hashing
    const isPasswordValid = await testUser.comparePassword('TestPassword123!');
    if (!isPasswordValid) {
      throw new Error('Password hashing/comparison failed');
    }
    console.log('✅ Password hashing validation passed');
    
    // Test Transaction model
    console.log('\n💰 Testing Transaction model...');
    const testTransaction = new Transaction({
      userId: testUser._id,
      date: new Date(),
      amount: -85.50,
      description: 'Test Transaction',
      category: {
        name: 'Test Category',
        confidence: 0.9,
        isUserVerified: false
      },
      rawData: {
        originalDescription: 'Test Transaction',
        source: 'manual_entry'
      }
    });
    
    await testTransaction.save();
    console.log('✅ Transaction model validation passed');
    
    // Test transaction methods
    testTransaction.categorize('Groceries', 0.95);
    if (testTransaction.category.name !== 'Groceries' || testTransaction.category.confidence !== 0.95) {
      throw new Error('Transaction categorize method failed');
    }
    console.log('✅ Transaction methods validation passed');
    
    // Test Prediction model
    console.log('\n🔮 Testing Prediction model...');
    const testPrediction = new Prediction({
      userId: testUser._id,
      predictionDate: new Date(),
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      predictionType: 'balance',
      predictedBalance: 2500.00,
      confidenceInterval: {
        lower: 2200.00,
        upper: 2800.00,
        level: 0.95
      },
      modelVersion: '1.0.0',
      accuracy: {
        mae: 125.50,
        rmse: 180.25,
        r2Score: 0.85
      },
      features: {
        historicalPeriod: 6,
        seasonality: true,
        trendStrength: 0.7
      }
    });
    
    await testPrediction.save();
    console.log('✅ Prediction model validation passed');
    
    // Test FinancialStress model
    console.log('\n😰 Testing FinancialStress model...');
    const testStress = new FinancialStress({
      userId: testUser._id,
      score: 0.35,
      level: 'moderate',
      factors: [{
        category: 'spending_trend',
        impact: 0.4,
        description: 'Test factor',
        severity: 'medium'
      }],
      recommendations: [{
        type: 'reduce_spending',
        priority: 'medium',
        title: 'Test Recommendation',
        description: 'Test recommendation description',
        potentialImpact: 0.2,
        actionItems: ['Test action item']
      }],
      basedOnPeriod: {
        startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        transactionCount: 50
      },
      metrics: {
        averageMonthlySpending: 1800.00,
        averageMonthlyIncome: 3500.00,
        spendingVolatility: 0.25,
        incomeVolatility: 0.05,
        savingsRate: 0.48,
        burnRate: 0.52
      }
    });
    
    await testStress.save();
    console.log('✅ FinancialStress model validation passed');
    
    // Test MLModelMetadata model
    console.log('\n🤖 Testing MLModelMetadata model...');
    const testModel = new MLModelMetadata({
      modelType: 'prediction',
      version: '1.0.0',
      name: 'Test Model',
      description: 'Test ML model',
      algorithm: 'lstm',
      framework: 'tensorflow',
      trainingDate: new Date(),
      trainingDuration: 1800,
      datasetInfo: {
        size: 1000,
        features: 10,
        timeRange: {
          start: new Date('2023-01-01'),
          end: new Date('2024-01-01')
        },
        preprocessing: [{
          step: 'normalization',
          parameters: { method: 'minmax' }
        }]
      },
      parameters: {
        layers: [
          { type: 'lstm', units: 50 },
          { type: 'dense', units: 1 }
        ],
        optimizer: 'adam',
        learning_rate: 0.001
      },
      performance: {
        training: {
          mae: 95.50,
          rmse: 135.25,
          r2Score: 0.92
        },
        validation: {
          mae: 125.75,
          rmse: 180.50,
          r2Score: 0.85
        }
      },
      deployment: {
        status: 'testing',
        replicas: 1
      },
      files: {
        modelPath: './models/test_model.h5',
        size: 1024000,
        checksum: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890'
      }
    });
    
    await testModel.save();
    console.log('✅ MLModelMetadata model validation passed');
    
    // Test database queries
    console.log('\n🔍 Testing database queries...');
    
    // Test user queries
    const foundUser = await User.findByEmail('test@finsense.com');
    if (!foundUser || foundUser._id.toString() !== testUser._id.toString()) {
      throw new Error('User query failed');
    }
    
    // Test transaction queries
    const userTransactions = await Transaction.find({ userId: testUser._id });
    if (userTransactions.length === 0) {
      throw new Error('Transaction query failed');
    }
    
    // Test aggregation queries
    const spendingSummary = await Transaction.getSpendingSummary(
      testUser._id,
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      new Date()
    );
    
    console.log('✅ Database queries validation passed');
    
    // Test model relationships
    console.log('\n🔗 Testing model relationships...');
    const transactionWithUser = await Transaction.findById(testTransaction._id).populate('userId');
    if (!transactionWithUser.userId || transactionWithUser.userId.email !== 'test@finsense.com') {
      throw new Error('Model relationship failed');
    }
    console.log('✅ Model relationships validation passed');
    
    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await User.deleteMany({ email: 'test@finsense.com' });
    await Transaction.deleteMany({ userId: testUser._id });
    await Prediction.deleteMany({ userId: testUser._id });
    await FinancialStress.deleteMany({ userId: testUser._id });
    await MLModelMetadata.deleteMany({ name: 'Test Model' });
    console.log('✅ Test data cleanup completed');
    
    console.log('\n🎉 All data layer validations passed successfully!');
    console.log('\n📊 Validation Summary:');
    console.log('  ✅ Database connection');
    console.log('  ✅ User model (creation, validation, methods)');
    console.log('  ✅ Transaction model (creation, validation, methods)');
    console.log('  ✅ Prediction model (creation, validation)');
    console.log('  ✅ FinancialStress model (creation, validation)');
    console.log('  ✅ MLModelMetadata model (creation, validation)');
    console.log('  ✅ Database queries and aggregations');
    console.log('  ✅ Model relationships and population');
    console.log('  ✅ Data cleanup');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Data layer validation failed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  } finally {
    // Disconnect from database
    await database.disconnect();
    console.log('\n🔌 Database disconnected');
  }
}

// Run validation if this file is executed directly
if (require.main === module) {
  validateDataLayer()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Validation script error:', error);
      process.exit(1);
    });
}

module.exports = validateDataLayer;