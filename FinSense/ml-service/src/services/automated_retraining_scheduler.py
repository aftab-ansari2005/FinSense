"""
Automated Retraining Scheduler

This module provides automated model retraining capabilities with:
- Scheduled retraining based on time intervals
- Performance-based retraining triggers
- Data volume-based retraining
- Configurable retraining policies
- Model performance monitoring
"""

import logging
import threading
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass, field
from enum import Enum
import schedule

logger = logging.getLogger(__name__)


class RetrainingTrigger(Enum):
    """Types of retraining triggers"""
    SCHEDULED = "scheduled"
    PERFORMANCE_DEGRADATION = "performance_degradation"
    DATA_VOLUME = "data_volume"
    MANUAL = "manual"


@dataclass
class RetrainingPolicy:
    """Configuration for automated retraining"""
    # Schedule-based triggers
    schedule_enabled: bool = True
    schedule_interval_days: int = 7
    schedule_time: str = "02:00"  # Time of day to run (HH:MM)
    
    # Performance-based triggers
    performance_monitoring_enabled: bool = True
    min_accuracy_threshold: float = 0.75
    max_error_threshold: float = 0.30
    performance_check_interval_hours: int = 6
    
    # Data volume-based triggers
    data_volume_enabled: bool = True
    min_new_samples_threshold: int = 1000
    data_check_interval_hours: int = 12
    
    # Model age-based triggers
    max_model_age_days: int = 30
    
    # Retraining execution
    max_concurrent_retraining: int = 1
    retraining_timeout_hours: int = 4
    
    # Notification settings
    notify_on_trigger: bool = True
    notify_on_completion: bool = True
    notify_on_failure: bool = True


@dataclass
class RetrainingEvent:
    """Record of a retraining event"""
    model_type: str
    trigger: RetrainingTrigger
    triggered_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    status: str = "pending"  # pending, running, completed, failed
    trigger_reason: str = ""
    old_version: Optional[str] = None
    new_version: Optional[str] = None
    performance_metrics: Dict[str, float] = field(default_factory=dict)
    error_message: Optional[str] = None


class AutomatedRetrainingScheduler:
    """
    Manages automated model retraining based on various triggers
    """
    
    def __init__(self, 
                 model_storage_service,
                 prediction_metrics_service,
                 policy: Optional[RetrainingPolicy] = None):
        """
        Initialize the retraining scheduler
        
        Args:
            model_storage_service: Service for model storage and versioning
            prediction_metrics_service: Service for tracking model performance
            policy: Retraining policy configuration
        """
        self.storage = model_storage_service
        self.metrics = prediction_metrics_service
        self.policy = policy or RetrainingPolicy()
        
        self.retraining_events: List[RetrainingEvent] = []
        self.active_retraining: Dict[str, RetrainingEvent] = {}
        self.retraining_callbacks: Dict[str, Callable] = {}
        
        self._scheduler_thread = None
        self._running = False
        self._lock = threading.Lock()
        
        logger.info("Automated Retraining Scheduler initialized", extra={
            "policy": {
                "schedule_enabled": self.policy.schedule_enabled,
                "performance_monitoring_enabled": self.policy.performance_monitoring_enabled,
                "data_volume_enabled": self.policy.data_volume_enabled
            }
        })
    
    def register_retraining_callback(self, 
                                    model_type: str, 
                                    callback: Callable[[str, RetrainingEvent], Any]):
        """
        Register a callback function to be called when retraining is triggered
        
        Args:
            model_type: Type of model
            callback: Function to call with (model_type, event) parameters
        """
        self.retraining_callbacks[model_type] = callback
        logger.info(f"Registered retraining callback for {model_type}")
    
    def start(self):
        """Start the automated retraining scheduler"""
        if self._running:
            logger.warning("Scheduler is already running")
            return
        
        self._running = True
        
        # Set up scheduled jobs
        if self.policy.schedule_enabled:
            schedule.every(self.policy.schedule_interval_days).days.at(
                self.policy.schedule_time
            ).do(self._check_scheduled_retraining)
            logger.info(f"Scheduled retraining every {self.policy.schedule_interval_days} days at {self.policy.schedule_time}")
        
        if self.policy.performance_monitoring_enabled:
            schedule.every(self.policy.performance_check_interval_hours).hours.do(
                self._check_performance_degradation
            )
            logger.info(f"Performance monitoring every {self.policy.performance_check_interval_hours} hours")
        
        if self.policy.data_volume_enabled:
            schedule.every(self.policy.data_check_interval_hours).hours.do(
                self._check_data_volume
            )
            logger.info(f"Data volume checking every {self.policy.data_check_interval_hours} hours")
        
        # Start scheduler thread
        self._scheduler_thread = threading.Thread(target=self._run_scheduler, daemon=True)
        self._scheduler_thread.start()
        
        logger.info("Automated Retraining Scheduler started")
    
    def stop(self):
        """Stop the automated retraining scheduler"""
        self._running = False
        
        if self._scheduler_thread:
            self._scheduler_thread.join(timeout=5)
        
        schedule.clear()
        logger.info("Automated Retraining Scheduler stopped")
    
    def _run_scheduler(self):
        """Main scheduler loop"""
        while self._running:
            try:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
            except Exception as e:
                logger.error(f"Error in scheduler loop: {e}", exc_info=True)
    
    def _check_scheduled_retraining(self):
        """Check if scheduled retraining should be triggered"""
        logger.info("Checking scheduled retraining triggers")
        
        # Get all model types that need retraining
        model_types = self._get_registered_model_types()
        
        for model_type in model_types:
            try:
                # Check if model exists and when it was last trained
                models = self.storage.list_models(model_type)
                
                if not models:
                    logger.info(f"No models found for {model_type}, skipping scheduled retraining")
                    continue
                
                # Get the latest model
                latest_model = max(models, key=lambda m: m.get('created_at', datetime.min))
                model_age_days = (datetime.now() - latest_model.get('created_at', datetime.now())).days
                
                # Check if model is old enough for retraining
                if model_age_days >= self.policy.schedule_interval_days:
                    reason = f"Scheduled retraining (model age: {model_age_days} days)"
                    self.trigger_retraining(model_type, RetrainingTrigger.SCHEDULED, reason)
                
            except Exception as e:
                logger.error(f"Error checking scheduled retraining for {model_type}: {e}", exc_info=True)
    
    def _check_performance_degradation(self):
        """Check if model performance has degraded below thresholds"""
        logger.info("Checking for performance degradation")
        
        model_types = self._get_registered_model_types()
        
        for model_type in model_types:
            try:
                # Get recent performance metrics
                recent_metrics = self.metrics.get_recent_metrics(
                    model_type=model_type,
                    hours=self.policy.performance_check_interval_hours
                )
                
                if not recent_metrics:
                    logger.debug(f"No recent metrics for {model_type}")
                    continue
                
                # Calculate average performance
                avg_accuracy = sum(m.get('accuracy', 0) for m in recent_metrics) / len(recent_metrics)
                avg_error = sum(m.get('error', 0) for m in recent_metrics) / len(recent_metrics)
                
                # Check thresholds
                performance_degraded = False
                reasons = []
                
                if avg_accuracy < self.policy.min_accuracy_threshold:
                    performance_degraded = True
                    reasons.append(f"accuracy {avg_accuracy:.3f} < threshold {self.policy.min_accuracy_threshold}")
                
                if avg_error > self.policy.max_error_threshold:
                    performance_degraded = True
                    reasons.append(f"error {avg_error:.3f} > threshold {self.policy.max_error_threshold}")
                
                if performance_degraded:
                    reason = f"Performance degradation: {', '.join(reasons)}"
                    self.trigger_retraining(model_type, RetrainingTrigger.PERFORMANCE_DEGRADATION, reason)
                
            except Exception as e:
                logger.error(f"Error checking performance for {model_type}: {e}", exc_info=True)
    
    def _check_data_volume(self):
        """Check if enough new data is available for retraining"""
        logger.info("Checking data volume for retraining")
        
        model_types = self._get_registered_model_types()
        
        for model_type in model_types:
            try:
                # Get the latest model
                models = self.storage.list_models(model_type)
                
                if not models:
                    continue
                
                latest_model = max(models, key=lambda m: m.get('created_at', datetime.min))
                last_training_date = latest_model.get('created_at', datetime.min)
                
                # Count new samples since last training
                new_samples_count = self._count_new_samples_since(model_type, last_training_date)
                
                if new_samples_count >= self.policy.min_new_samples_threshold:
                    reason = f"Sufficient new data: {new_samples_count} samples (threshold: {self.policy.min_new_samples_threshold})"
                    self.trigger_retraining(model_type, RetrainingTrigger.DATA_VOLUME, reason)
                
            except Exception as e:
                logger.error(f"Error checking data volume for {model_type}: {e}", exc_info=True)
    
    def _count_new_samples_since(self, model_type: str, since_date: datetime) -> int:
        """
        Count new training samples since a given date
        
        This is a placeholder - actual implementation would query the database
        """
        # TODO: Implement actual data counting logic
        # This would query the transaction database or training data store
        return 0
    
    def _get_registered_model_types(self) -> List[str]:
        """Get list of model types that have registered callbacks"""
        return list(self.retraining_callbacks.keys())
    
    def trigger_retraining(self, 
                          model_type: str, 
                          trigger: RetrainingTrigger,
                          reason: str = "") -> Optional[RetrainingEvent]:
        """
        Trigger retraining for a specific model type
        
        Args:
            model_type: Type of model to retrain
            trigger: Type of trigger that initiated retraining
            reason: Human-readable reason for retraining
            
        Returns:
            RetrainingEvent if triggered, None if skipped
        """
        with self._lock:
            # Check if already retraining this model
            if model_type in self.active_retraining:
                logger.warning(f"Retraining already in progress for {model_type}")
                return None
            
            # Check concurrent retraining limit
            if len(self.active_retraining) >= self.policy.max_concurrent_retraining:
                logger.warning(f"Max concurrent retraining limit reached ({self.policy.max_concurrent_retraining})")
                return None
            
            # Create retraining event
            event = RetrainingEvent(
                model_type=model_type,
                trigger=trigger,
                triggered_at=datetime.now(),
                trigger_reason=reason,
                status="pending"
            )
            
            self.retraining_events.append(event)
            self.active_retraining[model_type] = event
            
            logger.info(f"Retraining triggered for {model_type}", extra={
                "trigger": trigger.value,
                "reason": reason
            })
            
            # Notify if configured
            if self.policy.notify_on_trigger:
                self._send_notification(event, "triggered")
            
            # Execute retraining in background thread
            threading.Thread(
                target=self._execute_retraining,
                args=(event,),
                daemon=True
            ).start()
            
            return event
    
    def _execute_retraining(self, event: RetrainingEvent):
        """
        Execute the actual retraining process
        
        Args:
            event: Retraining event to execute
        """
        try:
            event.started_at = datetime.now()
            event.status = "running"
            
            logger.info(f"Starting retraining for {event.model_type}")
            
            # Get current model version
            models = self.storage.list_models(event.model_type)
            if models:
                latest_model = max(models, key=lambda m: m.get('version', '0.0.0'))
                event.old_version = latest_model.get('version')
            
            # Call registered callback to perform actual retraining
            if event.model_type in self.retraining_callbacks:
                callback = self.retraining_callbacks[event.model_type]
                result = callback(event.model_type, event)
                
                # Update event with results
                if isinstance(result, dict):
                    event.new_version = result.get('version')
                    event.performance_metrics = result.get('metrics', {})
            else:
                raise ValueError(f"No retraining callback registered for {event.model_type}")
            
            event.completed_at = datetime.now()
            event.status = "completed"
            
            duration = (event.completed_at - event.started_at).total_seconds()
            logger.info(f"Retraining completed for {event.model_type}", extra={
                "duration_seconds": duration,
                "old_version": event.old_version,
                "new_version": event.new_version,
                "metrics": event.performance_metrics
            })
            
            # Notify if configured
            if self.policy.notify_on_completion:
                self._send_notification(event, "completed")
            
        except Exception as e:
            event.status = "failed"
            event.error_message = str(e)
            event.completed_at = datetime.now()
            
            logger.error(f"Retraining failed for {event.model_type}: {e}", exc_info=True)
            
            # Notify if configured
            if self.policy.notify_on_failure:
                self._send_notification(event, "failed")
        
        finally:
            # Remove from active retraining
            with self._lock:
                if event.model_type in self.active_retraining:
                    del self.active_retraining[event.model_type]
    
    def _send_notification(self, event: RetrainingEvent, notification_type: str):
        """
        Send notification about retraining event
        
        Args:
            event: Retraining event
            notification_type: Type of notification (triggered, completed, failed)
        """
        # Placeholder for notification system
        # Could integrate with email, Slack, webhooks, etc.
        logger.info(f"Notification: {notification_type} - {event.model_type}", extra={
            "event": {
                "model_type": event.model_type,
                "trigger": event.trigger.value,
                "status": event.status,
                "reason": event.trigger_reason
            }
        })
    
    def get_retraining_history(self, 
                              model_type: Optional[str] = None,
                              limit: int = 100) -> List[RetrainingEvent]:
        """
        Get retraining history
        
        Args:
            model_type: Filter by model type (None for all)
            limit: Maximum number of events to return
            
        Returns:
            List of retraining events
        """
        events = self.retraining_events
        
        if model_type:
            events = [e for e in events if e.model_type == model_type]
        
        # Sort by triggered_at descending
        events = sorted(events, key=lambda e: e.triggered_at, reverse=True)
        
        return events[:limit]
    
    def get_active_retraining(self) -> Dict[str, RetrainingEvent]:
        """Get currently active retraining jobs"""
        with self._lock:
            return dict(self.active_retraining)
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        Get retraining statistics
        
        Returns:
            Dictionary with statistics
        """
        total_events = len(self.retraining_events)
        completed = len([e for e in self.retraining_events if e.status == "completed"])
        failed = len([e for e in self.retraining_events if e.status == "failed"])
        active = len(self.active_retraining)
        
        # Calculate average duration for completed retraining
        completed_events = [e for e in self.retraining_events if e.status == "completed" and e.started_at and e.completed_at]
        avg_duration = 0
        if completed_events:
            durations = [(e.completed_at - e.started_at).total_seconds() for e in completed_events]
            avg_duration = sum(durations) / len(durations)
        
        # Count by trigger type
        trigger_counts = {}
        for event in self.retraining_events:
            trigger_type = event.trigger.value
            trigger_counts[trigger_type] = trigger_counts.get(trigger_type, 0) + 1
        
        return {
            "total_retraining_events": total_events,
            "completed": completed,
            "failed": failed,
            "active": active,
            "success_rate": (completed / total_events * 100) if total_events > 0 else 0,
            "average_duration_seconds": avg_duration,
            "trigger_counts": trigger_counts,
            "policy": {
                "schedule_enabled": self.policy.schedule_enabled,
                "schedule_interval_days": self.policy.schedule_interval_days,
                "performance_monitoring_enabled": self.policy.performance_monitoring_enabled,
                "data_volume_enabled": self.policy.data_volume_enabled
            }
        }
    
    def update_policy(self, **kwargs):
        """
        Update retraining policy
        
        Args:
            **kwargs: Policy parameters to update
        """
        for key, value in kwargs.items():
            if hasattr(self.policy, key):
                setattr(self.policy, key, value)
                logger.info(f"Updated policy: {key} = {value}")
            else:
                logger.warning(f"Unknown policy parameter: {key}")
        
        # Restart scheduler to apply new policy
        if self._running:
            self.stop()
            self.start()
