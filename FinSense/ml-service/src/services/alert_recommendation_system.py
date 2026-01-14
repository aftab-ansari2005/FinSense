"""
Alert and Recommendation System

This service manages financial alerts and recommendations with configurable thresholds,
user preferences, and intelligent notification scheduling. It extends the basic
financial stress calculator with advanced alert management capabilities.
"""

import logging
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
from enum import Enum
import pandas as pd

from .financial_stress_calculator import (
    FinancialStressCalculator, 
    FinancialStressResult, 
    RiskLevel, 
    FactorCategory,
    RecommendationType,
    Recommendation
)

logger = logging.getLogger(__name__)

class AlertType(Enum):
    """Types of financial alerts"""
    STRESS_THRESHOLD = "stress_threshold"
    BALANCE_DECLINE = "balance_decline"
    SPENDING_SPIKE = "spending_spike"
    INCOME_DROP = "income_drop"
    EMERGENCY_FUND_LOW = "emergency_fund_low"
    RECURRING_PAYMENT_HIGH = "recurring_payment_high"
    SEASONAL_RISK = "seasonal_risk"
    PREDICTION_WARNING = "prediction_warning"

class AlertSeverity(Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    URGENT = "urgent"

class NotificationChannel(Enum):
    """Notification delivery channels"""
    DASHBOARD = "dashboard"
    EMAIL = "email"
    PUSH = "push"
    SMS = "sms"

@dataclass
class AlertThreshold:
    """Configurable alert threshold"""
    alert_type: AlertType
    threshold_value: float
    severity: AlertSeverity
    enabled: bool = True
    cooldown_hours: int = 24  # Minimum hours between same alert type
    description: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'alert_type': self.alert_type.value,
            'threshold_value': self.threshold_value,
            'severity': self.severity.value,
            'enabled': self.enabled,
            'cooldown_hours': self.cooldown_hours,
            'description': self.description
        }

@dataclass
class UserAlertPreferences:
    """User-specific alert preferences"""
    user_id: str
    enabled_channels: List[NotificationChannel]
    quiet_hours_start: int = 22  # 10 PM
    quiet_hours_end: int = 8     # 8 AM
    max_alerts_per_day: int = 5
    custom_thresholds: Dict[str, float] = None
    
    def __post_init__(self):
        if self.custom_thresholds is None:
            self.custom_thresholds = {}
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'user_id': self.user_id,
            'enabled_channels': [ch.value for ch in self.enabled_channels],
            'quiet_hours_start': self.quiet_hours_start,
            'quiet_hours_end': self.quiet_hours_end,
            'max_alerts_per_day': self.max_alerts_per_day,
            'custom_thresholds': self.custom_thresholds
        }

@dataclass
class Alert:
    """Individual alert instance"""
    alert_id: str
    user_id: str
    alert_type: AlertType
    severity: AlertSeverity
    title: str
    message: str
    created_at: datetime
    triggered_by: Dict[str, Any]  # Context that triggered the alert
    action_required: bool = False
    acknowledged: bool = False
    acknowledged_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'alert_id': self.alert_id,
            'user_id': self.user_id,
            'alert_type': self.alert_type.value,
            'severity': self.severity.value,
            'title': self.title,
            'message': self.message,
            'created_at': self.created_at.isoformat(),
            'triggered_by': self.triggered_by,
            'action_required': self.action_required,
            'acknowledged': self.acknowledged,
            'acknowledged_at': self.acknowledged_at.isoformat() if self.acknowledged_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None
        }

@dataclass
class RecommendationProgress:
    """Track user progress on recommendations"""
    recommendation_id: str
    user_id: str
    recommendation_type: RecommendationType
    status: str  # pending, in_progress, completed, dismissed
    created_at: datetime
    updated_at: datetime
    progress_notes: List[str] = None
    completion_percentage: float = 0.0
    
    def __post_init__(self):
        if self.progress_notes is None:
            self.progress_notes = []
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'recommendation_id': self.recommendation_id,
            'user_id': self.user_id,
            'recommendation_type': self.recommendation_type.value,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'progress_notes': self.progress_notes,
            'completion_percentage': self.completion_percentage
        }

class AlertRecommendationSystem:
    """
    Comprehensive alert and recommendation management system
    """
    
    def __init__(self):
        """Initialize the alert and recommendation system"""
        self.logger = logging.getLogger(__name__)
        self.stress_calculator = FinancialStressCalculator()
        
        # Default alert thresholds
        self.default_thresholds = {
            AlertType.STRESS_THRESHOLD: AlertThreshold(
                alert_type=AlertType.STRESS_THRESHOLD,
                threshold_value=50.0,
                severity=AlertSeverity.WARNING,
                description="Financial stress score exceeds safe threshold"
            ),
            AlertType.BALANCE_DECLINE: AlertThreshold(
                alert_type=AlertType.BALANCE_DECLINE,
                threshold_value=0.2,  # 20% decline
                severity=AlertSeverity.WARNING,
                description="Account balance declining rapidly"
            ),
            AlertType.SPENDING_SPIKE: AlertThreshold(
                alert_type=AlertType.SPENDING_SPIKE,
                threshold_value=1.5,  # 150% of average
                severity=AlertSeverity.INFO,
                description="Spending significantly above average"
            ),
            AlertType.INCOME_DROP: AlertThreshold(
                alert_type=AlertType.INCOME_DROP,
                threshold_value=0.3,  # 30% drop
                severity=AlertSeverity.CRITICAL,
                description="Income dropped significantly"
            ),
            AlertType.EMERGENCY_FUND_LOW: AlertThreshold(
                alert_type=AlertType.EMERGENCY_FUND_LOW,
                threshold_value=1.0,  # Less than 1 month
                severity=AlertSeverity.WARNING,
                description="Emergency fund below recommended level"
            )
        }
        
        # In-memory storage (in production, use database)
        self.active_alerts: Dict[str, List[Alert]] = {}
        self.user_preferences: Dict[str, UserAlertPreferences] = {}
        self.recommendation_progress: Dict[str, List[RecommendationProgress]] = {}
        self.alert_history: Dict[str, List[Alert]] = {}
        
        self.logger.info("AlertRecommendationSystem initialized")
    
    def set_user_preferences(self, preferences: UserAlertPreferences) -> bool:
        """Set alert preferences for a user"""
        try:
            self.user_preferences[preferences.user_id] = preferences
            self.logger.info(f"Updated alert preferences for user {preferences.user_id}")
            return True
        except Exception as e:
            self.logger.error(f"Failed to set user preferences: {str(e)}")
            return False
    
    def get_user_preferences(self, user_id: str) -> UserAlertPreferences:
        """Get alert preferences for a user"""
        return self.user_preferences.get(user_id, UserAlertPreferences(
            user_id=user_id,
            enabled_channels=[NotificationChannel.DASHBOARD]
        ))
    
    def update_alert_threshold(self, user_id: str, alert_type: AlertType, threshold_value: float) -> bool:
        """Update custom alert threshold for a user"""
        try:
            preferences = self.get_user_preferences(user_id)
            preferences.custom_thresholds[alert_type.value] = threshold_value
            self.set_user_preferences(preferences)
            self.logger.info(f"Updated {alert_type.value} threshold to {threshold_value} for user {user_id}")
            return True
        except Exception as e:
            self.logger.error(f"Failed to update alert threshold: {str(e)}")
            return False
    
    def process_financial_analysis(self, 
                                 user_id: str,
                                 current_balance: float,
                                 predictions: List[Dict[str, Any]],
                                 transaction_history: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Process financial analysis and generate alerts and recommendations
        """
        try:
            self.logger.info(f"Processing financial analysis for user {user_id}")
            
            # Calculate stress score using existing calculator
            stress_result = self.stress_calculator.calculate_stress_score(
                user_id=user_id,
                current_balance=current_balance,
                predictions=predictions,
                transaction_history=transaction_history
            )
            
            # Generate alerts based on analysis
            alerts = self._generate_comprehensive_alerts(
                user_id, stress_result, current_balance, predictions, transaction_history
            )
            
            # Filter alerts based on user preferences and cooldowns
            filtered_alerts = self._filter_alerts(user_id, alerts)
            
            # Store active alerts
            if user_id not in self.active_alerts:
                self.active_alerts[user_id] = []
            self.active_alerts[user_id].extend(filtered_alerts)
            
            # Generate enhanced recommendations
            enhanced_recommendations = self._enhance_recommendations(
                user_id, stress_result.recommendations
            )
            
            # Update recommendation progress
            self._update_recommendation_progress(user_id, enhanced_recommendations)
            
            return {
                'stress_result': stress_result.to_dict(),
                'alerts': [alert.to_dict() for alert in filtered_alerts],
                'recommendations': [rec.to_dict() for rec in enhanced_recommendations],
                'alert_summary': self._get_alert_summary(user_id),
                'recommendation_summary': self._get_recommendation_summary(user_id)
            }
            
        except Exception as e:
            self.logger.error(f"Failed to process financial analysis: {str(e)}")
            raise
    
    def _generate_comprehensive_alerts(self,
                                     user_id: str,
                                     stress_result: FinancialStressResult,
                                     current_balance: float,
                                     predictions: List[Dict[str, Any]],
                                     transaction_history: List[Dict[str, Any]]) -> List[Alert]:
        """Generate comprehensive alerts based on financial analysis"""
        alerts = []
        preferences = self.get_user_preferences(user_id)
        
        # 1. Stress threshold alerts
        stress_threshold = preferences.custom_thresholds.get(
            AlertType.STRESS_THRESHOLD.value,
            self.default_thresholds[AlertType.STRESS_THRESHOLD].threshold_value
        )
        
        if stress_result.stress_score >= stress_threshold:
            severity = AlertSeverity.CRITICAL if stress_result.stress_score >= 75 else AlertSeverity.WARNING
            alerts.append(Alert(
                alert_id=f"stress_{user_id}_{datetime.now().timestamp()}",
                user_id=user_id,
                alert_type=AlertType.STRESS_THRESHOLD,
                severity=severity,
                title="Financial Stress Alert",
                message=f"Your financial stress score is {stress_result.stress_score:.1f}. {self._get_stress_message(stress_result.risk_level)}",
                created_at=datetime.now(),
                triggered_by={'stress_score': stress_result.stress_score, 'risk_level': stress_result.risk_level.value},
                action_required=severity == AlertSeverity.CRITICAL,
                expires_at=datetime.now() + timedelta(days=7)
            ))
        
        # 2. Balance decline alerts
        if predictions:
            predicted_balance = predictions[-1].get('predicted_balance', current_balance)
            balance_change_pct = (predicted_balance - current_balance) / abs(current_balance) if current_balance != 0 else 0
            
            decline_threshold = preferences.custom_thresholds.get(
                AlertType.BALANCE_DECLINE.value,
                self.default_thresholds[AlertType.BALANCE_DECLINE].threshold_value
            )
            
            if balance_change_pct < -decline_threshold:
                alerts.append(Alert(
                    alert_id=f"balance_{user_id}_{datetime.now().timestamp()}",
                    user_id=user_id,
                    alert_type=AlertType.BALANCE_DECLINE,
                    severity=AlertSeverity.WARNING,
                    title="Balance Decline Warning",
                    message=f"Your balance is projected to decline by {abs(balance_change_pct)*100:.1f}% over the next 30 days.",
                    created_at=datetime.now(),
                    triggered_by={'current_balance': current_balance, 'predicted_balance': predicted_balance},
                    action_required=True,
                    expires_at=datetime.now() + timedelta(days=30)
                ))
        
        # 3. Emergency fund alerts
        if stress_result.monthly_spending_avg > 0:
            emergency_months = current_balance / stress_result.monthly_spending_avg
            emergency_threshold = preferences.custom_thresholds.get(
                AlertType.EMERGENCY_FUND_LOW.value,
                self.default_thresholds[AlertType.EMERGENCY_FUND_LOW].threshold_value
            )
            
            if emergency_months < emergency_threshold:
                alerts.append(Alert(
                    alert_id=f"emergency_{user_id}_{datetime.now().timestamp()}",
                    user_id=user_id,
                    alert_type=AlertType.EMERGENCY_FUND_LOW,
                    severity=AlertSeverity.WARNING,
                    title="Emergency Fund Low",
                    message=f"Your emergency fund covers only {emergency_months:.1f} months of expenses. Consider building it up to 3-6 months.",
                    created_at=datetime.now(),
                    triggered_by={'emergency_months': emergency_months, 'threshold': emergency_threshold},
                    action_required=False,
                    expires_at=datetime.now() + timedelta(days=14)
                ))
        
        # 4. Spending spike alerts
        if transaction_history:
            recent_spending = self._calculate_recent_spending(transaction_history)
            avg_spending = stress_result.monthly_spending_avg
            
            if avg_spending > 0:
                spending_ratio = recent_spending / avg_spending
                spike_threshold = preferences.custom_thresholds.get(
                    AlertType.SPENDING_SPIKE.value,
                    self.default_thresholds[AlertType.SPENDING_SPIKE].threshold_value
                )
                
                if spending_ratio > spike_threshold:
                    alerts.append(Alert(
                        alert_id=f"spending_{user_id}_{datetime.now().timestamp()}",
                        user_id=user_id,
                        alert_type=AlertType.SPENDING_SPIKE,
                        severity=AlertSeverity.INFO,
                        title="Spending Above Average",
                        message=f"Your recent spending is {spending_ratio*100:.0f}% of your monthly average. Consider reviewing your expenses.",
                        created_at=datetime.now(),
                        triggered_by={'recent_spending': recent_spending, 'average_spending': avg_spending},
                        action_required=False,
                        expires_at=datetime.now() + timedelta(days=3)
                    ))
        
        return alerts
    
    def _calculate_recent_spending(self, transaction_history: List[Dict[str, Any]]) -> float:
        """Calculate recent spending (last 7 days)"""
        if not transaction_history:
            return 0.0
        
        recent_date = datetime.now() - timedelta(days=7)
        recent_spending = 0.0
        
        for transaction in transaction_history:
            try:
                trans_date = pd.to_datetime(transaction['date'])
                if trans_date >= recent_date and transaction['amount'] < 0:
                    recent_spending += abs(transaction['amount'])
            except (KeyError, ValueError):
                continue
        
        return recent_spending
    
    def _get_stress_message(self, risk_level: RiskLevel) -> str:
        """Get appropriate message for stress level"""
        messages = {
            RiskLevel.LOW: "Your financial health looks good. Keep up the good work!",
            RiskLevel.MEDIUM: "Consider reviewing your spending and savings patterns.",
            RiskLevel.HIGH: "Take action to improve your financial stability.",
            RiskLevel.CRITICAL: "Immediate action required to prevent financial crisis."
        }
        return messages.get(risk_level, "Review your financial situation.")
    
    def _filter_alerts(self, user_id: str, alerts: List[Alert]) -> List[Alert]:
        """Filter alerts based on user preferences and cooldowns"""
        preferences = self.get_user_preferences(user_id)
        filtered_alerts = []
        
        # Check daily limit
        today_alerts = self._count_todays_alerts(user_id)
        if today_alerts >= preferences.max_alerts_per_day:
            self.logger.info(f"Daily alert limit reached for user {user_id}")
            return []
        
        # Check quiet hours
        current_hour = datetime.now().hour
        if preferences.quiet_hours_start <= current_hour or current_hour <= preferences.quiet_hours_end:
            # Only allow critical alerts during quiet hours
            alerts = [alert for alert in alerts if alert.severity == AlertSeverity.CRITICAL]
        
        # Check cooldowns
        for alert in alerts:
            if self._is_alert_in_cooldown(user_id, alert.alert_type):
                continue
            
            filtered_alerts.append(alert)
            
            # Respect daily limit
            if len(filtered_alerts) >= (preferences.max_alerts_per_day - today_alerts):
                break
        
        return filtered_alerts
    
    def _count_todays_alerts(self, user_id: str) -> int:
        """Count alerts sent today for a user"""
        today = datetime.now().date()
        count = 0
        
        for alert in self.active_alerts.get(user_id, []):
            if alert.created_at.date() == today:
                count += 1
        
        return count
    
    def _is_alert_in_cooldown(self, user_id: str, alert_type: AlertType) -> bool:
        """Check if alert type is in cooldown period"""
        cooldown_hours = self.default_thresholds.get(alert_type, AlertThreshold(
            alert_type=alert_type, threshold_value=0, severity=AlertSeverity.INFO
        )).cooldown_hours
        
        cutoff_time = datetime.now() - timedelta(hours=cooldown_hours)
        
        # Check recent alerts of same type
        for alert in self.active_alerts.get(user_id, []):
            if alert.alert_type == alert_type and alert.created_at > cutoff_time:
                return True
        
        return False
    
    def _enhance_recommendations(self, user_id: str, base_recommendations: List[Recommendation]) -> List[Recommendation]:
        """Enhance recommendations with progress tracking and personalization"""
        enhanced_recommendations = []
        
        for rec in base_recommendations:
            # Check if user has existing progress on this recommendation type
            existing_progress = self._get_recommendation_progress(user_id, rec.type)
            
            if existing_progress and existing_progress.status == 'completed':
                # Skip completed recommendations
                continue
            
            # Enhance with personalized action items
            enhanced_rec = self._personalize_recommendation(user_id, rec)
            enhanced_recommendations.append(enhanced_rec)
        
        return enhanced_recommendations
    
    def _personalize_recommendation(self, user_id: str, recommendation: Recommendation) -> Recommendation:
        """Personalize recommendation based on user history and preferences"""
        # This is a simplified personalization - in production, use ML models
        
        # Add user-specific context to action items
        enhanced_action_items = recommendation.action_items.copy()
        
        if recommendation.type == RecommendationType.REDUCE_SPENDING:
            enhanced_action_items.extend([
                "Set up spending alerts on your banking app",
                "Use the 24-hour rule before making non-essential purchases"
            ])
        elif recommendation.type == RecommendationType.BUILD_EMERGENCY_FUND:
            enhanced_action_items.extend([
                "Start with saving just $25 per week",
                "Consider opening a separate high-yield savings account"
            ])
        elif recommendation.type == RecommendationType.BUDGET_PLANNING:
            enhanced_action_items.extend([
                "Try the 50/30/20 budgeting rule",
                "Review and categorize last month's expenses"
            ])
        
        # Create enhanced recommendation
        return Recommendation(
            type=recommendation.type,
            priority=recommendation.priority,
            title=recommendation.title,
            description=recommendation.description,
            potential_impact=recommendation.potential_impact,
            action_items=enhanced_action_items
        )
    
    def _update_recommendation_progress(self, user_id: str, recommendations: List[Recommendation]) -> None:
        """Update recommendation progress tracking"""
        if user_id not in self.recommendation_progress:
            self.recommendation_progress[user_id] = []
        
        for rec in recommendations:
            # Check if this recommendation type already exists
            existing = self._get_recommendation_progress(user_id, rec.type)
            
            if not existing:
                # Create new progress tracking
                progress = RecommendationProgress(
                    recommendation_id=f"{rec.type.value}_{user_id}_{datetime.now().timestamp()}",
                    user_id=user_id,
                    recommendation_type=rec.type,
                    status='pending',
                    created_at=datetime.now(),
                    updated_at=datetime.now()
                )
                self.recommendation_progress[user_id].append(progress)
    
    def _get_recommendation_progress(self, user_id: str, rec_type: RecommendationType) -> Optional[RecommendationProgress]:
        """Get existing progress for a recommendation type"""
        for progress in self.recommendation_progress.get(user_id, []):
            if progress.recommendation_type == rec_type:
                return progress
        return None
    
    def acknowledge_alert(self, user_id: str, alert_id: str) -> bool:
        """Acknowledge an alert"""
        try:
            for alert in self.active_alerts.get(user_id, []):
                if alert.alert_id == alert_id:
                    alert.acknowledged = True
                    alert.acknowledged_at = datetime.now()
                    self.logger.info(f"Alert {alert_id} acknowledged by user {user_id}")
                    return True
            
            self.logger.warning(f"Alert {alert_id} not found for user {user_id}")
            return False
            
        except Exception as e:
            self.logger.error(f"Failed to acknowledge alert: {str(e)}")
            return False
    
    def update_recommendation_status(self, user_id: str, recommendation_id: str, 
                                   status: str, progress_note: str = None) -> bool:
        """Update recommendation progress status"""
        try:
            for progress in self.recommendation_progress.get(user_id, []):
                if progress.recommendation_id == recommendation_id:
                    progress.status = status
                    progress.updated_at = datetime.now()
                    
                    if progress_note:
                        progress.progress_notes.append(f"{datetime.now().isoformat()}: {progress_note}")
                    
                    # Update completion percentage based on status
                    status_percentages = {
                        'pending': 0.0,
                        'in_progress': 50.0,
                        'completed': 100.0,
                        'dismissed': 0.0
                    }
                    progress.completion_percentage = status_percentages.get(status, 0.0)
                    
                    self.logger.info(f"Updated recommendation {recommendation_id} status to {status}")
                    return True
            
            self.logger.warning(f"Recommendation {recommendation_id} not found for user {user_id}")
            return False
            
        except Exception as e:
            self.logger.error(f"Failed to update recommendation status: {str(e)}")
            return False
    
    def get_active_alerts(self, user_id: str) -> List[Dict[str, Any]]:
        """Get active alerts for a user"""
        active_alerts = []
        current_time = datetime.now()
        
        for alert in self.active_alerts.get(user_id, []):
            # Filter out expired and acknowledged alerts
            if (not alert.acknowledged and 
                (alert.expires_at is None or alert.expires_at > current_time)):
                active_alerts.append(alert.to_dict())
        
        return active_alerts
    
    def get_recommendation_status(self, user_id: str) -> List[Dict[str, Any]]:
        """Get recommendation progress for a user"""
        return [progress.to_dict() for progress in self.recommendation_progress.get(user_id, [])]
    
    def _get_alert_summary(self, user_id: str) -> Dict[str, Any]:
        """Get alert summary for a user"""
        alerts = self.active_alerts.get(user_id, [])
        
        summary = {
            'total_active': len([a for a in alerts if not a.acknowledged]),
            'by_severity': {
                'critical': len([a for a in alerts if a.severity == AlertSeverity.CRITICAL and not a.acknowledged]),
                'warning': len([a for a in alerts if a.severity == AlertSeverity.WARNING and not a.acknowledged]),
                'info': len([a for a in alerts if a.severity == AlertSeverity.INFO and not a.acknowledged])
            },
            'action_required': len([a for a in alerts if a.action_required and not a.acknowledged])
        }
        
        return summary
    
    def _get_recommendation_summary(self, user_id: str) -> Dict[str, Any]:
        """Get recommendation summary for a user"""
        recommendations = self.recommendation_progress.get(user_id, [])
        
        summary = {
            'total_recommendations': len(recommendations),
            'by_status': {
                'pending': len([r for r in recommendations if r.status == 'pending']),
                'in_progress': len([r for r in recommendations if r.status == 'in_progress']),
                'completed': len([r for r in recommendations if r.status == 'completed']),
                'dismissed': len([r for r in recommendations if r.status == 'dismissed'])
            },
            'average_completion': sum(r.completion_percentage for r in recommendations) / len(recommendations) if recommendations else 0.0
        }
        
        return summary
    
    def cleanup_expired_alerts(self, user_id: str = None) -> int:
        """Clean up expired alerts"""
        cleaned_count = 0
        current_time = datetime.now()
        
        users_to_clean = [user_id] if user_id else list(self.active_alerts.keys())
        
        for uid in users_to_clean:
            if uid not in self.active_alerts:
                continue
            
            # Move expired alerts to history
            active_alerts = []
            for alert in self.active_alerts[uid]:
                if alert.expires_at and alert.expires_at <= current_time:
                    # Move to history
                    if uid not in self.alert_history:
                        self.alert_history[uid] = []
                    self.alert_history[uid].append(alert)
                    cleaned_count += 1
                else:
                    active_alerts.append(alert)
            
            self.active_alerts[uid] = active_alerts
        
        if cleaned_count > 0:
            self.logger.info(f"Cleaned up {cleaned_count} expired alerts")
        
        return cleaned_count
    
    def get_alert_statistics(self, user_id: str, days: int = 30) -> Dict[str, Any]:
        """Get alert statistics for a user over specified days"""
        cutoff_date = datetime.now() - timedelta(days=days)
        
        all_alerts = (self.active_alerts.get(user_id, []) + 
                     self.alert_history.get(user_id, []))
        
        recent_alerts = [a for a in all_alerts if a.created_at >= cutoff_date]
        
        stats = {
            'total_alerts': len(recent_alerts),
            'by_type': {},
            'by_severity': {},
            'acknowledgment_rate': 0.0,
            'average_response_time_hours': 0.0
        }
        
        # Count by type and severity
        for alert in recent_alerts:
            alert_type = alert.alert_type.value
            severity = alert.severity.value
            
            stats['by_type'][alert_type] = stats['by_type'].get(alert_type, 0) + 1
            stats['by_severity'][severity] = stats['by_severity'].get(severity, 0) + 1
        
        # Calculate acknowledgment rate
        acknowledged_alerts = [a for a in recent_alerts if a.acknowledged]
        if recent_alerts:
            stats['acknowledgment_rate'] = len(acknowledged_alerts) / len(recent_alerts)
        
        # Calculate average response time
        response_times = []
        for alert in acknowledged_alerts:
            if alert.acknowledged_at:
                response_time = (alert.acknowledged_at - alert.created_at).total_seconds() / 3600
                response_times.append(response_time)
        
        if response_times:
            stats['average_response_time_hours'] = sum(response_times) / len(response_times)
        
        return stats