# User Feedback Learning System

## Overview

The User Feedback Learning System is a core component of the FinSense ML service that enables the system to learn from user corrections and improve transaction categorization accuracy over time. This system implements incremental learning capabilities that adapt to individual user preferences and patterns.

## Key Features

### 1. Pattern Learning
- **Merchant Recognition**: Learns to identify merchants from transaction descriptions
- **Keyword Extraction**: Identifies category-specific keywords and phrases
- **Amount-based Patterns**: Recognizes spending patterns based on transaction amounts
- **Temporal Patterns**: Considers transaction timing and frequency

### 2. Category Mapping
- **User-specific Mappings**: Tracks how users prefer to categorize transactions
- **Confidence Tracking**: Monitors the reliability of category assignments
- **Mapping Evolution**: Adapts to changing user preferences over time

### 3. Confidence Adjustment
- **Similarity-based Learning**: Improves confidence for similar transactions
- **Pattern Reinforcement**: Strengthens patterns with consistent corrections
- **Uncertainty Handling**: Flags transactions that need user review

### 4. Incremental Learning
- **Real-time Updates**: Applies learning immediately after corrections
- **Memory Management**: Efficiently manages learning data storage
- **Pattern Aging**: Removes outdated patterns to maintain relevance

## Architecture

### Core Components

#### UserFeedbackLearningService
The main service class that orchestrates all learning activities:

```python
from src.services.user_feedback_learning import UserFeedbackLearningService, UserCorrection

# Initialize the service
learning_service = UserFeedbackLearningService()

# Add a user correction
correction = UserCorrection(
    transaction_id="txn_001",
    user_id="user_123",
    original_category="Other",
    corrected_category="Groceries",
    confidence_score=0.4,
    transaction_description="WALMART SUPERCENTER #1234",
    transaction_amount=-85.67,
    transaction_date=datetime.now(),
    correction_timestamp=datetime.now()
)

result = learning_service.add_user_correction(correction)
```

#### UserCorrection
Data structure representing a user's categorization correction:

```python
@dataclass
class UserCorrection:
    transaction_id: str
    user_id: str
    original_category: str
    corrected_category: str
    confidence_score: float
    transaction_description: str
    transaction_amount: float
    transaction_date: datetime
    correction_timestamp: datetime
    feedback_type: str = "manual_correction"
```

#### LearningConfig
Configuration class for customizing learning behavior:

```python
@dataclass
class LearningConfig:
    learning_rate: float = 0.1
    min_corrections_for_pattern: int = 3
    max_pattern_age_days: int = 90
    confidence_boost_factor: float = 0.2
    similarity_threshold: float = 0.8
    enable_pattern_learning: bool = True
    enable_category_mapping: bool = True
    enable_confidence_adjustment: bool = True
```

## Integration with Clustering Engine

The learning system is integrated with the `TransactionClusteringEngine` to provide personalized categorization:

```python
from src.services.clustering_engine import TransactionClusteringEngine

# Initialize clustering engine
clustering_engine = TransactionClusteringEngine()

# Add user correction
correction = UserCorrection(...)
clustering_engine.add_user_correction(correction)

# Get improved predictions
predictions = clustering_engine.predict(features, user_id="user_123", transactions_df=df)
```

## API Endpoints

### Submit User Corrections
```http
POST /ml/learning/submit-correction
Content-Type: application/json

{
  "corrections": [
    {
      "transaction_id": "txn_001",
      "user_id": "user_123",
      "original_category": "Other",
      "corrected_category": "Groceries",
      "confidence_score": 0.4,
      "transaction_description": "WALMART SUPERCENTER #1234",
      "transaction_amount": -85.67,
      "transaction_date": "2024-01-15T10:30:00Z",
      "feedback_type": "manual_correction"
    }
  ]
}
```

### Get User Learning Statistics
```http
GET /ml/learning/stats/{user_id}
```

Response:
```json
{
  "success": true,
  "user_stats": {
    "user_id": "user_123",
    "total_corrections": 25,
    "patterns_learned": 12,
    "effective_patterns": 8,
    "category_mappings": 5,
    "most_corrected_categories": {
      "Groceries": 8,
      "Gas & Fuel": 5,
      "Restaurants": 4
    },
    "learning_effectiveness": 0.67,
    "recent_corrections": 3
  }
}
```

### Get Global Learning Statistics
```http
GET /ml/learning/stats/global
```

### Export Learned Patterns
```http
GET /ml/learning/patterns/export?user_id=user_123
```

### Import Learned Patterns
```http
POST /ml/learning/patterns/import
Content-Type: application/json

{
  "patterns_data": {
    "user_id": "user_123",
    "patterns": {...},
    "category_mappings": {...}
  }
}
```

## Learning Algorithms

### 1. Pattern Extraction

The system extracts various types of patterns from transaction descriptions:

#### Merchant Patterns
- Identifies merchant names using regex patterns
- Examples: `merchant_walmart`, `merchant_starbucks`

#### Keyword Patterns
- Recognizes category-specific keywords
- Examples: `keyword_grocery`, `keyword_gas`, `keyword_coffee`

#### Amount Patterns
- Categorizes transactions by amount ranges
- Examples: `amount_small` (<$10), `amount_large` ($50-$200)

### 2. Pattern Learning Process

1. **Pattern Extraction**: Extract patterns from transaction description
2. **Pattern Storage**: Store patterns with metadata (count, confidence, examples)
3. **Pattern Reinforcement**: Increase confidence for repeated patterns
4. **Pattern Application**: Apply learned patterns to new transactions

### 3. Confidence Calculation

The system calculates confidence scores based on:
- Pattern frequency and consistency
- Transaction similarity
- User correction history
- Pattern age and relevance

### 4. Similarity Matching

Transactions are compared using:
- Description word overlap (Jaccard similarity)
- Amount similarity (relative difference)
- Weighted combination of factors

## Performance Optimization

### Memory Management
- **Correction Limit**: Maintains a maximum number of stored corrections
- **Pattern Cleanup**: Removes old and unused patterns
- **Efficient Storage**: Uses optimized data structures

### Learning Efficiency
- **Incremental Updates**: Applies learning without full retraining
- **Pattern Caching**: Caches frequently used patterns
- **Lazy Evaluation**: Computes patterns only when needed

### Scalability
- **User Isolation**: Maintains separate patterns per user
- **Batch Processing**: Supports bulk correction processing
- **Asynchronous Learning**: Non-blocking learning updates

## Configuration Options

### Learning Parameters
```python
config = LearningConfig(
    learning_rate=0.1,              # How quickly to adapt to new patterns
    min_corrections_for_pattern=3,   # Minimum corrections to establish pattern
    max_pattern_age_days=90,        # Maximum age for patterns
    confidence_boost_factor=0.2     # Confidence increase per correction
)
```

### Pattern Matching
```python
config = LearningConfig(
    similarity_threshold=0.8,       # Minimum similarity for pattern matching
    description_weight=0.7,         # Weight for description similarity
    amount_weight=0.3              # Weight for amount similarity
)
```

### Storage Management
```python
config = LearningConfig(
    max_corrections_stored=10000,   # Maximum corrections to store
    cleanup_interval_days=30        # Cleanup frequency
)
```

## Testing

The system includes comprehensive tests covering:

### Unit Tests
- Pattern extraction accuracy
- Learning algorithm correctness
- Configuration validation
- Edge case handling

### Integration Tests
- API endpoint functionality
- Database integration
- Clustering engine integration
- Performance benchmarks

### Property-based Tests
- Learning consistency across inputs
- Pattern stability over time
- Confidence score validity
- Memory usage bounds

Run tests with:
```bash
cd ml-service
python -m pytest test_user_feedback_learning.py -v
```

## Monitoring and Analytics

### Learning Metrics
- **Correction Rate**: Number of corrections per user
- **Pattern Effectiveness**: Success rate of learned patterns
- **Confidence Improvement**: Average confidence increase
- **Category Distribution**: Most frequently corrected categories

### Performance Metrics
- **Learning Speed**: Time to establish new patterns
- **Memory Usage**: Storage requirements for patterns
- **Prediction Accuracy**: Improvement in categorization accuracy
- **User Satisfaction**: Reduction in correction frequency

### Alerts and Notifications
- **Low Learning Rate**: Alert when patterns aren't being learned
- **High Memory Usage**: Warning when storage limits are approached
- **Pattern Conflicts**: Notification of conflicting user preferences
- **Accuracy Degradation**: Alert when accuracy decreases

## Best Practices

### For Developers

1. **Pattern Design**: Create meaningful and stable patterns
2. **Memory Management**: Implement proper cleanup mechanisms
3. **Error Handling**: Handle edge cases gracefully
4. **Testing**: Write comprehensive tests for all scenarios
5. **Documentation**: Maintain clear documentation

### For Users

1. **Consistent Corrections**: Provide consistent categorization feedback
2. **Timely Feedback**: Submit corrections promptly for better learning
3. **Quality over Quantity**: Focus on meaningful corrections
4. **Pattern Awareness**: Understand how patterns are learned

### For System Administrators

1. **Monitor Performance**: Track learning metrics regularly
2. **Manage Storage**: Implement appropriate cleanup policies
3. **Tune Parameters**: Adjust configuration based on usage patterns
4. **Backup Patterns**: Regularly backup learned patterns

## Troubleshooting

### Common Issues

#### Patterns Not Learning
- Check minimum correction threshold
- Verify pattern extraction logic
- Ensure sufficient training data

#### Low Confidence Scores
- Review similarity thresholds
- Check pattern age limits
- Validate correction quality

#### Memory Issues
- Implement pattern cleanup
- Reduce storage limits
- Optimize data structures

#### Performance Problems
- Profile learning algorithms
- Optimize pattern matching
- Implement caching strategies

### Debug Tools

```python
# Get detailed learning statistics
stats = learning_service.get_user_learning_stats(user_id)
print(f"Learning effectiveness: {stats['learning_effectiveness']}")

# Export patterns for analysis
patterns = learning_service.export_learned_patterns(user_id)
print(f"Patterns learned: {len(patterns['patterns'])}")

# Check pattern details
for pattern, data in patterns['patterns'].items():
    print(f"{pattern}: {data['count']} corrections, {data['confidence']} confidence")
```

## Future Enhancements

### Planned Features
- **Deep Learning Integration**: Neural network-based pattern learning
- **Cross-user Learning**: Learn from similar users' patterns
- **Temporal Pattern Recognition**: Time-based spending pattern learning
- **Advanced NLP**: Better transaction description understanding

### Research Areas
- **Federated Learning**: Privacy-preserving cross-user learning
- **Active Learning**: Intelligent correction request strategies
- **Explainable AI**: Better explanation of learned patterns
- **Continuous Learning**: Online learning without catastrophic forgetting

## Contributing

To contribute to the User Feedback Learning System:

1. **Fork the Repository**: Create your own fork
2. **Create Feature Branch**: Work on specific features
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