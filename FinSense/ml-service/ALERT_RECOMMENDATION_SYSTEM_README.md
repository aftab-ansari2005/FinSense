# Alert and Recommendation System

## Overview

The Alert and Recommendation System is an advanced financial monitoring service that extends the basic Financial Stress Calculator with comprehensive alert management, user preferences, recommendation tracking, and intelligent notification scheduling. It provides personalized financial guidance with configurable thresholds and multi-channel notification support.

## Features

### Core Functionality
- **Enhanced Alert Generation**: Multiple alert types with configurable thresholds
- **User Preference Management**: Customizable notification settings and quiet hours
- **Recommendation Progress Tracking**: Monitor user progress on financial recommendations
- **Alert Cooldown Management**: Prevent alert fatigue with intelligent spacing
- **Multi-Channel Notifications**: Support for dashboard, email, push, and SMS notifications
- **Statistical Analytics**: Comprehensive alert and recommendation analytics

### Alert Types

1. **Stress Threshold Alerts**
   - Triggered when financial stress score exceeds user-defined thresholds
   - Configurable severity levels based on score ranges

2. **Balance Decline Alerts**
   - Monitors projected balance changes over time
   - Alerts for significant balance decreases (default: 20% decline)

3. **Spending Spike Alerts**
   - Detects unusual spending patterns
   - Compares recent spending to historical averages

4. **Income Drop Alerts**
   - Identifies significant income reductions
   - Critical alerts for major income disruptions

5. **Emergency Fund Alerts**
   - Monitors emergency fund adequacy
   - Warns when fund covers less than recommended months

6. **Recurring Payment Alerts**
   - Tracks high recurring expense ratios
   - Alerts when fixed costs consume too much income

7. **Seasonal Risk Alerts**
   - Identifies seasonal spending volatility
   - Warns of potential cash flow timing issues

8. **Prediction Warning Alerts**
   - Based on ML model predictions
   - Proactive alerts for projected financial issues

## API Endpoints

### Core Analysis Endpoint

#### POST /ml/stress-score
Enhanced financial stress analysis with comprehensive alerts and recommendations.

**Request Body:**
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

**Response:**
```json
{
  "user_id": "string",
  "stress_score": "number (0-100)",
  "risk_level": "string",
  "factors": [...],
  "recommendations": [...],
  "calculated_at": "ISO date string",
  "alerts": [
    {
      "alert_id": "string",
      "alert_type": "string",
      "severity": "string",
      "title": "string",
      "message": "string",
      "action_required": "boolean",
      "created_at": "ISO date string",
      "expires_at": "ISO date string"
    }
  ],
  "alert_summary": {
    "total_active": "number",
    "by_severity": {...},
    "action_required": "number"
  },
  "recommendation_summary": {
    "total_recommendations": "number",
    "by_status": {...},
    "average_completion": "number"
  }
}
```

### Alert Management Endpoints

#### GET /ml/alerts/{user_id}
Get active alerts for a user.

**Response:**
```json
{
  "user_id": "string",
  "active_alerts": [...],
  "total_count": "number",
  "timestamp": "ISO date string"
}
```

#### POST /ml/alerts/{user_id}/{alert_id}/acknowledge
Acknowledge a specific alert.

**Response:**
```json
{
  "success": "boolean",
  "message": "string",
  "alert_id": "string",
  "timestamp": "ISO date string"
}
```

#### GET /ml/alerts/{user_id}/statistics?days=30
Get alert statistics for a user.

**Response:**
```json
{
  "user_id": "string",
  "period_days": "number",
  "statistics": {
    "total_alerts": "number",
    "by_type": {...},
    "by_severity": {...},
    "acknowledgment_rate": "number",
    "average_response_time_hours": "number"
  },
  "timestamp": "ISO date string"
}
```

### Recommendation Management Endpoints

#### GET /ml/recommendations/{user_id}
Get recommendation status for a user.

**Response:**
```json
{
  "user_id": "string",
  "recommendations": [
    {
      "recommendation_id": "string",
      "recommendation_type": "string",
      "status": "string",
      "completion_percentage": "number",
      "created_at": "ISO date string",
      "updated_at": "ISO date string",
      "progress_notes": [...]
    }
  ],
  "total_count": "number",
  "timestamp": "ISO date string"
}
```

#### PUT /ml/recommendations/{user_id}/{recommendation_id}/status
Update recommendation progress status.

**Request Body:**
```json
{
  "status": "string (pending|in_progress|completed|dismissed)",
  "progress_note": "string (optional)"
}
```

**Response:**
```json
{
  "success": "boolean",
  "message": "string",
  "recommendation_id": "string",
  "new_status": "string",
  "timestamp": "ISO date string"
}
```

### User Preferences Endpoints

#### GET /ml/alerts/{user_id}/preferences
Get alert preferences for a user.

**Response:**
```json
{
  "user_id": "string",
  "preferences": {
    "enabled_channels": ["string"],
    "quiet_hours_start": "number",
    "quiet_hours_end": "number",
    "max_alerts_per_day": "number",
    "custom_thresholds": {...}
  },
  "timestamp": "ISO date string"
}
```

#### POST /ml/alerts/{user_id}/preferences
Set alert preferences for a user.

**Request Body:**
```json
{
  "enabled_channels": ["dashboard", "email", "push", "sms"],
  "quiet_hours_start": 22,
  "quiet_hours_end": 8,
  "max_alerts_per_day": 5,
  "custom_thresholds": {
    "stress_threshold": 45.0,
    "balance_decline": 0.15,
    "emergency_fund_low": 2.0
  }
}
```

## Configuration

### Default Alert Thresholds

```python
{
    AlertType.STRESS_THRESHOLD: {
        'threshold_value': 50.0,
        'severity': AlertSeverity.WARNING,
        'cooldown_hours': 24
    },
    AlertType.BALANCE_DECLINE: {
        'threshold_value': 0.2,  # 20% decline
        'severity': AlertSeverity.WARNING,
        'cooldown_hours': 24
    },
    AlertType.SPENDING_SPIKE: {
        'threshold_value': 1.5,  # 150% of average
        'severity': AlertSeverity.INFO,
        'cooldown_hours': 24
    },
    AlertType.INCOME_DROP: {
        'threshold_value': 0.3,  # 30% drop
        'severity': AlertSeverity.CRITICAL,
        'cooldown_hours': 24
    },
    AlertType.EMERGENCY_FUND_LOW: {
        'threshold_value': 1.0,  # Less than 1 month
        'severity': AlertSeverity.WARNING,
        'cooldown_hours': 24
    }
}
```

### Alert Severity Levels

- **INFO**: Informational alerts, no immediate action required
- **WARNING**: Important alerts requiring attention
- **CRITICAL**: Urgent alerts requiring immediate action
- **URGENT**: Emergency alerts bypassing quiet hours

### Notification Channels

- **DASHBOARD**: In-app notifications (always enabled)
- **EMAIL**: Email notifications
- **PUSH**: Mobile push notifications
- **SMS**: Text message notifications

## Usage Examples

### Basic Integration

```python
from src.services.alert_recommendation_system import AlertRecommendationSystem

# Initialize system
alert_system = AlertRecommendationSystem()

# Process financial analysis
result = alert_system.process_financial_analysis(
    user_id="user123",
    current_balance=2500.0,
    predictions=[...],
    transaction_history=[...]
)

# Access results
stress_score = result['stress_result']['stress_score']
alerts = result['alerts']
recommendations = result['recommendations']
```

### User Preference Management

```python
from src.services.alert_recommendation_system import (
    UserAlertPreferences, 
    NotificationChannel
)

# Set user preferences
preferences = UserAlertPreferences(
    user_id="user123",
    enabled_channels=[NotificationChannel.DASHBOARD, NotificationChannel.EMAIL],
    quiet_hours_start=22,
    quiet_hours_end=8,
    max_alerts_per_day=3,
    custom_thresholds={
        'stress_threshold': 40.0,
        'balance_decline': 0.15
    }
)

alert_system.set_user_preferences(preferences)
```

### Alert Management

```python
# Get active alerts
active_alerts = alert_system.get_active_alerts("user123")

# Acknowledge an alert
alert_system.acknowledge_alert("user123", "alert_id_123")

# Get alert statistics
stats = alert_system.get_alert_statistics("user123", days=30)
```

### Recommendation Tracking

```python
# Get recommendation status
recommendations = alert_system.get_recommendation_status("user123")

# Update recommendation progress
alert_system.update_recommendation_status(
    "user123", 
    "rec_id_123", 
    "in_progress",
    "Started implementing budget plan"
)
```

## Testing

### Run Comprehensive Tests
```bash
python test_alert_recommendation_system.py
```

### Run API Validation
```bash
python validate_alert_api.py
```

### Test Specific Scenarios
```python
# High stress scenario
test_data = {
    'current_balance': 500.0,
    'predictions': [{'predicted_balance': 0.0, 'day_ahead': 30}],
    'transaction_history': [...]
}

result = alert_system.process_financial_analysis("test_user", **test_data)
```

## Integration Points

### Backend Integration
- Integrates with existing financial stress calculator
- Uses MongoDB models for data persistence
- Connects with user authentication system
- Supports real-time dashboard updates

### Frontend Integration
- Provides structured data for dashboard alerts
- Supports notification components
- Enables user preference management
- Tracks recommendation progress

### External Services
- Email notification service integration
- Push notification service support
- SMS gateway integration
- Analytics and monitoring systems

## Performance Considerations

### Optimization Features
- Alert cooldown management prevents spam
- Efficient in-memory caching for active alerts
- Batch processing for multiple users
- Configurable cleanup of expired alerts

### Scalability
- Stateless design for horizontal scaling
- Database-backed persistence (production ready)
- Async notification processing support
- Rate limiting and throttling

## Security Features

### Data Protection
- No persistent storage of sensitive financial data
- Secure handling of user preferences
- Audit logging for alert acknowledgments
- Privacy-compliant recommendation tracking

### Access Control
- User-specific alert and recommendation access
- Secure API endpoint authentication
- Role-based preference management
- Data isolation between users

## Monitoring and Analytics

### Key Metrics
- Alert generation rates by type and severity
- User acknowledgment rates and response times
- Recommendation completion rates
- System performance and error rates

### Logging
- Comprehensive alert lifecycle logging
- User interaction tracking
- Performance monitoring
- Error and exception logging

## Future Enhancements

### Planned Features
- Machine learning-based alert personalization
- Advanced notification scheduling algorithms
- Integration with external calendar systems
- Predictive alert generation based on patterns

### Scalability Improvements
- Database-backed persistence layer
- Distributed alert processing
- Real-time notification streaming
- Advanced analytics and reporting

## Requirements Validation

### Completed Requirements
- ✅ **Requirements 3.3**: Financial stress score calculation and display
- ✅ **Requirements 4.3**: Prominent stress alert display
- ✅ **Alert Threshold Management**: Configurable thresholds per user
- ✅ **Recommendation Generation Logic**: Enhanced personalized recommendations
- ✅ **Multi-channel Notifications**: Support for various notification types

### Design Properties Validated
- ✅ **Property 11**: Stress Score Calculation
- ✅ **Property 16**: Alert Display Consistency
- ✅ Enhanced alert management beyond basic requirements

## Support and Troubleshooting

### Common Issues
1. **Alerts not generating**: Check user preferences and thresholds
2. **Too many alerts**: Adjust max_alerts_per_day setting
3. **Missing notifications**: Verify enabled_channels configuration
4. **Performance issues**: Review alert cleanup and caching settings

### Debug Information
- Enable detailed logging for alert generation
- Monitor alert statistics for unusual patterns
- Check user preference configurations
- Validate API request/response formats

For additional support, refer to the test files and validation scripts for usage examples and troubleshooting guidance.