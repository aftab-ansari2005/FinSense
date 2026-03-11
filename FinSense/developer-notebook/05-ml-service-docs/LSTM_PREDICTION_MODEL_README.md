# LSTM Prediction Model System

## Overview

The LSTM Prediction Model System is a sophisticated neural network-based component of the FinSense ML service that provides accurate financial balance forecasting using Long Short-Term Memory (LSTM) networks. This system is specifically designed for 30-day balance prediction with comprehensive uncertainty quantification and model performance tracking.

## Key Features

### 1. Advanced LSTM Architecture
- **Multi-layer LSTM**: Configurable LSTM layers with customizable units
- **Bidirectional Support**: Optional bidirectional LSTM for enhanced pattern recognition
- **Regularization**: L1/L2 regularization and dropout for overfitting prevention
- **Batch Normalization**: Optional batch normalization for training stability

### 2. Comprehensive Training Pipeline
- **Automated Training**: Complete training pipeline with validation and early stopping
- **Multiple Optimizers**: Support for Adam, RMSprop, and other optimizers
- **Callback System**: Early stopping, learning rate reduction, and model checkpointing
- **Performance Tracking**: Detailed training and validation metrics

### 3. Uncertainty Quantification
- **Confidence Intervals**: Monte Carlo dropout for prediction uncertainty
- **Multiple Confidence Levels**: 80% and 95% confidence intervals
- **Model Accuracy Metrics**: Comprehensive evaluation metrics (MAE, MAPE, R²)

### 4. Production-Ready Features
- **Model Persistence**: Save and load complete models with metadata
- **Preprocessing Integration**: Seamless integration with time series preprocessing
- **Scalable Architecture**: Designed for production deployment
- **Comprehensive Logging**: Detailed logging for monitoring and debugging

## Architecture

### Core Components

#### LSTMPredictionModel
The main prediction model class that orchestrates all neural network operations:

```python
from src.services.lstm_prediction_model import LSTMPredictionModel, LSTMConfig

# Initialize with configuration
config = LSTMConfig(
    lstm_units=[64, 32],
    dense_units=[32, 16],
    dropout_rate=0.2,
    learning_rate=0.001,
    epochs=100
)

model = LSTMPredictionModel(config)

# Train the model
results = model.fit(X_train, y_train, X_val, y_val)

# Make predictions
prediction_result = model.predict(X_test, user_id='user_123')
```

#### LSTMConfig
Configuration class for customizing model architecture and training:

```python
@dataclass
class LSTMConfig:
    # Model architecture
    lstm_units: List[int] = [50, 50]
    dense_units: List[int] = [25]
    dropout_rate: float = 0.2
    recurrent_dropout: float = 0.2
    use_batch_normalization: bool = True
    use_bidirectional: bool = False
    
    # Regularization
    l1_reg: float = 0.0
    l2_reg: float = 0.001
    
    # Training parameters
    optimizer: str = 'adam'
    learning_rate: float = 0.001
    loss_function: str = 'mse'
    epochs: int = 100
    batch_size: int = 32
    validation_split: float = 0.2
    
    # Callbacks
    early_stopping_patience: int = 15
    reduce_lr_patience: int = 10
    reduce_lr_factor: float = 0.5
```

#### PredictionResult
Comprehensive result object containing predictions and metadata:

```python
@dataclass
class PredictionResult:
    user_id: str
    predictions: np.ndarray
    confidence_intervals: Dict[str, np.ndarray]
    model_accuracy: float
    prediction_dates: List[datetime]
    input_sequence: np.ndarray
    metadata: Dict[str, Any]
    generated_at: datetime
```

## Model Architecture Details

### LSTM Network Structure

#### Input Layer
- **Shape**: (batch_size, sequence_length, n_features)
- **Preprocessing**: Normalized features from time series preprocessing
- **Sequence Length**: Configurable (default: 30 days)

#### LSTM Layers
```python
# Example: Two-layer LSTM
LSTM(64, return_sequences=True, dropout=0.2, recurrent_dropout=0.2)
BatchNormalization()  # Optional
LSTM(32, return_sequences=False, dropout=0.2, recurrent_dropout=0.2)
BatchNormalization()  # Optional
```

#### Dense Layers
```python
# Example: Two dense layers with dropout
Dense(32, activation='relu', kernel_regularizer=l1_l2(l1=0.0, l2=0.001))
Dropout(0.2)
BatchNormalization()  # Optional
Dense(16, activation='relu', kernel_regularizer=l1_l2(l1=0.0, l2=0.001))
Dropout(0.2)
```

#### Output Layer
```python
# Linear activation for regression
Dense(prediction_horizon, activation='linear')
```

### Regularization Techniques

#### Dropout Regularization
- **Standard Dropout**: Applied to LSTM and dense layers
- **Recurrent Dropout**: Applied within LSTM cells
- **Monte Carlo Dropout**: Used for uncertainty estimation

#### Weight Regularization
- **L1 Regularization**: Promotes sparsity in weights
- **L2 Regularization**: Prevents large weights (default: 0.001)

#### Batch Normalization
- **Training Stability**: Normalizes layer inputs
- **Faster Convergence**: Reduces internal covariate shift
- **Optional**: Can be disabled for simpler models

## Training Pipeline

### 1. Data Preparation
```python
# Preprocess time series data
preprocessor = TimeSeriesPreprocessor(config)
X_sequences, y_sequences, report = preprocessor.fit_transform(balance_data)

# Split data
train_size = int(0.8 * len(X_sequences))
X_train, X_val = X_sequences[:train_size], X_sequences[train_size:]
y_train, y_val = y_sequences[:train_size], y_sequences[train_size:]
```

### 2. Model Training
```python
# Configure and train model
config = LSTMConfig(
    lstm_units=[64, 32],
    dense_units=[32, 16],
    epochs=100,
    batch_size=32,
    early_stopping_patience=15
)

model = LSTMPredictionModel(config, preprocessor)
training_results = model.fit(X_train, y_train, X_val, y_val)
```

### 3. Training Callbacks

#### Early Stopping
- **Monitor**: Validation loss
- **Patience**: Number of epochs without improvement
- **Restore Best Weights**: Automatically restores best model

#### Learning Rate Reduction
- **Monitor**: Validation loss plateau
- **Factor**: Reduction factor (default: 0.5)
- **Patience**: Epochs to wait before reduction

#### Model Checkpointing
- **Save Best Only**: Saves only the best performing model
- **Monitor Metric**: Validation loss or custom metric
- **Automatic Saving**: Saves model during training

### 4. Training Monitoring
```python
# Access training history
history = training_results['history']
train_loss = history['loss']
val_loss = history['val_loss']

# Training statistics
stats = training_results['training_stats']
print(f"Training time: {stats['training_time_seconds']:.2f}s")
print(f"Best validation loss: {stats['best_val_loss']:.6f}")
print(f"Model parameters: {stats['model_parameters']:,}")
```

## Prediction and Uncertainty Quantification

### Making Predictions
```python
# Make predictions for new data
prediction_result = model.predict(
    X_test, 
    user_id='user_123',
    calculate_confidence=True
)

# Access predictions
predictions = prediction_result.predictions  # Shape: (n_sequences, prediction_horizon)
dates = prediction_result.prediction_dates   # List of prediction dates
confidence = prediction_result.confidence_intervals
```

### Confidence Intervals

#### Monte Carlo Dropout
The system uses Monte Carlo dropout to estimate prediction uncertainty:

```python
def _calculate_confidence_intervals(self, X, predictions_scaled, predictions):
    """Calculate confidence intervals using Monte Carlo dropout"""
    n_samples = 100
    dropout_predictions = []
    
    # Enable dropout during inference
    for _ in range(n_samples):
        pred = self.model(X, training=True)  # Keep dropout active
        dropout_predictions.append(pred)
    
    # Calculate statistics
    confidence_intervals = {
        'mean': np.mean(dropout_predictions, axis=0),
        'std': np.std(dropout_predictions, axis=0),
        'lower_95': np.percentile(dropout_predictions, 2.5, axis=0),
        'upper_95': np.percentile(dropout_predictions, 97.5, axis=0),
        'lower_80': np.percentile(dropout_predictions, 10, axis=0),
        'upper_80': np.percentile(dropout_predictions, 90, axis=0)
    }
    
    return confidence_intervals
```

#### Confidence Interval Interpretation
- **95% Confidence**: 95% of actual values should fall within this range
- **80% Confidence**: 80% of actual values should fall within this range
- **Standard Deviation**: Measure of prediction uncertainty
- **Mean**: Average prediction across Monte Carlo samples

## Model Evaluation

### Comprehensive Metrics
```python
# Evaluate model performance
test_metrics = model.evaluate(X_test, y_test)

# Available metrics
print(f"Test Loss (MSE): {test_metrics['test_loss']:.6f}")
print(f"Test MAE: {test_metrics['test_mae']:.6f}")
print(f"Test MAPE: {test_metrics['test_mape']:.2f}%")
print(f"Test RMSE: {test_metrics['test_rmse']:.6f}")
print(f"Test R²: {test_metrics['test_r2']:.4f}")
```

### Evaluation Metrics Explained

#### Mean Absolute Error (MAE)
- **Definition**: Average absolute difference between predictions and actual values
- **Interpretation**: Lower is better, same units as target variable
- **Use Case**: Easy to interpret, robust to outliers

#### Mean Absolute Percentage Error (MAPE)
- **Definition**: Average percentage error between predictions and actual values
- **Interpretation**: Percentage error, scale-independent
- **Use Case**: Comparing models across different scales

#### Root Mean Square Error (RMSE)
- **Definition**: Square root of average squared differences
- **Interpretation**: Penalizes large errors more than MAE
- **Use Case**: When large errors are particularly undesirable

#### R-squared (R²)
- **Definition**: Proportion of variance explained by the model
- **Interpretation**: 1.0 = perfect fit, 0.0 = no better than mean
- **Use Case**: Understanding model explanatory power

## Usage Examples

### Basic Usage
```python
import pandas as pd
from src.services.lstm_prediction_model import create_lstm_model_for_financial_prediction

# Load your balance data
balance_data = pd.DataFrame({
    'date': pd.date_range('2023-01-01', periods=365, freq='D'),
    'balance': [5000 + i*2 + np.random.normal(0, 50) for i in range(365)]
})

# Create and train model
model = create_lstm_model_for_financial_prediction(
    sequence_length=30,
    prediction_horizon=30,
    lstm_units=[64, 32],
    dense_units=[32, 16]
)

# Complete training pipeline
trained_model, results = train_financial_prediction_model(
    balance_data=balance_data,
    user_id='user_123',
    test_split=0.2,
    model_save_path='models/financial_predictor'
)

print(f"Model trained with R² score: {results['test_metrics']['test_r2']:.4f}")
```

### Custom Configuration
```python
# Advanced configuration
config = LSTMConfig(
    lstm_units=[128, 64, 32],      # Three LSTM layers
    dense_units=[64, 32, 16],      # Three dense layers
    dropout_rate=0.3,              # Higher dropout
    recurrent_dropout=0.2,
    use_batch_normalization=True,
    use_bidirectional=False,       # Bidirectional LSTM
    l1_reg=0.001,                  # L1 regularization
    l2_reg=0.01,                   # L2 regularization
    optimizer='adam',
    learning_rate=0.0005,          # Lower learning rate
    epochs=200,                    # More epochs
    batch_size=64,                 # Larger batch size
    early_stopping_patience=25,    # More patience
    reduce_lr_patience=15
)

# Create model with custom config
model = LSTMPredictionModel(config, preprocessor)
```

### Making Predictions
```python
# Prepare new data for prediction
new_balance_data = pd.DataFrame({
    'date': pd.date_range('2024-01-01', periods=60, freq='D'),
    'balance': [6000 + i*1.5 + np.random.normal(0, 40) for i in range(60)]
})

# Preprocess new data
X_new, _, _ = model.preprocessor.transform(new_balance_data)

# Make predictions with confidence intervals
prediction_result = model.predict(X_new[-5:], user_id='user_456')

# Access results
predictions = prediction_result.predictions
confidence_95 = prediction_result.confidence_intervals['upper_95']
dates = prediction_result.prediction_dates

print(f"30-day predictions for {len(predictions)} sequences:")
for i, (pred, conf, date) in enumerate(zip(predictions[0], confidence_95[0], dates)):
    print(f"Day {i+1} ({date}): ${pred:.2f} (95% upper: ${conf:.2f})")
```

### Model Persistence
```python
# Save trained model
model.save_model('models/lstm_financial_v1')

# Load saved model
loaded_model = LSTMPredictionModel.load_model('models/lstm_financial_v1')

# Verify loaded model works
test_prediction = loaded_model.predict(X_test[:1])
print(f"Loaded model prediction: {test_prediction.predictions[0]}")
```

## Integration with Time Series Preprocessing

### Seamless Integration
```python
from src.services.time_series_preprocessing import TimeSeriesPreprocessor, TimeSeriesConfig

# Configure preprocessing
ts_config = TimeSeriesConfig(
    sequence_length=30,
    prediction_horizon=30,
    scaler_type='minmax',
    include_moving_averages=True,
    include_lag_features=True,
    include_seasonal_features=True,
    include_trend_features=True
)

# Create integrated model
preprocessor = TimeSeriesPreprocessor(ts_config)
model = LSTMPredictionModel(lstm_config, preprocessor)

# Automatic preprocessing during training
X_seq, y_seq, report = preprocessor.fit_transform(balance_data)
training_results = model.fit(X_seq, y_seq)

# Automatic inverse transformation during prediction
predictions = model.predict(X_test)  # Automatically converts back to original scale
```

### Feature Engineering Benefits
- **Rich Feature Set**: Temporal, lag, moving average, and trend features
- **Automatic Scaling**: Proper normalization for neural network training
- **Sequence Generation**: LSTM-ready 3D arrays
- **Inverse Transformation**: Predictions in original balance scale

## Performance Optimization

### Training Optimization

#### Batch Size Selection
```python
# Small datasets: smaller batch sizes
config = LSTMConfig(batch_size=16)  # For < 1000 sequences

# Large datasets: larger batch sizes
config = LSTMConfig(batch_size=128)  # For > 10000 sequences
```

#### Learning Rate Scheduling
```python
# Conservative approach
config = LSTMConfig(
    learning_rate=0.0001,
    reduce_lr_patience=10,
    reduce_lr_factor=0.5,
    min_lr=1e-7
)

# Aggressive approach
config = LSTMConfig(
    learning_rate=0.01,
    reduce_lr_patience=5,
    reduce_lr_factor=0.2,
    min_lr=1e-6
)
```

#### Architecture Optimization
```python
# Simple model (faster training)
simple_config = LSTMConfig(
    lstm_units=[32],
    dense_units=[16],
    dropout_rate=0.1,
    use_batch_normalization=False
)

# Complex model (better accuracy)
complex_config = LSTMConfig(
    lstm_units=[128, 64, 32],
    dense_units=[64, 32, 16],
    dropout_rate=0.3,
    use_batch_normalization=True,
    use_bidirectional=True
)
```

### Memory Optimization
```python
# Reduce memory usage
memory_efficient_config = LSTMConfig(
    batch_size=16,           # Smaller batches
    lstm_units=[32, 16],     # Fewer units
    dense_units=[16],        # Fewer dense layers
    use_batch_normalization=False  # Less memory overhead
)
```

### Inference Optimization
```python
# Disable confidence calculation for faster inference
fast_prediction = model.predict(X_test, calculate_confidence=False)

# Batch predictions for efficiency
batch_predictions = model.predict(X_large_batch)  # Process multiple sequences at once
```

## Monitoring and Analytics

### Training Monitoring
```python
# Monitor training progress
def plot_training_history(history):
    import matplotlib.pyplot as plt
    
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))
    
    # Loss plot
    ax1.plot(history['loss'], label='Training Loss')
    ax1.plot(history['val_loss'], label='Validation Loss')
    ax1.set_title('Model Loss')
    ax1.set_xlabel('Epoch')
    ax1.set_ylabel('Loss')
    ax1.legend()
    
    # MAE plot
    ax2.plot(history['mae'], label='Training MAE')
    ax2.plot(history['val_mae'], label='Validation MAE')
    ax2.set_title('Model MAE')
    ax2.set_xlabel('Epoch')
    ax2.set_ylabel('MAE')
    ax2.legend()
    
    plt.tight_layout()
    plt.show()

# Use after training
plot_training_history(training_results['history'])
```

### Model Performance Analysis
```python
# Comprehensive model analysis
def analyze_model_performance(model, X_test, y_test):
    # Evaluate model
    metrics = model.evaluate(X_test, y_test)
    
    # Make predictions
    predictions = model.predict(X_test, calculate_confidence=True)
    
    # Calculate additional metrics
    residuals = y_test - predictions.predictions
    
    analysis = {
        'test_metrics': metrics,
        'prediction_stats': {
            'mean_prediction': np.mean(predictions.predictions),
            'std_prediction': np.std(predictions.predictions),
            'min_prediction': np.min(predictions.predictions),
            'max_prediction': np.max(predictions.predictions)
        },
        'residual_stats': {
            'mean_residual': np.mean(residuals),
            'std_residual': np.std(residuals),
            'residual_skewness': scipy.stats.skew(residuals.flatten()),
            'residual_kurtosis': scipy.stats.kurtosis(residuals.flatten())
        },
        'confidence_coverage': {
            '95%': np.mean((y_test >= predictions.confidence_intervals['lower_95']) & 
                          (y_test <= predictions.confidence_intervals['upper_95'])),
            '80%': np.mean((y_test >= predictions.confidence_intervals['lower_80']) & 
                          (y_test <= predictions.confidence_intervals['upper_80']))
        }
    }
    
    return analysis
```

### Production Monitoring
```python
# Monitor model performance in production
class ModelMonitor:
    def __init__(self, model):
        self.model = model
        self.prediction_history = []
        self.performance_metrics = []
    
    def log_prediction(self, prediction_result, actual_values=None):
        """Log prediction for monitoring"""
        log_entry = {
            'timestamp': prediction_result.generated_at,
            'user_id': prediction_result.user_id,
            'predictions': prediction_result.predictions,
            'model_accuracy': prediction_result.model_accuracy,
            'actual_values': actual_values
        }
        self.prediction_history.append(log_entry)
    
    def calculate_drift_metrics(self):
        """Calculate model drift metrics"""
        if len(self.prediction_history) < 2:
            return None
        
        recent_predictions = [p['predictions'] for p in self.prediction_history[-100:]]
        older_predictions = [p['predictions'] for p in self.prediction_history[-200:-100]]
        
        if len(older_predictions) == 0:
            return None
        
        recent_mean = np.mean(recent_predictions)
        older_mean = np.mean(older_predictions)
        
        drift_score = abs(recent_mean - older_mean) / (older_mean + 1e-8)
        
        return {
            'prediction_drift': drift_score,
            'recent_mean': recent_mean,
            'older_mean': older_mean,
            'samples_compared': len(recent_predictions) + len(older_predictions)
        }
```

## Testing

### Comprehensive Test Suite
The system includes extensive tests covering:

#### Unit Tests
- Model architecture creation
- Training pipeline functionality
- Prediction accuracy
- Configuration validation
- Error handling

#### Integration Tests
- Complete training and prediction pipeline
- Preprocessing integration
- Model persistence
- Performance benchmarks

#### Property-based Tests
- Prediction consistency
- Confidence interval validity
- Model convergence properties
- Memory usage bounds

### Running Tests
```bash
cd ml-service
python -m pytest test_lstm_prediction_model.py -v

# Run with coverage
python -m pytest test_lstm_prediction_model.py --cov=src.services.lstm_prediction_model

# Run specific test categories
python -m pytest test_lstm_prediction_model.py -k "test_training" -v
```

### Test Configuration
```python
# Test with minimal configuration for speed
test_config = LSTMConfig(
    lstm_units=[4, 2],
    dense_units=[2],
    epochs=2,
    batch_size=4,
    early_stopping_patience=1
)
```

## Troubleshooting

### Common Issues

#### Training Issues
```python
# Issue: Model not converging
# Solution: Adjust learning rate and architecture
config = LSTMConfig(
    learning_rate=0.0001,  # Lower learning rate
    lstm_units=[32, 16],   # Simpler architecture
    epochs=200,            # More epochs
    early_stopping_patience=30  # More patience
)

# Issue: Overfitting
# Solution: Increase regularization
config = LSTMConfig(
    dropout_rate=0.4,      # Higher dropout
    l2_reg=0.01,          # Stronger L2 regularization
    validation_split=0.3   # More validation data
)

# Issue: Underfitting
# Solution: Increase model complexity
config = LSTMConfig(
    lstm_units=[128, 64, 32],  # More complex architecture
    dense_units=[64, 32],      # More dense layers
    dropout_rate=0.1           # Less dropout
)
```

#### Memory Issues
```python
# Reduce memory usage
config = LSTMConfig(
    batch_size=8,          # Smaller batches
    lstm_units=[16, 8],    # Fewer units
    use_batch_normalization=False  # Less memory
)

# Use gradient checkpointing (TensorFlow 2.x)
# This trades computation for memory
```

#### Prediction Issues
```python
# Issue: Poor prediction accuracy
# Solutions:
# 1. More training data
# 2. Better feature engineering
# 3. Hyperparameter tuning
# 4. Different architecture

# Issue: Unrealistic confidence intervals
# Solution: Tune Monte Carlo dropout samples
def _calculate_confidence_intervals(self, X, predictions_scaled, predictions):
    n_samples = 200  # Increase samples for better estimates
    # ... rest of implementation
```

### Debug Tools
```python
# Debug model architecture
def debug_model_architecture(model):
    if model.model:
        model.model.summary()
        
        # Check layer outputs
        for i, layer in enumerate(model.model.layers):
            print(f"Layer {i}: {layer.name} - {layer.output_shape}")
    
    # Check configuration
    print(f"Config: {model.config}")

# Debug training data
def debug_training_data(X, y):
    print(f"X shape: {X.shape}")
    print(f"y shape: {y.shape}")
    print(f"X range: [{X.min():.6f}, {X.max():.6f}]")
    print(f"y range: [{y.min():.6f}, {y.max():.6f}]")
    print(f"X has NaN: {np.isnan(X).any()}")
    print(f"y has NaN: {np.isnan(y).any()}")

# Debug predictions
def debug_predictions(prediction_result):
    print(f"Predictions shape: {prediction_result.predictions.shape}")
    print(f"Prediction range: [{prediction_result.predictions.min():.2f}, {prediction_result.predictions.max():.2f}]")
    print(f"Model accuracy: {prediction_result.model_accuracy:.4f}")
    print(f"Confidence intervals available: {len(prediction_result.confidence_intervals)}")
```

## Best Practices

### For Data Scientists

1. **Data Quality**: Ensure high-quality, consistent time series data
2. **Feature Engineering**: Use comprehensive feature engineering from preprocessing
3. **Validation Strategy**: Use proper time series validation (no data leakage)
4. **Hyperparameter Tuning**: Systematically tune hyperparameters
5. **Model Evaluation**: Use multiple metrics and confidence intervals

### For Developers

1. **Error Handling**: Implement comprehensive error handling
2. **Logging**: Add detailed logging for debugging
3. **Testing**: Write thorough tests for all components
4. **Documentation**: Document model architecture decisions
5. **Performance**: Profile and optimize for production use

### For System Administrators

1. **Resource Monitoring**: Monitor GPU/CPU usage during training
2. **Model Versioning**: Implement proper model versioning
3. **Backup Strategy**: Regular backups of trained models
4. **Monitoring**: Set up model performance monitoring
5. **Scaling**: Plan for horizontal scaling if needed

## Future Enhancements

### Planned Features
- **Attention Mechanisms**: Transformer-based architectures
- **Multi-variate Prediction**: Support for multiple time series
- **Online Learning**: Incremental model updates
- **Automated Hyperparameter Tuning**: Bayesian optimization

### Research Areas
- **Probabilistic Models**: Bayesian neural networks
- **Ensemble Methods**: Multiple model combinations
- **Explainable AI**: Better interpretability of predictions
- **Federated Learning**: Privacy-preserving distributed training

## Contributing

To contribute to the LSTM Prediction Model System:

1. **Fork the Repository**: Create your own fork
2. **Create Feature Branch**: Work on specific model features
3. **Write Tests**: Ensure comprehensive test coverage
4. **Submit Pull Request**: Follow the contribution guidelines
5. **Code Review**: Participate in the review process

## License

This system is part of the FinSense project and follows the same licensing terms.

## Support

For support and questions:
- **Documentation**: Check this README and code comments
- **Issues**: Submit GitHub issues for bugs and feature requests
- **Discussions**: Use GitHub discussions for questions
- **Contact**: Reach out to the development team