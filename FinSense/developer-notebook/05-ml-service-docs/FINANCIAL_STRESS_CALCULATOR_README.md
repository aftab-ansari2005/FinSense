# Financial Stress Calculator

## Overview

The Financial Stress Calculator is a comprehensive service that analyzes a user's financial health and provides stress scores, risk assessment, and personalized recommendations. It evaluates multiple financial factors to determine the likelihood of financial distress and suggests actionable steps to improve financial stability.

## Features

### Core Functionality
- **Stress Score Calculation**: Generates a 0-100 stress score based on multiple financial factors
- **Risk Level Assessment**: Categorizes users into LOW, MEDIUM, HIGH, or CRITICAL risk levels
- **Factor Analysis**: Identifies specific areas contributing to financial stress
- **Personalized Recommendations**: Provides actionable advice based on individual financial patterns
- **Threshold-based Alerts**: Generates alerts when stress levels exceed safe thresholds

### Analyzed Factors

1. **Balance Projection** (25% weight)
   - Analyzes predicted balance changes over 30 days
   - Triggers alerts for significant balance declines

2. **Spending Trend** (20% weight)
   - Evaluates spending volatility and unpredictability
   - Identifies irregular spending patterns

3. **Income Volatility** (15% weight)
   - Assesses income stability and consistency
   - Flags unstable income sources

4. **Emergency Fund** (15% weight)
   - Calculates months of expenses covered by current balance
   - Recommends 3-6 months of emergency savings

5. **Debt Ratio** (10% weight)
   - Analyzes spending vs. income ratios
   - Identifies negative cash flow situations

6. **Recurring Expenses** (10% weight)
   - Evaluates fixed costs as percentage of income
   - Identifies high recurring expense burdens

7. **Seasonal Patterns** (5% weight)
   - Analyzes seasonal spending variations
   - Identifies potential cash flow timing issues

## API Endpoint

### POST /ml/stress-score

Calculate financial stress score for a user.

#### Request Schema
```json
{
  "user_id": "string",
  "current_balance": "number",
  "predictions": [
    {
      "date": "ISO date string",
      "predicted_balance": "number",
      "day_ahead": "number"
    }
  ],
  "transaction_history": [
    {
      "id": "string",
      "date": "ISO date string",
      "amount": "number",
      "description": "string"
    }
  ]
}
```

#### Response Schema
```json
{
  "user_id": "string",
  "stress_score": "number (0-100)",
  "risk_level": "string (low|medium|high|critical)",
  "factors": [
    {
      "category": "string",
      "impact": "number (0-1)",
      "description": "string",
      "severity": "string (low|medium|high)",
      "value": "number",
      "threshold": "number"
    }
  ],
  "recommendations": [
    {
      "type": "string",
      "priority": "string (low|medium|high|urgent)",
      "title": "string",
      "description": "string",
      "potential_impact": "number (0-1)",
      "action_items": ["string"]
    }
  ],
  "calculated_at": "ISO date string",
  "alerts": [
    {
      "type": "string",
      "severity": "string",
      "message": "string",
      "action_required": "boolean"
    }
  ],
  "metrics": {
    "current_balance": "number",
    "predicted_balance_30d": "number",
    "monthly_spending_avg": "number",
    "monthly_income_avg": "number",
    "spending_volatility": "number",
    "savings_rate": "number"
  }
}
```

## Risk Levels

### LOW (0-25)
- Minimal financial stress
- Stable income and spending patterns
- Adequate emergency fund
- Positive savings rate

### MEDIUM (25-50)
- Moderate financial stress
- Some volatility in income or spending
- Limited emergency fund
- Recommendations for optimization

### HIGH (50-75)
- Significant financial stress
- High volatility or declining balance
- Insufficient emergency fund
- Urgent recommendations required

### CRITICAL (75-100)
- Severe financial distress
- Negative cash flow or rapid balance decline
- Immediate intervention required
- Emergency financial planning needed

## Recommendation Types

### Reduce Spending
- Focus on cutting discretionary expenses
- Review and cancel subscriptions
- Reduce entertainment and dining costs

### Increase Income
- Explore side income opportunities
- Negotiate salary improvements
- Develop higher-paying skills

### Build Emergency Fund
- Set up automatic savings transfers
- Save windfalls and bonuses
- Use high-yield savings accounts

### Optimize Categories
- Create consistent spending budgets
- Use spending tracking tools
- Review expenses regularly

### Review Subscriptions
- Audit all recurring payments
- Negotiate better service rates
- Cancel unused memberships

### Debt Management
- Address negative cash flow
- Consider debt consolidation
- Seek financial counseling

### Budget Planning
- Create emergency budget plans
- Set strict spending limits
- Track daily expenses

## Usage Examples

### Basic Usage
```python
from src.services.financial_stress_calculator import FinancialStressCalculator

calculator = FinancialStressCalculator()

result = calculator.calculate_stress_score(
    user_id="user123",
    current_balance=2500.0,
    predictions=[...],  # Balance predictions
    transaction_history=[...]  # Transaction data
)

print(f"Stress Score: {result.stress_score:.1f}")
print(f"Risk Level: {result.risk_level.value}")
```

### API Usage
```bash
curl -X POST http://localhost:5001/ml/stress-score \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "current_balance": 2500.0,
    "predictions": [...],
    "transaction_history": [...]
  }'
```

## Testing

### Run Unit Tests
```bash
python test_financial_stress_calculator.py
```

### Run Validation Tests
```bash
python validate_financial_stress.py
```

### Test API Endpoint
```bash
python test_stress_api.py
```

## Configuration

### Factor Weights
The calculator uses weighted scoring for different factors:
- Balance Projection: 25%
- Spending Trend: 20%
- Income Volatility: 15%
- Emergency Fund: 15%
- Debt Ratio: 10%
- Recurring Expenses: 10%
- Seasonal Patterns: 5%

### Risk Thresholds
- LOW: < 25.0
- MEDIUM: 25.0 - 49.9
- HIGH: 50.0 - 74.9
- CRITICAL: ≥ 75.0

## Implementation Details

### Key Classes

#### FinancialStressCalculator
Main calculator class that orchestrates the stress analysis.

#### StressFactor
Represents individual stress factors with impact, severity, and descriptions.

#### Recommendation
Represents actionable recommendations with priority and potential impact.

#### FinancialStressResult
Complete result object containing all analysis outputs.

### Algorithms

#### Stress Score Calculation
1. Analyze each financial factor
2. Calculate weighted impact scores
3. Normalize to 0-100 scale
4. Determine risk level based on thresholds

#### Recommendation Generation
1. Sort factors by impact
2. Generate specific recommendations for top factors
3. Add emergency recommendations for high-risk users
4. Prioritize and deduplicate recommendations

## Integration

### Requirements Validation
- **Property 11**: Stress Score Calculation - ✅ Implemented
- **Requirements 3.3**: Calculate and display Financial_Stress_Score - ✅ Implemented

### Backend Integration
The calculator integrates with:
- LSTM prediction models for balance forecasts
- Transaction categorization services
- User feedback learning systems
- Model storage and versioning

### Frontend Integration
Results can be displayed in:
- Dashboard stress indicators
- Alert notifications
- Recommendation cards
- Progress tracking charts

## Performance

### Typical Processing Times
- Small dataset (< 100 transactions): < 100ms
- Medium dataset (100-1000 transactions): < 500ms
- Large dataset (> 1000 transactions): < 2s

### Memory Usage
- Minimal memory footprint
- Efficient pandas operations
- No persistent state storage

## Error Handling

### Input Validation
- Validates required fields
- Handles missing or invalid data
- Provides descriptive error messages

### Edge Cases
- Empty transaction history
- Negative balances
- Missing prediction data
- Invalid date formats

### Graceful Degradation
- Continues analysis with partial data
- Provides warnings for insufficient data
- Maintains service availability

## Security Considerations

### Data Privacy
- No persistent storage of user data
- Processes data in memory only
- Sanitizes log outputs

### Input Sanitization
- Validates all numeric inputs
- Prevents injection attacks
- Limits data size and complexity

## Monitoring and Logging

### Performance Metrics
- Calculation duration tracking
- Factor analysis statistics
- Recommendation effectiveness

### Error Logging
- Detailed error messages
- Stack trace capture
- Performance bottleneck identification

## Future Enhancements

### Planned Features
- Machine learning-based factor weighting
- Historical stress trend analysis
- Comparative benchmarking
- Advanced recommendation personalization

### Scalability Improvements
- Batch processing capabilities
- Caching for repeated calculations
- Distributed processing support

## Support

For issues or questions regarding the Financial Stress Calculator:
1. Check the test files for usage examples
2. Review the validation scripts for troubleshooting
3. Examine the API endpoint documentation
4. Consult the integration examples