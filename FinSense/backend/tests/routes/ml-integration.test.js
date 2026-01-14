/**
 * ML Integration Routes Tests
 */

const request = require('supertest');
const app = require('../../server');
const { User } = require('../../src/models');
const jwt = require('jsonwebtoken');

// Mock axios to avoid actual ML service calls during tests
jest.mock('axios');
const axios = require('axios');

describe('ML Integration Routes', () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    // Create test user
    const testUser = new User({
      email: 'test@example.com',
      passwordHash: 'hashedpassword',
      firstName: 'Test',
      lastName: 'User'
    });
    await testUser.save();
    userId = testUser._id;

    // Generate auth token
    authToken = jwt.sign(
      { userId: testUser._id },
      process.env.JWT_SECRET || 'test-secret'
    );
  });

  beforeEach(() => {
    // Reset axios mocks
    jest.clearAllMocks();
    
    // Mock axios.create to return a mock client
    axios.create.mockReturnValue({
      post: jest.fn(),
      get: jest.fn(),
      put: jest.fn()
    });
  });

  describe('POST /api/ml/categorize', () => {
    it('should categorize transactions successfully', async () => {
      const mockMLResponse = {
        data: {
          results: [
            {
              transaction_id: 'tx1',
              category: 'groceries',
              confidence: 0.85,
              cluster_id: 1,
              needs_review: false
            }
          ],
          model_version: '1.0.0',
          processing_time: 0.5,
          total_processed: 1,
          clustering_stats: {
            algorithm: 'kmeans',
            n_clusters: 5,
            avg_confidence: 0.85
          }
        }
      };

      const mockClient = axios.create();
      mockClient.post.mockResolvedValue(mockMLResponse);

      const transactions = [
        {
          id: 'tx1',
          date: '2024-01-15T10:00:00Z',
          amount: -50.25,
          description: 'Grocery Store Purchase'
        }
      ];

      const response = await request(app)
        .post('/api/ml/categorize')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ transactions })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.results).toHaveLength(1);
      expect(response.body.results[0].category).toBe('groceries');
      expect(response.body.metadata.model_version).toBe('1.0.0');
    });

    it('should require authentication', async () => {
      const transactions = [
        {
          id: 'tx1',
          date: '2024-01-15T10:00:00Z',
          amount: -50.25,
          description: 'Test Transaction'
        }
      ];

      await request(app)
        .post('/api/ml/categorize')
        .send({ transactions })
        .expect(401);
    });

    it('should validate transaction data', async () => {
      const invalidTransactions = [
        {
          id: 'tx1',
          // Missing required fields
          amount: -50.25
        }
      ];

      await request(app)
        .post('/api/ml/categorize')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ transactions: invalidTransactions })
        .expect(400);
    });
  });

  describe('POST /api/ml/predict', () => {
    it('should generate predictions successfully', async () => {
      const mockMLResponse = {
        data: {
          predictions: [
            {
              date: '2024-02-15T00:00:00Z',
              predicted_balance: 1250.75,
              day_ahead: 1,
              confidence_lower_95: 1200.00,
              confidence_upper_95: 1300.00
            }
          ],
          model_version: '1.0.0',
          model_accuracy: 0.92,
          confidence_intervals: {
            has_confidence_intervals: true,
            confidence_levels: ['80%', '95%']
          },
          preprocessing_stats: {
            input_data_points: 60,
            sequences_generated: 30
          },
          generated_at: '2024-01-15T10:00:00Z'
        }
      };

      const mockClient = axios.create();
      mockClient.post.mockResolvedValue(mockMLResponse);

      const balanceData = Array.from({ length: 60 }, (_, i) => ({
        date: new Date(Date.now() - (59 - i) * 24 * 60 * 60 * 1000).toISOString(),
        balance: 1000 + Math.random() * 500
      }));

      const response = await request(app)
        .post('/api/ml/predict')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          balance_data: balanceData,
          prediction_days: 30,
          include_confidence: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.predictions).toHaveLength(1);
      expect(response.body.metadata.model_accuracy).toBe(0.92);
    });

    it('should require minimum data points', async () => {
      const insufficientData = Array.from({ length: 10 }, (_, i) => ({
        date: new Date(Date.now() - (9 - i) * 24 * 60 * 60 * 1000).toISOString(),
        balance: 1000
      }));

      await request(app)
        .post('/api/ml/predict')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ balance_data: insufficientData })
        .expect(400);
    });
  });

  describe('POST /api/ml/stress-score', () => {
    it('should calculate stress score successfully', async () => {
      const mockMLResponse = {
        data: {
          stress_score: 65.5,
          risk_level: 'medium',
          factors: [
            { name: 'balance_projection', score: 70, weight: 0.3 },
            { name: 'spending_trends', score: 60, weight: 0.25 }
          ],
          recommendations: [
            'Consider reducing discretionary spending',
            'Build emergency fund'
          ],
          alerts: [
            {
              id: 'alert1',
              type: 'balance_warning',
              message: 'Balance may drop below $500 in 15 days'
            }
          ],
          calculated_at: '2024-01-15T10:00:00Z'
        }
      };

      const mockClient = axios.create();
      mockClient.post.mockResolvedValue(mockMLResponse);

      const requestData = {
        current_balance: 1200.50,
        predictions: [
          { predicted_balance: 1150.25 },
          { predicted_balance: 1100.00 }
        ],
        transaction_history: [
          {
            id: 'tx1',
            date: '2024-01-14T10:00:00Z',
            amount: -50.25,
            description: 'Grocery Store'
          }
        ]
      };

      const response = await request(app)
        .post('/api/ml/stress-score')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.stress_score).toBe(65.5);
      expect(response.body.risk_level).toBe('medium');
      expect(response.body.factors).toHaveLength(2);
      expect(response.body.recommendations).toHaveLength(2);
    });
  });

  describe('GET /api/ml/dashboard', () => {
    it('should aggregate dashboard data successfully', async () => {
      // Mock multiple ML service responses
      const mockClient = axios.create();
      
      // Mock predictions response
      mockClient.post.mockResolvedValueOnce({
        data: {
          predictions: [
            { date: '2024-02-15T00:00:00Z', predicted_balance: 1250.75 }
          ]
        }
      });

      // Mock stress score response
      mockClient.post.mockResolvedValueOnce({
        data: {
          stress_score: 45.2,
          risk_level: 'low',
          factors: [],
          calculated_at: '2024-01-15T10:00:00Z'
        }
      });

      // Mock alerts response
      mockClient.get.mockResolvedValueOnce({
        data: {
          active_alerts: [],
          total_count: 0
        }
      });

      // Mock recommendations response
      mockClient.get.mockResolvedValueOnce({
        data: {
          recommendations: [],
          total_count: 0
        }
      });

      const response = await request(app)
        .get('/api/ml/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('transactions');
      expect(response.body.data).toHaveProperty('balance_data');
      expect(response.body.data).toHaveProperty('predictions');
      expect(response.body.data).toHaveProperty('stress_score');
      expect(response.body.data).toHaveProperty('alerts');
      expect(response.body.data).toHaveProperty('recommendations');
      expect(response.body.data).toHaveProperty('metadata');
    });
  });

  describe('GET /api/ml/health', () => {
    it('should check ML service health', async () => {
      const mockMLResponse = {
        data: {
          status: 'healthy',
          service: 'finsense-ml-service',
          version: '1.0.0'
        }
      };

      const mockClient = axios.create();
      mockClient.get.mockResolvedValue(mockMLResponse);

      const response = await request(app)
        .get('/api/ml/health')
        .expect(200);

      expect(response.body.ml_service_status).toBe('healthy');
      expect(response.body.ml_service_data.status).toBe('healthy');
    });

    it('should handle ML service unavailability', async () => {
      const mockClient = axios.create();
      mockClient.get.mockRejectedValue(new Error('Connection refused'));

      const response = await request(app)
        .get('/api/ml/health')
        .expect(503);

      expect(response.body.ml_service_status).toBe('unhealthy');
    });
  });
});