"""
Model Validation and Deployment Service

This module provides comprehensive model validation and deployment capabilities:
- Pre-deployment performance validation
- A/B testing between model versions
- Gradual rollout with traffic splitting
- Performance monitoring during deployment
- Automatic rollback on performance degradation
- Deployment history and audit trail
"""

import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Callable
from dataclasses import dataclass, field
from enum import Enum
import random

logger = logging.getLogger(__name__)


class DeploymentStatus(Enum):
    """Deployment status states"""
    PENDING = "pending"
    VALIDATING = "validating"
    DEPLOYING = "deploying"
    ACTIVE = "active"
    ROLLING_BACK = "rolling_back"
    ROLLED_BACK = "rolled_back"
    FAILED = "failed"
    CANCELLED = "cancelled"


class DeploymentStrategy(Enum):
    """Deployment strategies"""
    IMMEDIATE = "immediate"  # Deploy to 100% immediately
    CANARY = "canary"  # Gradual rollout with monitoring
    BLUE_GREEN = "blue_green"  # Switch between two versions
    AB_TEST = "ab_test"  # A/B testing with traffic split


@dataclass
class ValidationCriteria:
    """Criteria for model validation"""
    min_accuracy: float = 0.75
    max_error_rate: float = 0.30
    min_samples: int = 100
    max_latency_ms: float = 1000.0
    min_improvement_threshold: float = 0.02  # 2% improvement required
    
    # Comparison with current model
    require_improvement: bool = True
    allow_equal_performance: bool = False


@dataclass
class DeploymentConfig:
    """Configuration for model deployment"""
    strategy: DeploymentStrategy = DeploymentStrategy.CANARY
    
    # Canary deployment settings
    canary_stages: List[int] = field(default_factory=lambda: [10, 25, 50, 100])
    stage_duration_minutes: int = 30
    
    # A/B testing settings
    ab_test_duration_hours: int = 24
    ab_test_traffic_split: int = 50  # Percentage for new model
    
    # Monitoring and rollback
    enable_auto_rollback: bool = True
    rollback_on_error_rate: float = 0.40
    rollback_on_latency_ms: float = 2000.0
    monitoring_interval_seconds: int = 60


@dataclass
class ValidationResult:
    """Result of model validation"""
    passed: bool
    model_version: str
    metrics: Dict[str, float]
    validation_time: datetime
    criteria_met: Dict[str, bool]
    failure_reasons: List[str] = field(default_factory=list)
    comparison_with_current: Optional[Dict[str, Any]] = None


@dataclass
class DeploymentRecord:
    """Record of a model deployment"""
    deployment_id: str
    model_type: str
    model_version: str
    previous_version: Optional[str]
    strategy: DeploymentStrategy
    status: DeploymentStatus
    
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    validation_result: Optional[ValidationResult] = None
    current_traffic_percentage: int = 0
    target_traffic_percentage: int = 100
    
    performance_metrics: Dict[str, List[float]] = field(default_factory=dict)
    rollback_reason: Optional[str] = None
    error_message: Optional[str] = None


class ModelValidationDeployment:
    """
    Manages model validation and deployment with A/B testing capabilities
    """
    
    def __init__(self,
                 model_storage_service,
                 prediction_metrics_service,
                 validation_criteria: Optional[ValidationCriteria] = None,
                 deployment_config: Optional[DeploymentConfig] = None):
        """
        Initialize the validation and deployment service
        
        Args:
            model_storage_service: Service for model storage
            prediction_metrics_service: Service for tracking predictions
            validation_criteria: Criteria for model validation
            deployment_config: Configuration for deployments
        """
        self.storage = model_storage_service
        self.metrics = prediction_metrics_service
        self.validation_criteria = validation_criteria or ValidationCriteria()
        self.deployment_config = deployment_config or DeploymentConfig()
        
        self.deployments: List[DeploymentRecord] = []
        self.active_deployments: Dict[str, DeploymentRecord] = {}
        self.traffic_routing: Dict[str, Dict[str, int]] = {}  # model_type -> {version: percentage}
        
        logger.info("Model Validation and Deployment Service initialized")
    
    def validate_model(self,
                      model_type: str,
                      model_version: str,
                      test_data: Any,
                      compare_with_current: bool = True) -> ValidationResult:
        """
        Validate a model before deployment
        
        Args:
            model_type: Type of model
            model_version: Version to validate
            test_data: Test dataset for validation
            compare_with_current: Whether to compare with current production model
            
        Returns:
            ValidationResult with validation outcome
        """
        logger.info(f"Validating model {model_type} version {model_version}")
        
        try:
            # Load the model
            model = self.storage.load_model(model_type, model_version)
            
            # Evaluate model performance
            metrics = self._evaluate_model(model, test_data)
            
            # Check validation criteria
            criteria_met = {}
            failure_reasons = []
            
            # Check accuracy
            if 'accuracy' in metrics:
                criteria_met['accuracy'] = metrics['accuracy'] >= self.validation_criteria.min_accuracy
                if not criteria_met['accuracy']:
                    failure_reasons.append(
                        f"Accuracy {metrics['accuracy']:.3f} below threshold {self.validation_criteria.min_accuracy}"
                    )
            
            # Check error rate
            if 'error_rate' in metrics:
                criteria_met['error_rate'] = metrics['error_rate'] <= self.validation_criteria.max_error_rate
                if not criteria_met['error_rate']:
                    failure_reasons.append(
                        f"Error rate {metrics['error_rate']:.3f} above threshold {self.validation_criteria.max_error_rate}"
                    )
            
            # Check latency
            if 'latency_ms' in metrics:
                criteria_met['latency'] = metrics['latency_ms'] <= self.validation_criteria.max_latency_ms
                if not criteria_met['latency']:
                    failure_reasons.append(
                        f"Latency {metrics['latency_ms']:.1f}ms above threshold {self.validation_criteria.max_latency_ms}ms"
                    )
            
            # Compare with current model if requested
            comparison = None
            if compare_with_current and self.validation_criteria.require_improvement:
                comparison = self._compare_with_current_model(
                    model_type, model, test_data, metrics
                )
                
                if comparison and not comparison['is_better']:
                    criteria_met['improvement'] = False
                    failure_reasons.append(
                        f"New model not better than current: {comparison['reason']}"
                    )
                else:
                    criteria_met['improvement'] = True
            
            # Determine if validation passed
            passed = all(criteria_met.values()) and len(failure_reasons) == 0
            
            result = ValidationResult(
                passed=passed,
                model_version=model_version,
                metrics=metrics,
                validation_time=datetime.now(),
                criteria_met=criteria_met,
                failure_reasons=failure_reasons,
                comparison_with_current=comparison
            )
            
            logger.info(f"Validation {'passed' if passed else 'failed'} for {model_type} v{model_version}", extra={
                "metrics": metrics,
                "criteria_met": criteria_met
            })
            
            return result
            
        except Exception as e:
            logger.error(f"Validation error for {model_type} v{model_version}: {e}", exc_info=True)
            return ValidationResult(
                passed=False,
                model_version=model_version,
                metrics={},
                validation_time=datetime.now(),
                criteria_met={},
                failure_reasons=[f"Validation error: {str(e)}"]
            )
    
    def _evaluate_model(self, model: Any, test_data: Any) -> Dict[str, float]:
        """
        Evaluate model performance on test data
        
        Args:
            model: Model to evaluate
            test_data: Test dataset
            
        Returns:
            Dictionary of performance metrics
        """
        # This is a placeholder - actual implementation depends on model type
        # For now, return mock metrics
        
        start_time = time.time()
        
        # Simulate model evaluation
        # In real implementation, this would call model.evaluate() or similar
        metrics = {
            'accuracy': 0.85,
            'precision': 0.83,
            'recall': 0.87,
            'f1_score': 0.85,
            'error_rate': 0.15,
            'latency_ms': (time.time() - start_time) * 1000,
            'sample_count': 1000
        }
        
        return metrics
    
    def _compare_with_current_model(self,
                                   model_type: str,
                                   new_model: Any,
                                   test_data: Any,
                                   new_metrics: Dict[str, float]) -> Dict[str, Any]:
        """
        Compare new model with current production model
        
        Args:
            model_type: Type of model
            new_model: New model to compare
            test_data: Test dataset
            new_metrics: Metrics for new model
            
        Returns:
            Comparison results
        """
        try:
            # Get current production model
            current_version = self._get_current_production_version(model_type)
            
            if not current_version:
                return {
                    'is_better': True,
                    'reason': 'No current production model',
                    'current_version': None,
                    'improvement': {}
                }
            
            # Load and evaluate current model
            current_model = self.storage.load_model(model_type, current_version)
            current_metrics = self._evaluate_model(current_model, test_data)
            
            # Calculate improvements
            improvements = {}
            for metric, new_value in new_metrics.items():
                if metric in current_metrics:
                    current_value = current_metrics[metric]
                    if metric in ['accuracy', 'precision', 'recall', 'f1_score']:
                        # Higher is better
                        improvement = new_value - current_value
                        improvements[metric] = improvement
                    elif metric in ['error_rate', 'latency_ms']:
                        # Lower is better
                        improvement = current_value - new_value
                        improvements[metric] = improvement
            
            # Determine if new model is better
            primary_metric = 'accuracy' if 'accuracy' in improvements else list(improvements.keys())[0]
            primary_improvement = improvements.get(primary_metric, 0)
            
            is_better = primary_improvement >= self.validation_criteria.min_improvement_threshold
            
            if not is_better and self.validation_criteria.allow_equal_performance:
                is_better = primary_improvement >= 0
            
            return {
                'is_better': is_better,
                'reason': f"{primary_metric} improvement: {primary_improvement:.3f}",
                'current_version': current_version,
                'current_metrics': current_metrics,
                'new_metrics': new_metrics,
                'improvements': improvements,
                'primary_metric': primary_metric,
                'primary_improvement': primary_improvement
            }
            
        except Exception as e:
            logger.error(f"Error comparing models: {e}", exc_info=True)
            return {
                'is_better': True,  # Allow deployment if comparison fails
                'reason': f'Comparison error: {str(e)}',
                'current_version': None,
                'improvement': {}
            }
    
    def deploy_model(self,
                    model_type: str,
                    model_version: str,
                    test_data: Any,
                    strategy: Optional[DeploymentStrategy] = None,
                    skip_validation: bool = False) -> DeploymentRecord:
        """
        Deploy a model with specified strategy
        
        Args:
            model_type: Type of model
            model_version: Version to deploy
            test_data: Test data for validation
            strategy: Deployment strategy (uses config default if None)
            skip_validation: Skip validation (not recommended)
            
        Returns:
            DeploymentRecord tracking the deployment
        """
        deployment_id = f"{model_type}-{model_version}-{int(time.time())}"
        strategy = strategy or self.deployment_config.strategy
        
        logger.info(f"Starting deployment {deployment_id} with strategy {strategy.value}")
        
        # Create deployment record
        deployment = DeploymentRecord(
            deployment_id=deployment_id,
            model_type=model_type,
            model_version=model_version,
            previous_version=self._get_current_production_version(model_type),
            strategy=strategy,
            status=DeploymentStatus.PENDING,
            created_at=datetime.now()
        )
        
        self.deployments.append(deployment)
        self.active_deployments[model_type] = deployment
        
        try:
            # Validate model
            if not skip_validation:
                deployment.status = DeploymentStatus.VALIDATING
                validation_result = self.validate_model(model_type, model_version, test_data)
                deployment.validation_result = validation_result
                
                if not validation_result.passed:
                    deployment.status = DeploymentStatus.FAILED
                    deployment.error_message = "; ".join(validation_result.failure_reasons)
                    logger.error(f"Deployment {deployment_id} failed validation")
                    return deployment
            
            # Execute deployment based on strategy
            deployment.status = DeploymentStatus.DEPLOYING
            deployment.started_at = datetime.now()
            
            if strategy == DeploymentStrategy.IMMEDIATE:
                self._deploy_immediate(deployment)
            elif strategy == DeploymentStrategy.CANARY:
                self._deploy_canary(deployment)
            elif strategy == DeploymentStrategy.AB_TEST:
                self._deploy_ab_test(deployment)
            elif strategy == DeploymentStrategy.BLUE_GREEN:
                self._deploy_blue_green(deployment)
            
            deployment.status = DeploymentStatus.ACTIVE
            deployment.completed_at = datetime.now()
            
            logger.info(f"Deployment {deployment_id} completed successfully")
            
        except Exception as e:
            deployment.status = DeploymentStatus.FAILED
            deployment.error_message = str(e)
            logger.error(f"Deployment {deployment_id} failed: {e}", exc_info=True)
        
        return deployment
    
    def _deploy_immediate(self, deployment: DeploymentRecord):
        """Deploy immediately to 100% traffic"""
        logger.info(f"Immediate deployment for {deployment.model_type}")
        
        self._update_traffic_routing(
            deployment.model_type,
            deployment.model_version,
            100
        )
        
        deployment.current_traffic_percentage = 100
    
    def _deploy_canary(self, deployment: DeploymentRecord):
        """
        Gradual canary deployment with monitoring
        
        Deploys in stages: 10% -> 25% -> 50% -> 100%
        Monitors performance at each stage
        """
        logger.info(f"Canary deployment for {deployment.model_type}")
        
        for stage_percentage in self.deployment_config.canary_stages:
            logger.info(f"Canary stage: {stage_percentage}% traffic")
            
            # Update traffic routing
            self._update_traffic_routing(
                deployment.model_type,
                deployment.model_version,
                stage_percentage
            )
            
            deployment.current_traffic_percentage = stage_percentage
            
            # Monitor performance during this stage
            if stage_percentage < 100:
                time.sleep(self.deployment_config.stage_duration_minutes * 60)
                
                # Check if rollback is needed
                if self._should_rollback(deployment):
                    self._rollback_deployment(deployment)
                    raise Exception(f"Canary deployment rolled back: {deployment.rollback_reason}")
    
    def _deploy_ab_test(self, deployment: DeploymentRecord):
        """Deploy for A/B testing with traffic split"""
        logger.info(f"A/B test deployment for {deployment.model_type}")
        
        split_percentage = self.deployment_config.ab_test_traffic_split
        
        self._update_traffic_routing(
            deployment.model_type,
            deployment.model_version,
            split_percentage
        )
        
        deployment.current_traffic_percentage = split_percentage
        
        logger.info(f"A/B test running with {split_percentage}% traffic for {self.deployment_config.ab_test_duration_hours} hours")
    
    def _deploy_blue_green(self, deployment: DeploymentRecord):
        """Blue-green deployment (instant switch)"""
        logger.info(f"Blue-green deployment for {deployment.model_type}")
        
        # Prepare new version (green)
        # Switch traffic instantly
        self._update_traffic_routing(
            deployment.model_type,
            deployment.model_version,
            100
        )
        
        deployment.current_traffic_percentage = 100
    
    def _update_traffic_routing(self, model_type: str, version: str, percentage: int):
        """
        Update traffic routing for a model version
        
        Args:
            model_type: Type of model
            version: Model version
            percentage: Traffic percentage (0-100)
        """
        if model_type not in self.traffic_routing:
            self.traffic_routing[model_type] = {}
        
        # Update routing
        self.traffic_routing[model_type][version] = percentage
        
        # Adjust other versions
        total_other = 100 - percentage
        other_versions = [v for v in self.traffic_routing[model_type].keys() if v != version]
        
        if other_versions and total_other > 0:
            per_version = total_other // len(other_versions)
            for other_version in other_versions:
                self.traffic_routing[model_type][other_version] = per_version
        
        logger.debug(f"Traffic routing updated for {model_type}: {self.traffic_routing[model_type]}")
    
    def _should_rollback(self, deployment: DeploymentRecord) -> bool:
        """
        Check if deployment should be rolled back
        
        Args:
            deployment: Deployment to check
            
        Returns:
            True if rollback is needed
        """
        if not self.deployment_config.enable_auto_rollback:
            return False
        
        # Get recent metrics for the new version
        recent_metrics = self.metrics.get_recent_metrics(
            model_type=deployment.model_type,
            hours=1
        )
        
        if not recent_metrics:
            return False
        
        # Calculate average error rate
        avg_error_rate = sum(m.get('error_rate', 0) for m in recent_metrics) / len(recent_metrics)
        
        if avg_error_rate > self.deployment_config.rollback_on_error_rate:
            deployment.rollback_reason = f"High error rate: {avg_error_rate:.3f}"
            return True
        
        # Calculate average latency
        avg_latency = sum(m.get('latency_ms', 0) for m in recent_metrics) / len(recent_metrics)
        
        if avg_latency > self.deployment_config.rollback_on_latency_ms:
            deployment.rollback_reason = f"High latency: {avg_latency:.1f}ms"
            return True
        
        return False
    
    def _rollback_deployment(self, deployment: DeploymentRecord):
        """
        Rollback a deployment to previous version
        
        Args:
            deployment: Deployment to rollback
        """
        logger.warning(f"Rolling back deployment {deployment.deployment_id}: {deployment.rollback_reason}")
        
        deployment.status = DeploymentStatus.ROLLING_BACK
        
        if deployment.previous_version:
            # Restore previous version to 100% traffic
            self._update_traffic_routing(
                deployment.model_type,
                deployment.previous_version,
                100
            )
            
            # Set new version to 0%
            self._update_traffic_routing(
                deployment.model_type,
                deployment.model_version,
                0
            )
        
        deployment.status = DeploymentStatus.ROLLED_BACK
        deployment.completed_at = datetime.now()
    
    def rollback_to_version(self, model_type: str, version: str) -> bool:
        """
        Manually rollback to a specific version
        
        Args:
            model_type: Type of model
            version: Version to rollback to
            
        Returns:
            True if successful
        """
        try:
            logger.info(f"Manual rollback of {model_type} to version {version}")
            
            self._update_traffic_routing(model_type, version, 100)
            
            # Update active deployment if exists
            if model_type in self.active_deployments:
                deployment = self.active_deployments[model_type]
                deployment.status = DeploymentStatus.ROLLED_BACK
                deployment.rollback_reason = "Manual rollback"
                deployment.completed_at = datetime.now()
            
            return True
            
        except Exception as e:
            logger.error(f"Rollback failed: {e}", exc_info=True)
            return False
    
    def get_model_for_prediction(self, model_type: str) -> Tuple[str, Any]:
        """
        Get model version to use for prediction based on traffic routing
        
        Args:
            model_type: Type of model
            
        Returns:
            Tuple of (version, model)
        """
        if model_type not in self.traffic_routing or not self.traffic_routing[model_type]:
            # No routing configured, use latest
            models = self.storage.list_models(model_type)
            if models:
                latest = max(models, key=lambda m: m.get('version', '0.0.0'))
                version = latest['version']
                model = self.storage.load_model(model_type, version)
                return version, model
            raise ValueError(f"No models found for {model_type}")
        
        # Use traffic routing to select version
        routing = self.traffic_routing[model_type]
        rand = random.randint(1, 100)
        
        cumulative = 0
        for version, percentage in routing.items():
            cumulative += percentage
            if rand <= cumulative:
                model = self.storage.load_model(model_type, version)
                return version, model
        
        # Fallback to first version
        version = list(routing.keys())[0]
        model = self.storage.load_model(model_type, version)
        return version, model
    
    def _get_current_production_version(self, model_type: str) -> Optional[str]:
        """Get current production version for a model type"""
        if model_type in self.traffic_routing:
            # Return version with highest traffic
            routing = self.traffic_routing[model_type]
            if routing:
                return max(routing.items(), key=lambda x: x[1])[0]
        
        # Fallback to latest version
        models = self.storage.list_models(model_type)
        if models:
            latest = max(models, key=lambda m: m.get('version', '0.0.0'))
            return latest['version']
        
        return None
    
    def get_deployment_status(self, deployment_id: str) -> Optional[DeploymentRecord]:
        """Get status of a specific deployment"""
        for deployment in self.deployments:
            if deployment.deployment_id == deployment_id:
                return deployment
        return None
    
    def get_active_deployments(self) -> Dict[str, DeploymentRecord]:
        """Get all active deployments"""
        return dict(self.active_deployments)
    
    def get_deployment_history(self,
                              model_type: Optional[str] = None,
                              limit: int = 50) -> List[DeploymentRecord]:
        """
        Get deployment history
        
        Args:
            model_type: Filter by model type
            limit: Maximum number of records
            
        Returns:
            List of deployment records
        """
        deployments = self.deployments
        
        if model_type:
            deployments = [d for d in deployments if d.model_type == model_type]
        
        # Sort by created_at descending
        deployments = sorted(deployments, key=lambda d: d.created_at, reverse=True)
        
        return deployments[:limit]
    
    def get_traffic_routing(self, model_type: Optional[str] = None) -> Dict[str, Dict[str, int]]:
        """
        Get current traffic routing configuration
        
        Args:
            model_type: Specific model type or None for all
            
        Returns:
            Traffic routing configuration
        """
        if model_type:
            return {model_type: self.traffic_routing.get(model_type, {})}
        return dict(self.traffic_routing)
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get deployment statistics"""
        total_deployments = len(self.deployments)
        successful = len([d for d in self.deployments if d.status == DeploymentStatus.ACTIVE])
        failed = len([d for d in self.deployments if d.status == DeploymentStatus.FAILED])
        rolled_back = len([d for d in self.deployments if d.status == DeploymentStatus.ROLLED_BACK])
        
        return {
            "total_deployments": total_deployments,
            "successful": successful,
            "failed": failed,
            "rolled_back": rolled_back,
            "success_rate": (successful / total_deployments * 100) if total_deployments > 0 else 0,
            "active_deployments": len(self.active_deployments),
            "traffic_routing": self.traffic_routing
        }
