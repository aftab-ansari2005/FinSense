"""
Tests for Automated Retraining Scheduler

Tests the automated model retraining functionality including:
- Scheduled retraining triggers
- Performance-based retraining
- Data volume-based retraining
- Retraining execution and callbacks
- Policy management
"""

import pytest
import time
from datetime import datetime, timedelta
from unittest.mock import Mock, MagicMock, patch
from src.services.automated_retraining_scheduler import (
    AutomatedRetrainingScheduler,
    RetrainingPolicy,
    RetrainingTrigger,
    RetrainingEvent
)


class TestRetrainingPolicy:
    """Test RetrainingPolicy configuration"""
    
    def test_default_policy(self):
        """Test default policy values"""
        policy = RetrainingPolicy()
        
        assert policy.schedule_enabled is True
        assert policy.schedule_interval_days == 7
        assert policy.performance_monitoring_enabled is True
        assert policy.data_volume_enabled is True
        assert policy.max_concurrent_retraining == 1
    
    def test_custom_policy(self):
        """Test custom policy configuration"""
        policy = RetrainingPolicy(
            schedule_interval_days=14,
            min_accuracy_threshold=0.80,
            min_new_samples_threshold=2000
        )
        
        assert policy.schedule_interval_days == 14
        assert policy.min_accuracy_threshold == 0.80
        assert policy.min_new_samples_threshold == 2000


class TestRetrainingEvent:
    """Test RetrainingEvent data structure"""
    
    def test_event_creation(self):
        """Test creating a retraining event"""
        event = RetrainingEvent(
            model_type="prediction",
            trigger=RetrainingTrigger.SCHEDULED,
            triggered_at=datetime.now(),
            trigger_reason="Scheduled retraining"
        )
        
        assert event.model_type == "prediction"
        assert event.trigger == RetrainingTrigger.SCHEDULED
        assert event.status == "pending"
        assert event.trigger_reason == "Scheduled retraining"
    
    def test_event_lifecycle(self):
        """Test event status transitions"""
        event = RetrainingEvent(
            model_type="clustering",
            trigger=RetrainingTrigger.PERFORMANCE_DEGRADATION,
            triggered_at=datetime.now()
        )
        
        # Initial state
        assert event.status == "pending"
        assert event.started_at is None
        assert event.completed_at is None
        
        # Running state
        event.status = "running"
        event.started_at = datetime.now()
        assert event.status == "running"
        
        # Completed state
        event.status = "completed"
        event.completed_at = datetime.now()
        event.new_version = "2.0.0"
        assert event.status == "completed"
        assert event.new_version == "2.0.0"


class TestAutomatedRetrainingScheduler:
    """Test AutomatedRetrainingScheduler functionality"""
    
    @pytest.fixture
    def mock_storage(self):
        """Create mock model storage service"""
        storage = Mock()
        storage.list_models = Mock(return_value=[])
        return storage
    
    @pytest.fixture
    def mock_metrics(self):
        """Create mock prediction metrics service"""
        metrics = Mock()
        metrics.get_recent_metrics = Mock(return_value=[])
        return metrics
    
    @pytest.fixture
    def scheduler(self, mock_storage, mock_metrics):
        """Create scheduler instance"""
        policy = RetrainingPolicy(
            schedule_enabled=False,  # Disable for testing
            performance_monitoring_enabled=False,
            data_volume_enabled=False
        )
        return AutomatedRetrainingScheduler(mock_storage, mock_metrics, policy)
    
    def test_scheduler_initialization(self, scheduler):
        """Test scheduler initialization"""
        assert scheduler.storage is not None
        assert scheduler.metrics is not None
        assert scheduler.policy is not None
        assert len(scheduler.retraining_events) == 0
        assert len(scheduler.active_retraining) == 0
    
    def test_register_callback(self, scheduler):
        """Test registering retraining callbacks"""
        callback = Mock()
        
        scheduler.register_retraining_callback("prediction", callback)
        
        assert "prediction" in scheduler.retraining_callbacks
        assert scheduler.retraining_callbacks["prediction"] == callback
    
    def test_trigger_retraining(self, scheduler):
        """Test triggering retraining manually"""
        # Register callback
        callback = Mock(return_value={"version": "2.0.0", "metrics": {"accuracy": 0.85}})
        scheduler.register_retraining_callback("prediction", callback)
        
        # Trigger retraining
        event = scheduler.trigger_retraining(
            "prediction",
            RetrainingTrigger.MANUAL,
            "Manual trigger for testing"
        )
        
        assert event is not None
        assert event.model_type == "prediction"
        assert event.trigger == RetrainingTrigger.MANUAL
        assert event.status == "pending"
        
        # Wait for execution
        time.sleep(0.5)
        
        # Check callback was called
        assert callback.called
    
    def test_concurrent_retraining_limit(self, scheduler):
        """Test concurrent retraining limit"""
        # Set limit to 1
        scheduler.policy.max_concurrent_retraining = 1
        
        # Register slow callback
        def slow_callback(model_type, event):
            time.sleep(1)
            return {"version": "2.0.0"}
        
        scheduler.register_retraining_callback("model1", slow_callback)
        scheduler.register_retraining_callback("model2", slow_callback)
        
        # Trigger first retraining
        event1 = scheduler.trigger_retraining("model1", RetrainingTrigger.MANUAL)
        assert event1 is not None
        
        # Try to trigger second retraining (should be blocked)
        time.sleep(0.1)  # Let first one start
        event2 = scheduler.trigger_retraining("model2", RetrainingTrigger.MANUAL)
        assert event2 is None  # Blocked by concurrent limit
    
    def test_duplicate_retraining_prevention(self, scheduler):
        """Test prevention of duplicate retraining for same model"""
        def slow_callback(model_type, event):
            time.sleep(1)
            return {"version": "2.0.0"}
        
        scheduler.register_retraining_callback("prediction", slow_callback)
        
        # Trigger first retraining
        event1 = scheduler.trigger_retraining("prediction", RetrainingTrigger.MANUAL)
        assert event1 is not None
        
        # Try to trigger again for same model (should be blocked)
        time.sleep(0.1)
        event2 = scheduler.trigger_retraining("prediction", RetrainingTrigger.MANUAL)
        assert event2 is None  # Blocked because already retraining
    
    def test_retraining_success(self, scheduler):
        """Test successful retraining execution"""
        callback = Mock(return_value={
            "version": "2.1.0",
            "metrics": {"accuracy": 0.88, "error": 0.12}
        })
        scheduler.register_retraining_callback("prediction", callback)
        
        event = scheduler.trigger_retraining(
            "prediction",
            RetrainingTrigger.PERFORMANCE_DEGRADATION,
            "Performance below threshold"
        )
        
        # Wait for completion
        time.sleep(0.5)
        
        # Check event was updated
        assert event.status == "completed"
        assert event.new_version == "2.1.0"
        assert event.performance_metrics["accuracy"] == 0.88
        assert event.started_at is not None
        assert event.completed_at is not None
    
    def test_retraining_failure(self, scheduler):
        """Test retraining failure handling"""
        def failing_callback(model_type, event):
            raise ValueError("Retraining failed")
        
        scheduler.register_retraining_callback("prediction", failing_callback)
        
        event = scheduler.trigger_retraining("prediction", RetrainingTrigger.MANUAL)
        
        # Wait for completion
        time.sleep(0.5)
        
        # Check event shows failure
        assert event.status == "failed"
        assert event.error_message is not None
        assert "Retraining failed" in event.error_message
    
    def test_performance_degradation_check(self, scheduler, mock_metrics):
        """Test performance degradation detection"""
        # Set up policy
        scheduler.policy.performance_monitoring_enabled = True
        scheduler.policy.min_accuracy_threshold = 0.80
        scheduler.policy.max_error_threshold = 0.25
        
        # Register callback
        callback = Mock(return_value={"version": "2.0.0"})
        scheduler.register_retraining_callback("prediction", callback)
        
        # Mock metrics showing degraded performance
        mock_metrics.get_recent_metrics.return_value = [
            {"accuracy": 0.75, "error": 0.30},
            {"accuracy": 0.72, "error": 0.32},
            {"accuracy": 0.70, "error": 0.35}
        ]
        
        # Run performance check
        scheduler._check_performance_degradation()
        
        # Wait for execution
        time.sleep(0.5)
        
        # Check retraining was triggered
        assert len(scheduler.retraining_events) > 0
        event = scheduler.retraining_events[0]
        assert event.trigger == RetrainingTrigger.PERFORMANCE_DEGRADATION
        assert "accuracy" in event.trigger_reason.lower()
    
    def test_scheduled_retraining_check(self, scheduler, mock_storage):
        """Test scheduled retraining trigger"""
        # Set up policy
        scheduler.policy.schedule_enabled = True
        scheduler.policy.schedule_interval_days = 7
        
        # Register callback
        callback = Mock(return_value={"version": "2.0.0"})
        scheduler.register_retraining_callback("prediction", callback)
        
        # Mock old model
        old_date = datetime.now() - timedelta(days=10)
        mock_storage.list_models.return_value = [
            {"version": "1.0.0", "created_at": old_date}
        ]
        
        # Run scheduled check
        scheduler._check_scheduled_retraining()
        
        # Wait for execution
        time.sleep(0.5)
        
        # Check retraining was triggered
        assert len(scheduler.retraining_events) > 0
        event = scheduler.retraining_events[0]
        assert event.trigger == RetrainingTrigger.SCHEDULED
    
    def test_data_volume_check(self, scheduler):
        """Test data volume-based retraining trigger"""
        # Set up policy
        scheduler.policy.data_volume_enabled = True
        scheduler.policy.min_new_samples_threshold = 1000
        
        # Register callback
        callback = Mock(return_value={"version": "2.0.0"})
        scheduler.register_retraining_callback("prediction", callback)
        
        # Mock sufficient new data
        scheduler._count_new_samples_since = Mock(return_value=1500)
        scheduler.storage.list_models.return_value = [
            {"version": "1.0.0", "created_at": datetime.now() - timedelta(days=5)}
        ]
        
        # Run data volume check
        scheduler._check_data_volume()
        
        # Wait for execution
        time.sleep(0.5)
        
        # Check retraining was triggered
        assert len(scheduler.retraining_events) > 0
        event = scheduler.retraining_events[0]
        assert event.trigger == RetrainingTrigger.DATA_VOLUME
        assert "1500" in event.trigger_reason
    
    def test_get_retraining_history(self, scheduler):
        """Test retrieving retraining history"""
        # Create some events
        for i in range(5):
            event = RetrainingEvent(
                model_type="prediction",
                trigger=RetrainingTrigger.MANUAL,
                triggered_at=datetime.now() - timedelta(hours=i),
                status="completed"
            )
            scheduler.retraining_events.append(event)
        
        # Get history
        history = scheduler.get_retraining_history(limit=3)
        
        assert len(history) == 3
        # Should be sorted by triggered_at descending
        assert history[0].triggered_at > history[1].triggered_at
    
    def test_get_retraining_history_filtered(self, scheduler):
        """Test retrieving filtered retraining history"""
        # Create events for different models
        for model_type in ["prediction", "clustering", "prediction"]:
            event = RetrainingEvent(
                model_type=model_type,
                trigger=RetrainingTrigger.MANUAL,
                triggered_at=datetime.now(),
                status="completed"
            )
            scheduler.retraining_events.append(event)
        
        # Get history for specific model
        history = scheduler.get_retraining_history(model_type="prediction")
        
        assert len(history) == 2
        assert all(e.model_type == "prediction" for e in history)
    
    def test_get_statistics(self, scheduler):
        """Test getting retraining statistics"""
        # Create some events
        for i in range(10):
            status = "completed" if i < 7 else "failed"
            trigger = RetrainingTrigger.SCHEDULED if i % 2 == 0 else RetrainingTrigger.PERFORMANCE_DEGRADATION
            
            event = RetrainingEvent(
                model_type="prediction",
                trigger=trigger,
                triggered_at=datetime.now() - timedelta(hours=i),
                started_at=datetime.now() - timedelta(hours=i, minutes=5),
                completed_at=datetime.now() - timedelta(hours=i, minutes=3),
                status=status
            )
            scheduler.retraining_events.append(event)
        
        # Get statistics
        stats = scheduler.get_statistics()
        
        assert stats["total_retraining_events"] == 10
        assert stats["completed"] == 7
        assert stats["failed"] == 3
        assert stats["success_rate"] == 70.0
        assert "trigger_counts" in stats
        assert stats["trigger_counts"]["scheduled"] == 5
        assert stats["trigger_counts"]["performance_degradation"] == 5
    
    def test_update_policy(self, scheduler):
        """Test updating retraining policy"""
        original_interval = scheduler.policy.schedule_interval_days
        
        scheduler.update_policy(
            schedule_interval_days=14,
            min_accuracy_threshold=0.85
        )
        
        assert scheduler.policy.schedule_interval_days == 14
        assert scheduler.policy.min_accuracy_threshold == 0.85
        assert scheduler.policy.schedule_interval_days != original_interval
    
    def test_get_active_retraining(self, scheduler):
        """Test getting active retraining jobs"""
        def slow_callback(model_type, event):
            time.sleep(1)
            return {"version": "2.0.0"}
        
        scheduler.register_retraining_callback("prediction", slow_callback)
        
        # Trigger retraining
        event = scheduler.trigger_retraining("prediction", RetrainingTrigger.MANUAL)
        
        # Check active retraining
        time.sleep(0.1)
        active = scheduler.get_active_retraining()
        
        assert "prediction" in active
        assert active["prediction"].model_type == "prediction"


def test_retraining_trigger_enum():
    """Test RetrainingTrigger enum"""
    assert RetrainingTrigger.SCHEDULED.value == "scheduled"
    assert RetrainingTrigger.PERFORMANCE_DEGRADATION.value == "performance_degradation"
    assert RetrainingTrigger.DATA_VOLUME.value == "data_volume"
    assert RetrainingTrigger.MANUAL.value == "manual"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
