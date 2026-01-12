# ML Model Storage and Versioning System

This document describes the ML model storage and versioning system implemented for the FinSense application.

## Overview

The model storage system provides:
- **Model Persistence**: Save and load ML models using joblib
- **Version Management**: Semantic versioning with rollback capabilities
- **Metadata Tracking**: Comprehensive model metadata stored in MongoDB
- **Performance Monitoring**: Track model performance and detect drift
- **Deployment Management**: Control model deployment status and rollbacks

## Architecture

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   ML Service        │    │   Node.js Backend   │    │     MongoDB         │
│   (Python/Flask)    │    │   (Express.js)      │    │                     │
├─────────────────────┤    ├─────────────────────┤    ├─────────────────────┤
│ ModelStorageService │◄──►│ ML Models API       │◄──►│ MLModelMetadata     │
│ ModelVersionManager │    │ /api/ml/models/*    │    │ Collection          │
│ Model Files (joblib)│    │                     │    │                     │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

## Components

### 1. ModelStorageService (`src/services/model_storage.py`)

Main service for model persistence operations:

```python
from src.services.model_storage import ModelStorageService, ModelMetadata

# Initialize service
storage = ModelStorageService(
    models_dir="models",
    backend_url="http://localhost:5000"
)

# Save a model
model_id = storage.save_model(
    model=trained_model,
    metadata=model_metadata,
    scaler=data_scaler,
    config=model_config
)

# Load a model
model, scaler, config, metadata = storage.load_model(
    model_type="prediction",
    version="1.2.3"
)
```

**Key Features:**
- Automatic file organization by model type and version
- Checksum verification for model integrity
- Support for associated files (scalers, configs)
- Integration with backend API for metadata storage

### 2. ModelVersionManager (`src/utils/model_versioning.py`)

Handles semantic versioning and model lifecycle:

```python
from src.utils.model_versioning import ModelVersionManager

version_manager = ModelVersionManager(storage)

# Get next version
next_version = version_manager.get_next_version("prediction", "minor")

# Check if retraining is needed
should_retrain, reasons = version_manager.should_retrain_model(
    "prediction", 
    max_age_days=30,
    min_performance_threshold=0.8
)

# Compare model performance
comparison = version_manager.compare_model_performance(
    "prediction", "1.0.0", "1.1.0"
)
```

**Key Features:**
- Semantic versioning (major.minor.patch)
- Automated retraining recommendations
- Performance comparison between versions
- Model validation before deployment
- Rollback candidate identification

### 3. Backend API (`backend/src/routes/ml-models.js`)

REST API for model metadata management:

```javascript
// Create model metadata
POST /api/ml/models/metadata

// Get specific model
GET /api/ml/models/metadata/:modelType/:version

// List models
GET /api/ml/models/metadata?modelType=prediction&status=production

// Update deployment status
PATCH /api/ml/models/metadata/:id/deployment

// Get performance history
GET /api/ml/models/metadata/:modelType/performance
```

### 4. ML Service Endpoints (`ml-service/app.py`)

Flask endpoints for model operations:

```python
# List models
GET /ml/models?type=prediction

# Get model info
GET /ml/models/prediction/1.0.0

# Rollback model
POST /ml/models/prediction/rollback
{
  "version": "1.0.0"
}

# Validate model
POST /ml/models/prediction/validate
{
  "version": "1.1.0",
  "criteria": {
    "min_r2_score": 0.8
  }
}
```

## File Structure

```
ml-service/
├── models/                     # Model storage directory
│   ├── clustering/            # Clustering models
│   │   ├── v1.0.0/
│   │   │   ├── model.joblib
│   │   │   ├── scaler.joblib
│   │   │   └── config.joblib
│   │   └── v1.1.0/
│   ├── prediction/            # Prediction models
│   └── stress/               # Stress calculation models
├── src/
│   ├── services/
│   │   └── model_storage.py   # Main storage service
│   └── utils/
│       └── model_versioning.py # Version management
└── app.py                     # Flask application
```

## Model Metadata Schema

Models are tracked with comprehensive metadata:

```javascript
{
  modelType: "prediction",
  version: "1.2.3",
  name: "LSTM Financial Predictor",
  algorithm: "lstm",
  framework: "tensorflow",
  trainingDate: "2024-01-12T10:30:00Z",
  trainingDuration: 1800.5,
  datasetInfo: {
    size: 10000,
    features: 15,
    timeRange: {
      start: "2023-01-01T00:00:00Z",
      end: "2023-12-31T23:59:59Z"
    }
  },
  parameters: {
    epochs: 100,
    batch_size: 32,
    learning_rate: 0.001
  },
  performance: {
    training: {
      r2Score: 0.92,
      mae: 45.2,
      rmse: 67.8
    },
    validation: {
      r2Score: 0.89,
      mae: 52.1,
      rmse: 73.4
    }
  },
  deployment: {
    status: "production",
    deployedAt: "2024-01-12T12:00:00Z"
  },
  files: {
    modelPath: "prediction/v1.2.3/model.joblib",
    scalerPath: "prediction/v1.2.3/scaler.joblib",
    size: 2048576,
    checksum: "a1b2c3d4..."
  },
  monitoring: {
    predictionCount: 15420,
    averageLatency: 23.5,
    errorRate: 0.02
  }
}
```

## Usage Examples

### Saving a New Model

```python
from datetime import datetime
from src.services.model_storage import ModelStorageService, ModelMetadata

# Train your model
model = train_lstm_model(training_data)
scaler = StandardScaler().fit(training_data)

# Create metadata
metadata = ModelMetadata(
    model_type="prediction",
    version="1.0.0",
    name="LSTM Balance Predictor",
    algorithm="lstm",
    framework="tensorflow",
    training_date=datetime.now(),
    training_duration=1800.0,
    dataset_info={
        "size": len(training_data),
        "features": training_data.shape[1],
        "timeRange": {
            "start": "2023-01-01T00:00:00Z",
            "end": "2023-12-31T23:59:59Z"
        }
    },
    parameters=model.get_config(),
    performance={
        "training": {"r2Score": 0.92, "mae": 45.2},
        "validation": {"r2Score": 0.89, "mae": 52.1}
    },
    deployment={"status": "training"},
    files={}
)

# Save model
storage = ModelStorageService()
model_id = storage.save_model(model, metadata, scaler)
```

### Loading and Using a Model

```python
# Load latest production model
model, scaler, config, metadata = storage.load_model("prediction")

# Make predictions
scaled_data = scaler.transform(new_data)
predictions = model.predict(scaled_data)
```

### Model Rollback

```python
# Get rollback candidates
candidates = version_manager.get_rollback_candidates("prediction")

# Rollback to previous version
success = storage.rollback_model("prediction", "1.1.0")
```

### Automated Retraining Check

```python
# Check if model needs retraining
should_retrain, reasons = version_manager.should_retrain_model(
    "prediction",
    max_age_days=30,
    min_performance_threshold=0.8,
    max_error_rate=0.1
)

if should_retrain:
    print(f"Model needs retraining: {', '.join(reasons)}")
    # Trigger retraining process
```

## Configuration

Environment variables for configuration:

```bash
# ML Service
MODELS_DIR=models                    # Directory for model files
BACKEND_URL=http://localhost:5000    # Backend API URL
MODEL_VERSION=1.0.0                  # Default model version

# Backend
MONGODB_URI=mongodb://localhost:27017/finsense
```

## Error Handling

The system includes comprehensive error handling:

- **File System Errors**: Automatic cleanup on save failures
- **Network Errors**: Retry logic for backend communication
- **Validation Errors**: Detailed error messages for invalid data
- **Integrity Errors**: Checksum verification for model files

## Monitoring and Logging

All operations are logged with appropriate levels:

```python
logger.info(f"Saved model {model_type} v{version}")
logger.warning(f"Model integrity check failed for {model_path}")
logger.error(f"Failed to save model: {str(e)}")
```

## Testing

Run the demo script to test functionality:

```bash
cd ml-service
python src/utils/model_demo.py
```

Or run the basic validation:

```bash
python test_model_storage.py
```

## Integration with Requirements

This implementation satisfies **Requirement 5.5**: "THE System SHALL maintain model versioning for rollback capabilities"

**Key Features Implemented:**
- ✅ Model persistence using joblib
- ✅ Version management and rollback
- ✅ Model metadata tracking
- ✅ Performance monitoring
- ✅ Deployment status management
- ✅ Automated retraining recommendations
- ✅ Model validation before deployment

## Next Steps

1. **Integration Testing**: Test with actual ML models
2. **Performance Optimization**: Optimize for large model files
3. **Backup Strategy**: Implement model backup to cloud storage
4. **A/B Testing**: Add support for A/B testing between model versions
5. **Automated Deployment**: Integrate with CI/CD pipeline