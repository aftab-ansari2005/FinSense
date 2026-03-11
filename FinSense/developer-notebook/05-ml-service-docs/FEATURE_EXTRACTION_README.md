# Transaction Feature Extraction System

This document describes the transaction feature extraction system implemented for the FinSense ML service.

## Overview

The feature extraction system transforms raw transaction data into numerical features suitable for machine learning algorithms. It implements TF-IDF vectorization for transaction descriptions, amount-based feature engineering, and date-based pattern extraction.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Transaction Data Input                        │
│  (date, amount, description)                                    │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│              Data Validation & Cleaning                         │
│  • Date validation and normalization                           │
│  • Amount validation and outlier detection                     │
│  • Description cleaning and normalization                      │
│  • Duplicate removal                                           │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                Feature Extraction                               │
├─────────────────────┬───────────────────────────────────────────┤
│  TF-IDF Features    │  Amount Features  │  Date Features        │
│  • Text vectorization│  • Raw amount    │  • Day of week       │
│  • N-gram analysis  │  • Absolute amount│  • Month             │
│  • Stop word removal│  • Log amount     │  • Hour              │
│  • Pattern cleaning │  • Amount bins    │  • Weekend flag      │
│                     │  • Sign (±)       │  • Season flags      │
├─────────────────────┴───────────────────┴───────────────────────┤
│                    Merchant Features                            │
│  • Grocery stores   • Gas stations    • Restaurants            │
│  • Retail stores    • Banks/ATMs      • Utilities              │
│  • Transportation   • Entertainment   • Healthcare             │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                Feature Matrix Output                            │
│  Combined numerical feature matrix ready for ML algorithms     │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. TransactionFeatureExtractor (`src/services/feature_extraction.py`)

Core service for extracting features from transaction data.

#### Key Features:
- **TF-IDF Vectorization**: Converts transaction descriptions to numerical vectors
- **Amount Engineering**: Creates multiple amount-based features
- **Date Analysis**: Extracts temporal patterns and cycles
- **Merchant Recognition**: Identifies merchant categories using regex patterns
- **Feature Scaling**: Normalizes features for ML compatibility

#### Usage:
```python
from src.services.feature_extraction import TransactionFeatureExtractor

# Initialize extractor
extractor = TransactionFeatureExtractor(
    max_features=1000,
    min_df=2,
    max_df=0.95,
    ngram_range=(1, 2)
)

# Extract features
features = extractor.fit_transform(transactions_df)
feature_names = extractor.get_feature_names()

# Save/load extractor
extractor.save('extractor.joblib')
loaded_extractor = TransactionFeatureExtractor.load('extractor.joblib')
```

### 2. TransactionPreprocessingPipeline (`src/utils/preprocessing_pipeline.py`)

Complete preprocessing pipeline that orchestrates data validation, cleaning, and feature extraction.

#### Key Features:
- **Data Validation**: Comprehensive validation of input data
- **Data Cleaning**: Normalization and standardization
- **Feature Extraction**: Integrated feature extraction
- **Error Handling**: Robust error handling and reporting
- **Pipeline Persistence**: Save/load complete pipelines

#### Usage:
```python
from src.utils.preprocessing_pipeline import TransactionPreprocessingPipeline, PreprocessingConfig

# Configure pipeline
config = PreprocessingConfig(
    max_tfidf_features=1000,
    min_df=2,
    max_df=0.95,
    min_description_length=3
)

# Initialize and use pipeline
pipeline = TransactionPreprocessingPipeline(config)
features, processed_df, report = pipeline.fit_transform(raw_df)

# Transform new data
new_features, new_df = pipeline.transform(new_raw_df)
```

## Feature Types

### 1. TF-IDF Features (Text Analysis)

Converts transaction descriptions into numerical vectors using Term Frequency-Inverse Document Frequency.

**Preprocessing Steps:**
- Convert to lowercase
- Remove card numbers and reference codes
- Remove special characters
- Filter transaction-specific stop words
- Apply n-gram analysis (1-2 grams)

**Example:**
```
"STARBUCKS COFFEE #1234" → [0.0, 0.3, 0.0, 0.7, 0.0, ...]
"WALMART SUPERCENTER"    → [0.2, 0.0, 0.5, 0.0, 0.4, ...]
```

### 2. Amount Features (Numerical Analysis)

Extracts multiple features from transaction amounts to capture spending patterns.

**Features Generated:**
- **Raw Amount**: Original transaction amount
- **Absolute Amount**: Magnitude regardless of sign
- **Log Amount**: Log-transformed amount (handles wide ranges)
- **Amount Bins**: Categorical bins (0-10, 10-25, 25-50, etc.)
- **Amount Sign**: Positive (income) vs negative (expense)

**Example:**
```
Amount: -$47.83 → [raw: -47.83, abs: 47.83, log: 3.87, bin: 2, sign: -1]
Amount: +$1250.00 → [raw: 1250.00, abs: 1250.00, log: 7.13, bin: 7, sign: 1]
```

### 3. Date Features (Temporal Analysis)

Extracts temporal patterns that may influence transaction categorization.

**Features Generated:**
- **Day of Week**: 0-6 (Monday to Sunday)
- **Day of Month**: 1-31
- **Month**: 1-12
- **Hour**: 0-23 (if available)
- **Is Weekend**: Binary flag
- **Is Winter/Summer**: Seasonal flags
- **Is Month Start/End**: Beginning/end of month flags

**Example:**
```
Date: 2024-01-15 14:30 → [day_week: 0, day_month: 15, month: 1, hour: 14, 
                          weekend: 0, winter: 1, summer: 0, start: 0, end: 0]
```

### 4. Merchant Features (Pattern Recognition)

Identifies merchant categories using regex patterns for common business types.

**Categories Detected:**
- **Grocery**: grocery, supermarket, market, food
- **Gas**: gas, fuel, shell, exxon, bp
- **Restaurant**: restaurant, cafe, coffee, starbucks
- **Retail**: store, shop, retail, amazon
- **Bank**: bank, atm, fee, interest
- **Utility**: electric, water, phone, internet
- **Transport**: uber, lyft, taxi, bus, airline
- **Entertainment**: movie, theater, netflix, spotify
- **Health**: pharmacy, doctor, hospital, medical
- **Subscription**: subscription, monthly, recurring

**Example:**
```
"STARBUCKS COFFEE" → [grocery: 0, gas: 0, restaurant: 1, retail: 0, ...]
"SHELL GAS STATION" → [grocery: 0, gas: 1, restaurant: 0, retail: 0, ...]
```

## Configuration

### PreprocessingConfig Parameters

```python
@dataclass
class PreprocessingConfig:
    # Feature extraction parameters
    max_tfidf_features: int = 1000      # Maximum TF-IDF features
    min_df: int = 2                     # Minimum document frequency
    max_df: float = 0.95                # Maximum document frequency
    ngram_range: Tuple[int, int] = (1, 2)  # N-gram range
    
    # Data cleaning parameters
    min_description_length: int = 3      # Minimum description length
    max_description_length: int = 500    # Maximum description length
    amount_outlier_threshold: float = 3.0  # Outlier detection threshold
    
    # Date filtering parameters
    max_days_old: int = 1095            # Maximum age (3 years)
    min_days_old: int = 0               # Minimum age
    
    # Required columns
    required_columns: List[str] = ['date', 'amount', 'description']
```

## API Integration

### ML Service Endpoints

#### 1. Feature Extraction Endpoint
```http
POST /ml/features/extract
Content-Type: application/json

{
  "transactions": [
    {
      "date": "2024-01-15T10:30:00Z",
      "amount": -47.83,
      "description": "STARBUCKS COFFEE #1234"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "feature_extraction": {
    "n_transactions": 1,
    "n_features": 1015,
    "processing_time": 0.234
  },
  "feature_analysis": {
    "total_features": 1015,
    "top_tfidf_features": [
      {"feature": "coffee", "score": 0.7234},
      {"feature": "starbucks", "score": 0.6891}
    ],
    "feature_types": {
      "tfidf_features": 1000,
      "amount_features": 5,
      "date_features": 9,
      "merchant_features": 10
    }
  }
}
```

#### 2. Transaction Categorization (Updated)
```http
POST /ml/categorize
Content-Type: application/json

{
  "transactions": [...],
  "user_id": "user123"
}
```

Now includes feature extraction in the processing pipeline.

## Performance Characteristics

### Processing Speed
- **Small datasets** (< 100 transactions): < 1 second
- **Medium datasets** (100-1000 transactions): 1-5 seconds
- **Large datasets** (1000-10000 transactions): 5-30 seconds

### Memory Usage
- **Base memory**: ~50MB for service initialization
- **Per transaction**: ~1KB for feature storage
- **TF-IDF vocabulary**: ~10MB for 1000 features

### Feature Dimensions
- **Default configuration**: ~1015 features per transaction
  - TF-IDF: 1000 features
  - Amount: 5 features
  - Date: 9 features
  - Merchant: 10 features

## Data Quality and Validation

### Input Validation
- **Date validation**: Converts to datetime, removes invalid dates
- **Amount validation**: Converts to numeric, removes NaN values
- **Description validation**: Ensures minimum length, truncates if too long
- **Duplicate detection**: Removes exact duplicates

### Data Cleaning
- **Text normalization**: Lowercase, whitespace cleanup
- **Pattern removal**: Card numbers, reference codes
- **Outlier detection**: Statistical outlier identification
- **Missing value handling**: Appropriate defaults or removal

### Quality Metrics
```python
validation_report = {
    'original_rows': 1000,
    'final_rows': 987,
    'issues': ['Removed 8 rows with invalid dates'],
    'warnings': ['Found 5 potential outliers']
}
```

## Testing and Validation

### Unit Tests
Run the test suite to validate functionality:

```bash
cd ml-service
python test_feature_extraction.py
```

### Test Coverage
- ✅ TF-IDF vectorization
- ✅ Amount feature engineering
- ✅ Date feature extraction
- ✅ Merchant pattern recognition
- ✅ Data validation and cleaning
- ✅ Pipeline integration
- ✅ Error handling
- ✅ Edge cases

### Sample Test Results
```
=== Transaction Feature Extraction Test ===

✓ Successfully imported feature extraction modules
✓ TF-IDF features shape: (50, 47)
✓ Amount features shape: (50, 5)
✓ Date features shape: (50, 9)
✓ Merchant features shape: (50, 10)
✓ Combined features shape: (50, 71)
✓ Pipeline processing complete
✓ All feature extraction tests passed!
```

## Integration with Clustering

The extracted features are designed to work seamlessly with clustering algorithms:

```python
# Extract features
features, processed_df, report = pipeline.fit_transform(transactions_df)

# Use with clustering (Task 7.2)
from sklearn.cluster import KMeans
kmeans = KMeans(n_clusters=10)
clusters = kmeans.fit_predict(features)

# Assign categories based on clusters
categories = assign_categories_to_clusters(clusters, processed_df)
```

## Requirements Satisfied

This implementation satisfies **Requirement 2.1**: "WHEN new transactions are processed, THE Clustering_Engine SHALL automatically group similar transactions by description and amount patterns"

**Key Features Delivered:**
- ✅ TF-IDF vectorization for transaction descriptions
- ✅ Amount and date-based feature engineering
- ✅ Feature preprocessing pipeline
- ✅ Comprehensive data validation and cleaning
- ✅ Merchant pattern recognition
- ✅ Scalable and configurable architecture
- ✅ API integration ready
- ✅ Comprehensive testing and validation

## Next Steps

1. **Task 7.2**: Implement clustering algorithms (KMeans, DBSCAN)
2. **Category Assignment**: Map clusters to meaningful categories
3. **Confidence Scoring**: Implement confidence calculation
4. **User Feedback**: Add learning from user corrections
5. **Performance Optimization**: Optimize for large datasets
6. **Model Persistence**: Integrate with model storage system

## Troubleshooting

### Common Issues

1. **Import Errors**: Ensure all dependencies are installed
   ```bash
   pip install pandas numpy scikit-learn
   ```

2. **Memory Issues**: Reduce `max_tfidf_features` for large datasets
   ```python
   config = PreprocessingConfig(max_tfidf_features=500)
   ```

3. **Processing Slow**: Enable parallel processing or batch processing
   ```python
   # Process in smaller batches
   batch_size = 1000
   for batch in batches(transactions, batch_size):
       features = pipeline.transform(batch)
   ```

4. **Feature Dimension Mismatch**: Ensure consistent configuration between fit and transform
   ```python
   # Save and load pipeline to maintain consistency
   pipeline.save_pipeline('pipeline.joblib')
   loaded_pipeline = TransactionPreprocessingPipeline.load_pipeline('pipeline.joblib')
   ```