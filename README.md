# FinSense - AI-Powered Financial Health Prediction System

FinSense is an intelligent financial health prediction system that uses machine learning to automatically categorize transactions, predict future financial outcomes, and provide actionable insights through an intuitive dashboard.

## 🎯 Key Features

- **Automated Transaction Categorization**: ML-powered clustering eliminates manual transaction tagging
- **Financial Health Prediction**: Time-series LSTM forecasting predicts 30-day balance projections
- **Intelligent Alerts**: Proactive notifications before overspending occurs
- **Real-time Dashboard**: Interactive visualizations with historical data and future projections
- **Data Security**: Enterprise-grade encryption and privacy protection
- **Financial Stress Analysis**: ML-based stress scoring for financial health assessment
- **User Feedback Learning**: Continuous model improvement through user interactions
- **Batch CSV Processing**: Efficient handling of large transaction imports
- **Real-time Updates**: WebSocket integration for live data synchronization

## 🛠 Tech Stack

- **Frontend**: React.js + TypeScript + Tailwind CSS + Recharts
- **Backend**: Node.js + Express.js + MongoDB
- **ML Services**: Python + Flask + scikit-learn + TensorFlow + LSTM
- **Infrastructure**: Docker + Docker Compose
- **Monitoring**: Real-time API monitoring and health checks
- **CI/CD**: GitHub Actions workflows

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- Docker and Docker Compose
- MongoDB (or use Docker)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/aftab-ansari2005/FinSense.git
   cd FinSense
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**
   ```bash
   cp backend/.env.example backend/.env
   cp ml-service/.env.example ml-service/.env
   # Edit the .env files with your configuration
   ```

4. **Start with Docker (Recommended)**
   ```bash
   docker-compose up -d
   ```

   Or start services individually:
   ```bash
   npm run dev
   ```

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **ML Service**: http://localhost:5001
- **MongoDB**: mongodb://localhost:27017

## 📁 Project Structure

```
FinSense/
├── backend/                 # Node.js/Express API
│   ├── src/
│   │   ├── config/         # Database and logging configuration
│   │   ├── models/         # MongoDB models (User, Transaction, Prediction)
│   │   ├── routes/         # API routes (auth, transactions, predictions)
│   │   ├── middleware/     # Authentication, encryption, upload handling
│   │   ├── services/       # Business logic (CSV, batch processing, ML integration)
│   │   └── utils/          # Utilities (encryption, PII sanitization)
│   └── tests/              # Backend tests
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # React components (Dashboard, Upload, Predictions)
│   │   ├── pages/          # Page components (Home, Login, Register)
│   │   ├── services/       # API services (transaction, dashboard, auth)
│   │   ├── contexts/       # React contexts (Auth, Theme)
│   │   └── utils/          # Utility functions
│   └── tests/              # Frontend tests
├── ml-service/             # Python ML service
│   ├── src/
│   │   ├── services/       # ML services (LSTM, clustering, stress calculator)
│   │   ├── utils/          # ML utilities (preprocessing, model versioning)
│   │   └── models/         # Trained ML models
│   └── tests/              # ML service tests
├── docker-compose.yml      # Docker configuration
└── README.md               # This file
```

## 🔧 Development

### Running Tests

```bash
# Run all tests
npm test

# Run specific service tests
npm run test:backend
npm run test:frontend
npm run test:ml
```

### API Documentation

The backend API follows RESTful principles:

**Authentication**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token

**Transactions**
- `POST /api/transactions/upload` - CSV file upload
- `GET /api/transactions` - Retrieve transactions with filtering
- `GET /api/transactions/:id` - Get single transaction
- `POST /api/transactions` - Create manual transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `GET /api/transactions/stats/summary` - Transaction statistics

**ML Services**
- `POST /ml/categorize` - Transaction categorization
- `POST /ml/predict` - Financial predictions
- `POST /ml/stress-score` - Calculate financial stress
- `POST /ml/retrain` - Model retraining
- `GET /ml/health` - Service health check

**Dashboard**
- `GET /api/dashboard/summary` - Dashboard data
- `GET /api/dashboard/predictions` - Prediction data
- `GET /api/dashboard/alerts` - Alert data

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Data Encryption**: AES-256 encryption for sensitive data
- **PII Sanitization**: Automatic removal of personally identifiable information
- **CORS Protection**: Cross-origin resource sharing configuration
- **Rate Limiting**: API rate limiting to prevent abuse
- **Input Validation**: Comprehensive input validation and sanitization

## 📊 ML Models

- **LSTM Prediction Model**: Time-series forecasting for balance predictions
- **Transaction Clustering**: Unsupervised learning for transaction categorization
- **Financial Stress Calculator**: ML-based financial health assessment
- **User Feedback Learning**: Continuous model improvement through user interactions

## 🚢 Deployment

### Docker Deployment

```bash
# Build and run all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Environment Variables

Create `.env` files for each service:

**Backend (.env)**
```
NODE_ENV=production
MONGODB_URI=mongodb://admin:password@mongodb:27017/finsense
ML_SERVICE_URL=http://ml-service:5001
JWT_SECRET=your-secret-key
```

**ML Service (.env)**
```
FLASK_ENV=production
MONGODB_URI=mongodb://admin:password@mongodb:27017/finsense
```

## 📈 Performance Optimization

- Batch processing for large CSV imports
- Connection pooling for database efficiency
- Model caching for ML predictions
- Real-time updates with WebSocket
- Comprehensive monitoring and logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass (`npm test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## 📝 License

MIT License - see LICENSE file for details

## 👨‍💻 Author

**Aftab Ansari**
- GitHub: [@aftab-ansari2005](https://github.com/aftab-ansari2005)
- Email: aftabdtu9818@gmail.com

## 🙏 Acknowledgments

- Built with React, Node.js, and Python
- ML models powered by TensorFlow and scikit-learn
- UI components from Tailwind CSS
- Charts and visualizations with Recharts

## 📞 Support

For issues, questions, or suggestions, please open an issue on GitHub or contact the author.

---

**Last Updated**: March 2026
**Version**: 1.0.0