const bcrypt = require('bcryptjs');
const { logger } = require('./logger');
const models = require('../models');

/**
 * Seed database with initial data for development/testing
 */
async function seedDatabase() {
  try {
    logger.info('Seeding database with initial data...');
    
    // Check if data already exists
    const userCount = await models.User.countDocuments();
    if (userCount > 0) {
      logger.info('Database already contains data, skipping seed');
      return;
    }
    
    // Create demo user
    const demoUser = new models.User({
      email: 'demo@finsense.com',
      passwordHash: 'DemoPassword123!',
      profile: {
        firstName: 'Demo',
        lastName: 'User',
        preferences: {
          currency: 'USD',
          alertThreshold: 0.8
        }
      },
      emailVerified: true,
      isActive: true
    });
    
    await demoUser.save();
    logger.info('Demo user created');
    
    // Create sample transactions
    const sampleTransactions = [
      {
        userId: demoUser._id,
        date: new Date('2024-01-15'),
        amount: -85.50,
        description: 'Grocery Store - Weekly Shopping',
        category: {
          name: 'Groceries',
          confidence: 0.95,
          isUserVerified: false
        },
        rawData: {
          originalDescription: 'SAFEWAY #1234 GROCERY',
          source: 'csv_upload'
        }
      },
      {
        userId: demoUser._id,
        date: new Date('2024-01-14'),
        amount: -45.00,
        description: 'Gas Station Fill-up',
        category: {
          name: 'Transportation',
          confidence: 0.90,
          isUserVerified: false
        },
        rawData: {
          originalDescription: 'SHELL GAS STATION',
          source: 'csv_upload'
        }
      },
      {
        userId: demoUser._id,
        date: new Date('2024-01-13'),
        amount: 3500.00,
        description: 'Salary Deposit',
        category: {
          name: 'Income',
          confidence: 0.99,
          isUserVerified: false
        },
        rawData: {
          originalDescription: 'PAYROLL DEPOSIT - COMPANY ABC',
          source: 'csv_upload'
        }
      },
      {
        userId: demoUser._id,
        date: new Date('2024-01-12'),
        amount: -1200.00,
        description: 'Monthly Rent Payment',
        category: {
          name: 'Housing',
          confidence: 0.98,
          isUserVerified: true
        },
        rawData: {
          originalDescription: 'RENT PAYMENT - PROPERTY MGMT',
          source: 'csv_upload'
        },
        isRecurring: true,
        recurringPattern: {
          frequency: 'monthly',
          nextDate: new Date('2024-02-12')
        }
      },
      {
        userId: demoUser._id,
        date: new Date('2024-01-11'),
        amount: -25.99,
        description: 'Netflix Subscription',
        category: {
          name: 'Entertainment',
          confidence: 0.92,
          isUserVerified: false
        },
        rawData: {
          originalDescription: 'NETFLIX.COM',
          source: 'csv_upload'
        },
        isRecurring: true,
        recurringPattern: {
          frequency: 'monthly',
          nextDate: new Date('2024-02-11')
        }
      }
    ];
    
    await models.Transaction.insertMany(sampleTransactions);
    logger.info(`Created ${sampleTransactions.length} sample transactions`);
    
    // Create sample prediction
    const samplePrediction = new models.Prediction({
      userId: demoUser._id,
      predictionDate: new Date(),
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      predictionType: 'balance',
      predictedBalance: 2150.75,
      confidenceInterval: {
        lower: 1950.00,
        upper: 2350.50,
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
      },
      categoryBreakdown: [
        { category: 'Groceries', predictedAmount: -340.00, confidence: 0.88 },
        { category: 'Transportation', predictedAmount: -180.00, confidence: 0.82 },
        { category: 'Entertainment', predictedAmount: -75.00, confidence: 0.90 },
        { category: 'Housing', predictedAmount: -1200.00, confidence: 0.95 }
      ]
    });
    
    await samplePrediction.save();
    logger.info('Sample prediction created');
    
    // Create sample financial stress record
    const sampleStress = new models.FinancialStress({
      userId: demoUser._id,
      score: 0.35,
      level: 'moderate',
      factors: [
        {
          category: 'spending_trend',
          impact: 0.4,
          description: 'Spending has increased 15% over the last 3 months',
          severity: 'medium'
        },
        {
          category: 'balance_projection',
          impact: 0.3,
          description: 'Projected balance may fall below comfort threshold',
          severity: 'medium'
        }
      ],
      recommendations: [
        {
          type: 'reduce_spending',
          priority: 'medium',
          title: 'Optimize Entertainment Expenses',
          description: 'Consider reviewing subscription services and entertainment spending',
          potentialImpact: 0.2,
          actionItems: [
            'Review all subscription services',
            'Cancel unused subscriptions',
            'Set monthly entertainment budget'
          ]
        }
      ],
      basedOnPeriod: {
        startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
        endDate: new Date(),
        transactionCount: 45
      },
      metrics: {
        averageMonthlySpending: 1850.00,
        averageMonthlyIncome: 3500.00,
        spendingVolatility: 0.25,
        incomeVolatility: 0.05,
        savingsRate: 0.47,
        burnRate: 0.53
      }
    });
    
    await sampleStress.save();
    logger.info('Sample financial stress record created');
    
    // Create sample ML model metadata
    const sampleModel = new models.MLModelMetadata({
      modelType: 'prediction',
      version: '1.0.0',
      name: 'LSTM Balance Predictor',
      description: 'Long Short-Term Memory network for 30-day balance prediction',
      algorithm: 'lstm',
      framework: 'tensorflow',
      trainingDate: new Date(),
      trainingDuration: 1800, // 30 minutes
      datasetInfo: {
        size: 10000,
        features: 15,
        timeRange: {
          start: new Date('2023-01-01'),
          end: new Date('2024-01-01')
        },
        preprocessing: [
          { step: 'normalization', parameters: { method: 'minmax' } },
          { step: 'sequence_creation', parameters: { lookback: 30 } }
        ]
      },
      parameters: {
        layers: [
          { type: 'lstm', units: 50, return_sequences: true },
          { type: 'dropout', rate: 0.2 },
          { type: 'lstm', units: 50 },
          { type: 'dense', units: 1 }
        ],
        optimizer: 'adam',
        learning_rate: 0.001,
        batch_size: 32,
        epochs: 100
      },
      performance: {
        training: {
          mae: 95.50,
          rmse: 135.25,
          r2Score: 0.92,
          loss: 0.045
        },
        validation: {
          mae: 125.75,
          rmse: 180.50,
          r2Score: 0.85,
          loss: 0.062
        },
        crossValidation: {
          folds: 5,
          meanScore: 0.83,
          stdScore: 0.04
        }
      },
      deployment: {
        status: 'production',
        deployedAt: new Date(),
        endpoint: '/ml/predict',
        replicas: 2
      },
      files: {
        modelPath: './models/lstm_balance_predictor_v1.0.0.h5',
        configPath: './models/lstm_balance_predictor_v1.0.0_config.json',
        scalerPath: './models/lstm_balance_predictor_v1.0.0_scaler.pkl',
        size: 2048576, // 2MB
        checksum: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890'
      },
      tags: ['production', 'lstm', 'balance-prediction']
    });
    
    await sampleModel.save();
    logger.info('Sample ML model metadata created');
    
    logger.info('Database seeding completed successfully');
    
    return {
      user: demoUser,
      transactionCount: sampleTransactions.length,
      prediction: samplePrediction,
      stress: sampleStress,
      model: sampleModel
    };
    
  } catch (error) {
    logger.error('Error seeding database:', error);
    throw error;
  }
}

/**
 * Clear all data from database (useful for testing)
 */
async function clearDatabase() {
  try {
    logger.info('Clearing database...');
    
    await models.User.deleteMany({});
    await models.Transaction.deleteMany({});
    await models.Prediction.deleteMany({});
    await models.FinancialStress.deleteMany({});
    await models.MLModelMetadata.deleteMany({});
    
    logger.info('Database cleared successfully');
  } catch (error) {
    logger.error('Error clearing database:', error);
    throw error;
  }
}

module.exports = {
  seedDatabase,
  clearDatabase
};