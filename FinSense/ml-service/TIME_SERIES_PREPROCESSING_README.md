# Time Series Preprocessing System

## Overview

The Time Series Preprocessing System is a comprehensive data preparation component for the FinSense ML service that transforms raw financial balance data into sequences suitable for LSTM-based time series prediction. This system implements advanced feature engineering, data normalization, and sequence generation capabilities specifically designed for financial forecasting.

## Key Features

### 1. Data Validation and Cleaning
- **Quality Checks**: Validates data completeness, continuity, and quality
- **Missing Value Handling**: Multiple imputation strategies for missing data
- **Outlier Detection**: Statistical outlier identification and handling
- **Duplicate Removal**: Automatic detection and removal of duplicate records

### 2. Feature Engineering
- **Temporal Features**: Date-based features (day, month, year, seasonality)
- **Lag Features**: Historical balance values at various time lags
- **Moving Averages**: Simple and exponential moving averages
- **Trend Features**: Balance changes, momentum, and volatility indicators
- **Seasonal Features**: Cyclical encoding of temporal patterns

### 3. Data Normalization
- **Multiple Scalers**: MinMax, Standard, and Robust scaling options
- **Feature-specific Scaling**: Separate scaling for different feature types
- **Inverse Transformation**: Ability to convert predictions back to original scale

### 4. Sequence Generation
- **LSTM-ready Sequences**: Creates sequences suitable for neural network training
- **Configurable Windows**: Flexible sequence length and prediction horizons
- **Sliding Window**: Efficient sequence generation with configurable step sizes

## Architecture

### Core Components

#### TimeSeriesPreprocessor
The main preprocessing class that orchestrates all data preparation activities:

```python
from src.services.time_series_preprocessing import TimeSeriesPreprocessor, TimeSeriesConfig

# Initialize with configuration
config = TimeSeriesConfig(
    sequence_length=30,
    prediction_horizon=7,
    scaler_type='minmax'
)
preprocessor = TimeSeriesPreprocessor(config)

# Fit and transform data
X_sequences, y_sequences, report = preprocessor.fit_transform(balance_data)
```

#### TimeSeriesConfig
Configuration class for customizing preprocessing behavior:

```python
@dataclass
class TimeSeriesConfig:
    # Sequence parameters
    sequence_length: int = 30
    prediction_horizon: int = 30
    step_size: int = 1
    
    # Normalization parameters
    scaler_type: str = 'minmax'
    feature_range: Tuple[float, float] = (0, 1)
    
    # Feature engineering parameters
    include_moving_averages: bool = True
    ma_windows: List[int] = None
    include_lag_features: bool = True
    lag_periods: List[int] = None
    include_seasonal_features: bool = True
    include_trend_features: bool = True
    
    # Data validation parameters
    min_data_points: int = 90
    max_missing_ratio: float = 0.1
    outlier_threshold: float = 3.0
    imputation_strategy: str = 'mean'
```

## Feature Engineering Details

### 1. Temporal Features

#### Basic Date Features
- **Year, Month, Day**: Extracted from date column
- **Day of Week**: 0-6 (Monday-Sunday)
- **Day of Year**: 1-365/366
- **Week of Year**: 1-52/53
- **Quarter**: 1-4

#### Cyclical Features (Seasonal Encoding)
```python
# Month cyclical encoding
month_sin = sin(2π × month / 12)
month_cos = cos(2π × month / 12)

# Day of week cyclical encoding
dow_sin = sin(2π × day_of_week / 7)
dow_cos = cos(2π × day_of_week / 7)
```

#### Binary Features
- **is_weekend**: 1 if Saturday/Sunday, 0 otherwise
- **is_month_start/end**: Beginning/end of month indicators
- **is_quarter_start/end**: Beginning/end of quarter indicators

### 2. Lag Features

Historical balance values at specified time lags:

```python
# Default lag periods: [1, 7, 14, 30] days
balance_lag_1    # Balance 1 day ago
balance_lag_7    # Balance 1 week ago
balance_lag_14   # Balance 2 weeks ago
balance_lag_30   # Balance 1 month ago
```

### 3. Moving Average Features

#### Simple Moving Averages
```python
# Default windows: [7, 14, 30] days
balance_ma_7     # 7-day moving average
balance_ma_14    # 14-day moving average
balance_ma_30    # 30-day moving average
```

#### Exponential Moving Averages
```python
balance_ema_7    # 7-day exponential moving average
balance_ema_14   # 14-day exponential moving average
balance_ema_30   # 30-day exponential moving average
```

#### Statistical Features
```python
balance_std_7    # 7-day rolling standard deviation
balance_min_7    # 7-day rolling minimum
balance_max_7    # 7-day rolling maximum
```

### 4. Trend Features

#### Change Features
```python
balance_change       # Daily balance change (difference)
balance_pct_change   # Daily percentage change
```

#### Trend Analysis
```python
balance_trend_7      # 7-day linear trend (slope)
balance_trend_14     # 14-day linear trend
balance_trend_30     # 30-day linear trend
```

#### Momentum Features
```python
balance_momentum_7   # 7-day momentum (rate of change)
balance_momentum_14  # 14-day momentum
balance_momentum_30  # 30-day momentum
```

#### Volatility
```python
balance_volatility   # 30-day rolling standard deviation
```

## Data Preprocessing Pipeline

### 1. Data Validation
```python
def _validate_data(self, df: pd.DataFrame) -> Dict[str, Any]:
    """
    Comprehensive data quality validation:
    - Minimum data points check
    - Required columns verification
    - Missing value ratio assessment
    - Duplicate detection
    - Outlier identification
    - Date continuity analysis
    """
```

### 2. Data Cleaning
```python
def _clean_data(self, df: pd.DataFrame) -> pd.DataFrame:
    """
    Data cleaning operations:
    - Date type conversion
    - Sorting by date
    - Duplicate removal
    - Numeric type conversion
    - Missing value imputation
    """
```

### 3. Feature Engineering
```python
# Sequential feature creation
df_features = self._create_temporal_features(df_clean)
df_features = self._create_lag_features(df_features)
df_features = self._create_moving_average_features(df_features)
df_features = self._create_trend_features(df_features)
```

### 4. Normalization
```python
# Separate scalers for different purposes
self.feature_scaler = self._create_scaler(self.config.scaler_type)
self.target_scaler = self._create_scaler(self.config.scaler_type)

features_scaled = self.feature_scaler.fit_transform(features)
targets_scaled = self.target_scaler.fit_transform(targets.reshape(-1, 1))
```

### 5. Sequence Generation
```python
def _create_sequences(self, features: np.ndarray, targets: np.ndarray):
    """
    Create sliding window sequences:
    - Input sequences: [sequence_length, n_features]
    - Target sequences: [prediction_horizon]
    - Configurable step size for overlapping windows
    """
```

## Usage Examples

### Basic Usage
```python
import pandas as pd
from src.services.time_series_preprocessing import TimeSeriesPreprocessor

# Load your balance data
balance_data = pd.DataFrame({
    'date': pd.date_range('2023-01-01', periods=365, freq='D'),
    'balance': [5000 + i*2 + np.random.normal(0, 50) for i in range(365)]
})

# Initialize preprocessor
preprocessor = TimeSeriesPreprocessor()

# Fit and transform
X_sequences, y_sequences, report = preprocessor.fit_transform(balance_data)

print(f"Created {len(X_sequences)} sequences")
print(f"Input shape: {X_sequences.shape}")
print(f"Target shape: {y_sequences.shape}")
```

### Custom Configuration
```python
# Custom configuration for specific use case
config = TimeSeriesConfig(
    sequence_length=60,        # Look back 60 days
    prediction_horizon=14,     # Predict 14 days ahead
    scaler_type='standard',    # Use standard scaling
    ma_windows=[5, 10, 20],   # Custom moving average windows
    lag_periods=[1, 3, 7],    # Custom lag periods
    include_seasonal_features=True,
    include_trend_features=True
)

preprocessor = TimeSeriesPreprocessor(config)
X_seq, y_seq, report = preprocessor.fit_transform(balance_data)
```

### Transform New Data
```python
# After fitting, transform new data
new_balance_data = pd.DataFrame({
    'date': pd.date_range('2024-01-01', periods=100, freq='D'),
    'balance': [6000 + i*1.5 + np.random.normal(0, 40) for i in range(100)]
})

X_new, y_new, transform_report = preprocessor.transform(new_balance_data)
```

### Inverse Transform Predictions
```python
# Convert scaled predictions back to original scale
scaled_predictions = model.predict(X_sequences[:5])  # Example predictions
original_scale_predictions = preprocessor.inverse_transform_targets(scaled_predictions)

print(f"Original scale predictions: {original_scale_predictions}")
```

## Configuration Options

### Sequence Parameters
```python
sequence_length: int = 30      # Number of historical days to use
prediction_horizon: int = 30   # Number of days to predict
step_size: int = 1            # Step size for sliding window
```

### Normalization Options
```python
scaler_type: str = 'minmax'           # 'minmax', 'standard', 'robust'
feature_range: Tuple = (0, 1)        # Range for MinMaxScaler
```

### Feature Engineering Controls
```python
include_moving_averages: bool = True   # Enable moving average features
ma_windows: List[int] = [7, 14, 30]   # Moving average windows
include_lag_features: bool = True      # Enable lag features
lag_periods: List[int] = [1, 7, 14, 30]  # Lag periods
include_seasonal_features: bool = True  # Enable seasonal encoding
include_trend_features: bool = True     # Enable trend features
```

### Data Quality Parameters
```python
min_data_points: int = 90          # Minimum required data points
max_missing_ratio: float = 0.1     # Maximum allowed missing value ratio
outlier_threshold: float = 3.0     # Z-score threshold for outliers
imputation_strategy: str = 'mean'  # 'mean', 'median', 'forward_fill', 'backward_fill'
```

## Data Quality and Validation

### Validation Checks
1. **Minimum Data Points**: Ensures sufficient data for meaningful analysis
2. **Required Columns**: Validates presence of 'date' and 'balance' columns
3. **Missing Value Ratio**: Checks that missing values don't exceed threshold
4. **Duplicate Detection**: Identifies duplicate date entries
5. **Outlier Detection**: Statistical outlier identification using z-scores
6. **Date Continuity**: Checks for gaps in the time series

### Validation Report Structure
```python
{
    'is_valid': bool,
    'warnings': List[str],
    'errors': List[str],
    'data_quality': {
        'missing_ratio': float,
        'duplicate_dates': int,
        'outliers': int,
        'date_gaps': int
    }
}
```

## Performance Optimization

### Memory Efficiency
- **Lazy Evaluation**: Features computed only when needed
- **Efficient Data Types**: Optimized pandas data types
- **Memory Cleanup**: Automatic cleanup of intermediate results

### Processing Speed
- **Vectorized Operations**: NumPy and pandas vectorization
- **Batch Processing**: Efficient sequence generation
- **Caching**: Intermediate results caching where appropriate

### Scalability
- **Configurable Features**: Enable/disable features based on needs
- **Flexible Windows**: Adjustable window sizes for different use cases
- **Streaming Support**: Designed for incremental data processing

## Testing

### Comprehensive Test Suite
The system includes extensive tests covering:

#### Unit Tests
- Configuration validation
- Individual feature engineering functions
- Data validation logic
- Scaling and normalization
- Sequence generation

#### Integration Tests
- Complete preprocessing pipeline
- Different configuration combinations
- Edge cases and error handling
- Performance benchmarks

#### Property-based Tests
- Data consistency across transformations
- Inverse transformation accuracy
- Feature engineering correctness
- Sequence generation properties

### Running Tests
```bash
cd ml-service
python -m pytest test_time_series_preprocessing.py -v
```

## Error Handling

### Common Errors and Solutions

#### Insufficient Data Points
```python
# Error: Insufficient data points: 50 < 90
# Solution: Reduce min_data_points or provide more data
config = TimeSeriesConfig(min_data_points=30)
```

#### Too Many Missing Values
```python
# Error: Too many missing values: 15% > 10%
# Solution: Increase tolerance or improve data quality
config = TimeSeriesConfig(max_missing_ratio=0.2)
```

#### Invalid Date Format
```python
# Error: Date column is not datetime type
# Solution: Convert dates before preprocessing
df['date'] = pd.to_datetime(df['date'])
```

### Graceful Degradation
- **Partial Feature Sets**: System works with minimal features
- **Robust Scaling**: Handles constant values and edge cases
- **Fallback Strategies**: Alternative approaches for problematic data

## Integration with LSTM Models

### TensorFlow/Keras Integration
```python
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense

# Prepare data
X_train, y_train, _ = preprocessor.fit_transform(train_data)
X_val, y_val, _ = preprocessor.transform(validation_data)

# Build LSTM model
model = Sequential([
    LSTM(50, return_sequences=True, input_shape=(X_train.shape[1], X_train.shape[2])),
    LSTM(50, return_sequences=False),
    Dense(25),
    Dense(y_train.shape[1])
])

model.compile(optimizer='adam', loss='mse')

# Train model
model.fit(X_train, y_train, validation_data=(X_val, y_val), epochs=50)

# Make predictions
predictions_scaled = model.predict(X_val)
predictions = preprocessor.inverse_transform_targets(predictions_scaled)
```

### PyTorch Integration
```python
import torch
import torch.nn as nn

class LSTMPredictor(nn.Module):
    def __init__(self, input_size, hidden_size, num_layers, output_size):
        super(LSTMPredictor, self).__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_size, output_size)
    
    def forward(self, x):
        lstm_out, _ = self.lstm(x)
        predictions = self.fc(lstm_out[:, -1, :])
        return predictions

# Convert to PyTorch tensors
X_tensor = torch.FloatTensor(X_sequences)
y_tensor = torch.FloatTensor(y_sequences)

# Initialize model
model = LSTMPredictor(
    input_size=X_sequences.shape[2],
    hidden_size=50,
    num_layers=2,
    output_size=y_sequences.shape[1]
)
```

## Monitoring and Analytics

### Preprocessing Metrics
- **Data Quality Score**: Overall data quality assessment
- **Feature Coverage**: Percentage of features successfully created
- **Sequence Efficiency**: Ratio of sequences created to input data
- **Processing Time**: Time taken for each preprocessing step

### Feature Analysis
```python
# Get detailed feature analysis
analysis = preprocessor.get_feature_importance_analysis()

print(f"Total features: {analysis['total_features']}")
print(f"Feature categories: {analysis['feature_categories']}")
print(f"Temporal features: {len(analysis['feature_categories']['temporal'])}")
print(f"Lag features: {len(analysis['feature_categories']['lag'])}")
```

### Quality Monitoring
```python
# Monitor data quality over time
def monitor_data_quality(preprocessor, new_data):
    validation_report = preprocessor._validate_data(new_data)
    
    if validation_report['warnings']:
        logger.warning(f"Data quality warnings: {validation_report['warnings']}")
    
    if not validation_report['is_valid']:
        logger.error(f"Data quality errors: {validation_report['errors']}")
    
    return validation_report
```

## Best Practices

### For Developers

1. **Configuration Management**: Use configuration files for different environments
2. **Error Handling**: Implement comprehensive error handling and logging
3. **Testing**: Write tests for all preprocessing components
4. **Documentation**: Document feature engineering decisions
5. **Performance**: Profile preprocessing pipeline for bottlenecks

### For Data Scientists

1. **Feature Selection**: Choose features based on domain knowledge
2. **Window Sizes**: Experiment with different sequence lengths and horizons
3. **Scaling**: Choose appropriate scaling method for your data distribution
4. **Validation**: Always validate preprocessing results before model training
5. **Monitoring**: Monitor data quality in production

### For System Administrators

1. **Resource Monitoring**: Monitor memory and CPU usage during preprocessing
2. **Data Pipeline**: Implement robust data pipeline with error recovery
3. **Backup**: Backup fitted preprocessors for model reproducibility
4. **Logging**: Implement comprehensive logging for debugging
5. **Alerts**: Set up alerts for data quality issues

## Troubleshooting

### Common Issues

#### Memory Issues
```python
# Reduce memory usage
config = TimeSeriesConfig(
    sequence_length=15,        # Reduce sequence length
    ma_windows=[7, 14],       # Fewer moving averages
    lag_periods=[1, 7]        # Fewer lag features
)
```

#### Performance Issues
```python
# Optimize for speed
config = TimeSeriesConfig(
    include_moving_averages=False,  # Disable expensive features
    include_trend_features=False,   # Disable trend calculations
    step_size=2                     # Reduce sequence overlap
)
```

#### Data Quality Issues
```python
# Handle poor quality data
config = TimeSeriesConfig(
    max_missing_ratio=0.3,     # Allow more missing values
    outlier_threshold=5.0,     # Less strict outlier detection
    imputation_strategy='median'  # Robust imputation
)
```

### Debug Tools

```python
# Debug preprocessing pipeline
def debug_preprocessing(preprocessor, data):
    # Validation
    validation = preprocessor._validate_data(data)
    print(f"Validation: {validation}")
    
    # Cleaning
    cleaned = preprocessor._clean_data(data)
    print(f"Cleaned data shape: {cleaned.shape}")
    
    # Feature engineering
    with_features = preprocessor._create_temporal_features(cleaned)
    print(f"With features shape: {with_features.shape}")
    
    # Final preprocessing
    X_seq, y_seq, report = preprocessor.fit_transform(data)
    print(f"Final sequences: {X_seq.shape}, {y_seq.shape}")
    
    return report
```

## Future Enhancements

### Planned Features
- **Advanced Feature Engineering**: Fourier transforms, wavelets
- **Automated Feature Selection**: Statistical and ML-based feature selection
- **Real-time Processing**: Streaming data preprocessing
- **Multi-variate Support**: Support for multiple time series variables

### Research Areas
- **Deep Feature Learning**: Automated feature discovery using neural networks
- **Adaptive Preprocessing**: Dynamic preprocessing based on data characteristics
- **Federated Preprocessing**: Distributed preprocessing for large datasets
- **Explainable Features**: Better interpretability of engineered features

## Contributing

To contribute to the Time Series Preprocessing System:

1. **Fork the Repository**: Create your own fork
2. **Create Feature Branch**: Work on specific preprocessing features
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