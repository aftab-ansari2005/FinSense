# Automated Retraining Scheduler

## Overview

The Automated Retraining Scheduler provides intelligent, automated model retraining capabilities for the FinSense ML system. It monitors model performance, data volume, and schedules to automatically trigger retraining when needed, ensuring models stay accurate and up-to-date.

## Features

### 🕐 **Scheduled Retraining**
- Time-based retraining triggers
- Configurable intervals (daily, weekly, monthly)
- Specific time-of-day scheduling
- Model age-based triggers

### 📊 **Performance-Based Retraining**
- Continuous performance monitoring
- Accuracy threshold detection
- Error rate monitoring
- Automatic trigger when performance degrades

### 📈 **Data Volume-Based Retraining**
- Tracks new training data availability
- Triggers retraining when sufficient new samples exist
- Configurable sample thresholds
- Prevents unnecessary retraining

### 🔄 **Intelligent Execution**
- Concurrent retraining limits
- Duplicate prevention (same model)
- Timeout management
- Background execution

### 📝 **Comprehensive Logging**
- Retraining event history
- Performance metrics tracking
- Trigger reason logging
- Success/failure tracking

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│         Automated Retraining Scheduler                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Scheduled   │  │ Performance  │  │ Data Volume  │ │
│  │   Trigger    │  │   Trigger    │  │   Trigger    │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                 │                  │         │
│         └─────────────────┼──────────────────┘         │
│                           │                            │
│                    ┌──────▼───────┐                    │
│                    │  Retraining  │                    │
│                    │   Executor   │                    │
│                    └──────┬───────┘                    │
│                           │                            │
│                    ┌──────▼───────┐                    │
│                    │   Callback   │                    │
│                    │   Registry   │                    │
│                    └──────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

## Usage

### Basic Setup

```python
from src.services.automated_retraining_scheduler import (
    AutomatedRetrainingScheduler,
    RetrainingPolicy,
    RetrainingTrigger
)
from src.services.model_storage import ModelStorageService
from src.services.prediction_metrics import PredictionMetricsService

# Initialize services
storage = ModelStorageService()
metrics = PredictionMetricsService()

# Create scheduler with custom policy
policy = RetrainingPolicy(
    schedule_enabled=True,
    schedule_interval_days=7,
    schedule_time="02:00",
    performance_monitoring_enabled=True,
    min_accuracy_threshold=0.75,
    data_volume_enabled=True,
    min_new_samples_threshold=1000
)

scheduler = AutomatedRetrainingScheduler(storage, metrics, policy)
```

### Register Retraining Callbacks

```python
def retrain_prediction_model(model_type, event):
    """
    Callback function for retraining prediction model
    
    Args:
        model_type: Type of model being retrained
        event: RetrainingEvent with trigger information
        
    Returns:
        dict: Results with version and metrics
    """
    print(f"Retraining {model_type} due to: {event.trigger_reason}")
    
    # Perform actual retraining
    # 1. Load training data
    # 2. Train new model
    # 3. Validate performance
    # 4. Save new version
    
    return {
        "version": "2.1.0",
        "metrics": {
            "accuracy": 0.88,
            "error": 0.12,
            "samples": 5000
        }
    }

# Register callback
scheduler.register_retraining_callback("prediction", retrain_prediction_model)
scheduler.register_retraining_callback("clustering", retrain_clustering_model)
```

### Start the Scheduler

```python
# Start automated monitoring and scheduling
scheduler.start()

# Scheduler now runs in background, checking triggers periodically
```

### Manual Retraining Trigger

```python
# Manually trigger retraining
event = scheduler.trigger_retraining(
    model_type="prediction",
    trigger=RetrainingTrigger.MANUAL,
    reason="Manual trigger for testing new features"
)

if event:
    print(f"Retraining triggered: {event.model_type}")
else:
    print("Retraining blocked (already in progress or limit reached)")
```

### Monitor Retraining Status

```python
# Get active retraining jobs
active = scheduler.get_active_retraining()
for model_type, event in active.items():
    print(f"{model_type}: {event.status} - {event.trigger_reason}")

# Get retraining history
history = scheduler.get_retraining_history(model_type="prediction", limit=10)
for event in history:
    print(f"{event.triggered_at}: {event.status} - {event.trigger.value}")

# Get statistics
stats = scheduler.get_statistics()
print(f"Total retraining events: {stats['total_retraining_events']}")
print(f"Success rate: {stats['success_rate']}%")
print(f"Average duration: {stats['average_duration_seconds']}s")
```

### Update Policy Dynamically

```python
# Update retraining policy without restarting
scheduler.update_policy(
    schedule_interval_days=14,
    min_accuracy_threshold=0.80,
    min_new_samples_threshold=2000
)
```

### Stop the Scheduler

```python
# Stop automated monitoring
scheduler.stop()
```

## Configuration

### RetrainingPolicy Parameters

#### Schedule-Based Triggers
- `schedule_enabled` (bool): Enable scheduled retraining (default: True)
- `schedule_interval_days` (int): Days between scheduled retraining (default: 7)
- `schedule_time` (str): Time of day to run in HH:MM format (default: "02:00")

#### Performance-Based Triggers
- `performance_monitoring_enabled` (bool): Enable performance monitoring (default: True)
- `min_accuracy_threshold` (float): Minimum acceptable accuracy (default: 0.75)
- `max_error_threshold` (float): Maximum acceptable error rate (default: 0.30)
- `performance_check_interval_hours` (int): Hours between checks (default: 6)

#### Data Volume-Based Triggers
- `data_volume_enabled` (bool): Enable data volume monitoring (default: True)
- `min_new_samples_threshold` (int): Minimum new samples to trigger (default: 1000)
- `data_check_interval_hours` (int): Hours between checks (default: 12)

#### Model Age-Based Triggers
- `max_model_age_days` (int): Maximum model age before retraining (default: 30)

#### Execution Settings
- `max_concurrent_retraining` (int): Maximum concurrent retraining jobs (default: 1)
- `retraining_timeout_hours` (int): Timeout for retraining execution (default: 4)

#### Notification Settings
- `notify_on_trigger` (bool): Notify when retraining is triggered (default: True)
- `notify_on_completion` (bool): Notify when retraining completes (default: True)
- `notify_on_failure` (bool): Notify when retraining fails (default: True)

## Retraining Triggers

### 1. Scheduled Trigger
Triggered based on time intervals and model age.

**Example:**
```python
# Automatically triggers every 7 days at 02:00
policy = RetrainingPolicy(
    schedule_enabled=True,
    schedule_interval_days=7,
    schedule_time="02:00"
)
```

### 2. Performance Degradation Trigger
Triggered when model performance falls below thresholds.

**Example:**
```python
# Triggers when accuracy < 0.75 or error > 0.30
policy = RetrainingPolicy(
    performance_monitoring_enabled=True,
    min_accuracy_threshold=0.75,
    max_error_threshold=0.30,
    performance_check_interval_hours=6
)
```

### 3. Data Volume Trigger
Triggered when sufficient new training data is available.

**Example:**
```python
# Triggers when 1000+ new samples are available
policy = RetrainingPolicy(
    data_volume_enabled=True,
    min_new_samples_threshold=1000,
    data_check_interval_hours=12
)
```

### 4. Manual Trigger
Explicitly triggered by administrator or system event.

**Example:**
```python
scheduler.trigger_retraining(
    "prediction",
    RetrainingTrigger.MANUAL,
    "New feature deployment requires retraining"
)
```

## Retraining Event Lifecycle

```
┌─────────┐     ┌─────────┐     ┌───────────┐     ┌───────────┐
│ Pending │ --> │ Running │ --> │ Completed │     │  Failed   │
└─────────┘     └─────────┘     └───────────┘     └───────────┘
     │               │                 │                 │
     │               │                 │                 │
  Triggered      Executing         Success           Error
```

### Event States
- **Pending**: Retraining triggered, waiting to execute
- **Running**: Retraining in progress
- **Completed**: Retraining finished successfully
- **Failed**: Retraining encountered an error

## Integration with ML Services

### Prediction Model Integration

```python
from src.services.lstm_prediction_model import LSTMPredictionModel

def retrain_lstm_model(model_type, event):
    """Retrain LSTM prediction model"""
    # Initialize model
    model = LSTMPredictionModel()
    
    # Load training data
    data = load_training_data(since=event.old_version_date)
    
    # Train model
    history = model.train(data, epochs=50, validation_split=0.2)
    
    # Evaluate performance
    metrics = model.evaluate(validation_data)
    
    # Save new version
    version = storage.save_model(model, model_type, metrics)
    
    return {
        "version": version,
        "metrics": metrics
    }

scheduler.register_retraining_callback("prediction", retrain_lstm_model)
```

### Clustering Model Integration

```python
from src.services.clustering_engine import ClusteringEngine

def retrain_clustering_model(model_type, event):
    """Retrain transaction clustering model"""
    engine = ClusteringEngine()
    
    # Load new transaction data
    transactions = load_new_transactions()
    
    # Retrain clustering model
    engine.fit(transactions)
    
    # Evaluate clustering quality
    metrics = engine.evaluate()
    
    # Save new version
    version = storage.save_model(engine, model_type, metrics)
    
    return {
        "version": version,
        "metrics": metrics
    }

scheduler.register_retraining_callback("clustering", retrain_clustering_model)
```

## Best Practices

### 1. Set Appropriate Thresholds
```python
# Conservative thresholds for critical models
policy = RetrainingPolicy(
    min_accuracy_threshold=0.85,  # Higher accuracy requirement
    max_error_threshold=0.15,      # Lower error tolerance
    min_new_samples_threshold=2000 # More data before retraining
)
```

### 2. Schedule During Low-Traffic Hours
```python
# Run retraining during off-peak hours
policy = RetrainingPolicy(
    schedule_time="02:00",  # 2 AM
    schedule_interval_days=7
)
```

### 3. Implement Robust Callbacks
```python
def robust_retraining_callback(model_type, event):
    try:
        # Validate data availability
        if not has_sufficient_data():
            raise ValueError("Insufficient training data")
        
        # Train with validation
        model = train_model_with_validation()
        
        # Verify improvement
        if not model_improved(model):
            raise ValueError("New model not better than current")
        
        # Save with rollback capability
        version = save_with_rollback(model)
        
        return {"version": version, "metrics": get_metrics(model)}
        
    except Exception as e:
        logger.error(f"Retraining failed: {e}")
        raise
```

### 4. Monitor Retraining Performance
```python
# Regular monitoring
stats = scheduler.get_statistics()

if stats['success_rate'] < 80:
    alert_admin("Low retraining success rate")

if stats['average_duration_seconds'] > 7200:  # 2 hours
    alert_admin("Retraining taking too long")
```

### 5. Implement Gradual Rollout
```python
def retrain_with_ab_testing(model_type, event):
    # Train new model
    new_model = train_new_model()
    
    # Deploy to 10% of traffic first
    deploy_model(new_model, traffic_percentage=10)
    
    # Monitor performance
    if performance_acceptable():
        # Gradually increase to 100%
        deploy_model(new_model, traffic_percentage=100)
    else:
        # Rollback
        rollback_to_previous_version()
    
    return {"version": new_version, "metrics": metrics}
```

## Troubleshooting

### Issue: Retraining Not Triggering

**Check:**
1. Scheduler is started: `scheduler._running == True`
2. Callbacks are registered: `scheduler.retraining_callbacks`
3. Policy is enabled: `policy.schedule_enabled == True`
4. Thresholds are appropriate

**Solution:**
```python
# Verify scheduler status
print(f"Running: {scheduler._running}")
print(f"Registered models: {list(scheduler.retraining_callbacks.keys())}")
print(f"Policy: {scheduler.policy}")

# Manually trigger to test
event = scheduler.trigger_retraining("prediction", RetrainingTrigger.MANUAL, "Test")
```

### Issue: Retraining Fails Repeatedly

**Check:**
1. Callback function errors
2. Data availability
3. Resource constraints (memory, CPU)
4. Model validation logic

**Solution:**
```python
# Check recent failures
history = scheduler.get_retraining_history(limit=10)
failed = [e for e in history if e.status == "failed"]

for event in failed:
    print(f"Failed: {event.error_message}")
    print(f"Reason: {event.trigger_reason}")
```

### Issue: Performance Degradation Not Detected

**Check:**
1. Metrics service is recording data
2. Thresholds are realistic
3. Check interval is appropriate

**Solution:**
```python
# Verify metrics are being recorded
recent_metrics = metrics.get_recent_metrics("prediction", hours=24)
print(f"Metrics count: {len(recent_metrics)}")

# Adjust thresholds if needed
scheduler.update_policy(
    min_accuracy_threshold=0.70,  # Lower threshold
    performance_check_interval_hours=3  # Check more frequently
)
```

## Testing

Run the comprehensive test suite:

```bash
python -m pytest test_automated_retraining_scheduler.py -v
```

### Test Coverage
- ✅ Policy configuration
- ✅ Event lifecycle
- ✅ Callback registration
- ✅ Manual triggering
- ✅ Concurrent retraining limits
- ✅ Duplicate prevention
- ✅ Success/failure handling
- ✅ Performance degradation detection
- ✅ Scheduled retraining
- ✅ Data volume triggers
- ✅ History and statistics
- ✅ Policy updates

## Requirements

- Python 3.8+
- schedule==1.2.0
- threading (built-in)
- logging (built-in)

## License

This automated retraining scheduler is part of the FinSense application and follows the same licensing terms.