# FinSense - AI-Powered Wealth Intelligence

FinSense is an intelligent financial health prediction system that uses machine learning to automatically categorize transactions, predict future financial outcomes, and provide actionable insights through an intuitive dashboard.

## Features

- **Automated Transaction Categorization**: ML-powered clustering eliminates manual transaction tagging
- **Financial Health Prediction**: Time-series forecasting predicts 30-day balance projections
- **Intelligent Alerts**: Proactive notifications before overspending occurs
- **Real-time Dashboard**: Interactive visualizations with historical data and future projections
- **Data Security**: Enterprise-grade encryption and privacy protection

## Tech Stack

- **Frontend**: React.js + TypeScript + Tailwind CSS + Recharts
- **Backend**: Node.js + Express.js + MongoDB
- **ML Services**: Python + Flask + scikit-learn + TensorFlow
- **Infrastructure**: Docker + Docker Compose

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- Docker and Docker Compose
- MongoDB (or use Docker)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd finsense
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
- **Backend API**: http://localhost:5000
- **ML Service**: http://localhost:5001
- **MongoDB**: mongodb://localhost:27017

## Project Structure

```
finsense/
├── backend/                 # Node.js/Express API
│   ├── src/
│   │   ├── config/         # Database and logging configuration
│   │   ├── models/         # MongoDB models
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Custom middleware
│   │   └── services/       # Business logic
│   └── tests/              # Backend tests
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   └── utils/          # Utility functions
│   └── tests/              # Frontend tests
├── ml-service/             # Python ML service
│   ├── src/
│   │   ├── models/         # ML models
│   │   ├── services/       # ML services
│   │   └── utils/          # ML utilities
│   └── tests/              # ML service tests
└── docker-compose.yml      # Docker configuration
```

## Development

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

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/transactions/upload` - CSV file upload
- `GET /api/transactions` - Retrieve transactions
- `POST /api/ml/categorize` - Trigger categorization
- `GET /api/ml/predictions` - Get financial predictions
- `GET /api/dashboard/summary` - Dashboard data

### ML Service Endpoints

- `POST /ml/categorize` - Transaction categorization
- `POST /ml/predict` - Financial predictions
- `POST /ml/stress-score` - Calculate financial stress
- `POST /ml/retrain` - Model retraining

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see LICENSE file for details