"""
Tests for Model Validation and Deployment Service

Tests comprehensive model validation and deployment functionality including:
- Model validation with criteria
- A/B testing
- Canary deployments
- Traffic routing
- Automatic rollback
"""

import pytest
import time
from datetime import datetime
from unittest.mock import Mock, MagicMock, patch
from src.services.model_validation_deployment import (
    ModelValidationDeployment,
    ValidationCriteria,
    DeploymentConfig,
    DeploymentStrategy,
    DeploymentStatus,
    ValidationResult,
    DeploymentRecord
)


class TestValidationCriteria:
    """Test ValidationCriteria configuration"""
    
    def test_default_criteria(self):
        """Test default validation criteria"""
        criteria = ValidationCriteria()
        
        assert criteria.min_accuracy == 0.75
        assert criteria.max_error_rate == 0.30
        assert criteria.min_samples == 100
        assert criteria.require_improvement is True
    
    def test_custom_criteria(self):
        """Test custom validation criteria"""
        criteria = ValidationCriteria(
            min_accuracy=0.85,
            max_error_rate=0.15,
            min_improvement_threshold=0.05
        )
        
        assert criteria.min_accuracy == 0.85
        assert criteria.max_error_rate == 0.15
        assert criteria.min_improvement_threshold == 0.05


class TestDeploymentConfig:
    """Test DeploymentConfig configuration"""
    
    def test_default_config(self):
        """Test default deployment configuration"""
        config = DeploymentConfig()
        
        assert config.strategy == DeploymentStrategy.CANARY
        assert config.canary_stages == [10, 25, 50, 100]
        assert config.enable_auto_rollback is True
    
    def test_custom_config(self):
        """Test custom deployment configuration"""
        config = DeploymentConfig(
            strategy=DeploymentStrategy.AB_TEST,
            ab_test_traffic_split=30,
            enable_auto_rollback=False
        )
        
        assert config.strategy == DeploymentStrategy.AB_TEST
        assert config.ab_test_traffic_split == 30
        assert config.enable_auto_rollback is False


class TestModelValidationDeployment:
    """Test ModelValidationDeployment functionality"""
    
    @pytest.fixture
    def mock_storage(self):
        """Create mock model storage service"""
        storage = Mock()
        storage.load_model = Mock(return_value=Mock())
        storage.list_models = Mock(return_value=[])
        return storage
    
    @pytest.fixture
    def mock_metrics(self):
        """Create mock prediction metrics service"""
        metrics = Mock()
        metrics.get_recent_metrics = Mock(return_value=[])
        return metrics
    
    @pytest.fixture
    def service(self, mock_storage, mock_metrics):
        """Create service instance"""
        return ModelValidationDeployment(mock_storage, mock_metrics)
    
    def test_service_initialization(self, service):
        """Test service initialization"""
        assert service.storage is not None
        assert service.metrics is not None
        assert service.validation_criteria is not None
        assert service.deployment_config is not None
        assert len(service.deployments) == 0
    
    def test_validate_model_success(self, service, mock_storage):
        """Test successful model validation"""
        # Mock model evaluation
        service._evaluate_model = Mock(return_value={
            'accuracy': 0.85,
            'error_rate': 0.15,
            'latency_ms': 500
        })
        
        result = service.validate_model(
            "prediction",
            "2.0.0",
            test_data=Mock(),
            compare_with_current=False
        )
        
        assert result.passed is True
        assert result.model_version == "2.0.0"
        assert result.metrics['accuracy'] == 0.85
        assert len(result.failure_reasons) == 0
    
    def test_validate_model_failure_accuracy(self, service):
        """Test model validation failure due to low accuracy"""
        service._evaluate_model = Mock(return_value={
            'accuracy': 0.70,  # Below threshold of 0.75
            'error_rate': 0.15,
            'latency_ms': 500
        })
        
        result = service.validate_model(
            "prediction",
            "2.0.0",
            test_data=Mock(),
            compare_with_current=False
        )
        
        assert result.passed is False
        assert 'accuracy' in result.failure_reasons[0].lower()
    
    def test_validate_model_failure_error_rate(self, service):
        """Test model validation failure due to high error rate"""
        service._evaluate_model = Mock(return_value={
            'accuracy': 0.85,
            'error_rate': 0.35,  # Above threshold of 0.30
            'latency_ms': 500
        })
        
        result = service.validate_model(
            "prediction",
            "2.0.0",
            test_data=Mock(),
            compare_with_current=False
        )
        
        assert result.passed is False
        assert 'error' in result.failure_reasons[0].lower()
    
    def test_validate_model_with_comparison(self, service, mock_storage):
        """Test model validation with comparison to current model"""
        # Mock current model
        mock_storage.list_models.return_value = [
            {'version': '1.0.0', 'created_at': datetime.now()}
        ]
        
        # Mock evaluations
        def mock_evaluate(model, test_data):
            # Return different metrics based on model
            if hasattr(model, '_is_new'):
                return {'accuracy': 0.88, 'error_rate': 0.12}
            return {'accuracy': 0.85, 'error_rate': 0.15}
        
        service._evaluate_model = Mock(side_effect=mock_evaluate)
        
        # Mark new model
        new_model = Mock()
        new_model._is_new = True
        mock_storage.load_model = Mock(side_effect=lambda t, v: new_model if v == "2.0.0" else Mock())
        
        result = service.validate_model(
            "prediction",
            "2.0.0",
            test_data=Mock(),
            compare_with_current=True
        )
        
        assert result.passed is True
        assert result.comparison_with_current is not None
        assert result.comparison_with_current['is_better'] is True
    
    def test_deploy_immediate_strategy(self, service):
        """Test immediate deployment strategy"""
        service._evaluate_model = Mock(return_value={
            'accuracy': 0.85,
            'error_rate': 0.15
        })
        
        config = DeploymentConfig(strategy=DeploymentStrategy.IMMEDIATE)
        service.deployment_config = config
        
        deployment = service.deploy_model(
            "prediction",
            "2.0.0",
            test_data=Mock()
        )
        
        assert deployment.status == DeploymentStatus.ACTIVE
        assert deployment.current_traffic_percentage == 100
        assert "prediction" in service.traffic_routing
        assert service.traffic_routing["prediction"]["2.0.0"] == 100
    
    def test_deploy_with_validation_failure(self, service):
        """Test deployment fails when validation fails"""
        service._evaluate_model = Mock(return_value={
            'accuracy': 0.70,  # Below threshold
            'error_rate': 0.15
        })
        
        deployment = service.deploy_model(
            "prediction",
            "2.0.0",
            test_data=Mock()
        )
        
        assert deployment.status == DeploymentStatus.FAILED
        assert deployment.validation_result.passed is False
    
    def test_deploy_canary_strategy(self, service):
        """Test canary deployment strategy"""
        service._evaluate_model = Mock(return_value={
            'accuracy': 0.85,
            'error_rate': 0.15
        })
        
        # Speed up canary stages for testing
        config = DeploymentConfig(
            strategy=DeploymentStrategy.CANARY,
            canary_stages=[10, 50, 100],
            stage_duration_minutes=0  # No wait for testing
        )
        service.deployment_config = config
        
        deployment = service.deploy_model(
            "prediction",
            "2.0.0",
            test_data=Mock()
        )
        
        assert deployment.status == DeploymentStatus.ACTIVE
        assert deployment.current_traffic_percentage == 100
    
    def test_deploy_ab_test_strategy(self, service):
        """Test A/B testing deployment strategy"""
        service._evaluate_model = Mock(return_value={
            'accuracy': 0.85,
            'error_rate': 0.15
        })
        
        config = DeploymentConfig(
            strategy=DeploymentStrategy.AB_TEST,
            ab_test_traffic_split=50
        )
        service.deployment_config = config
        
        deployment = service.deploy_model(
            "prediction",
            "2.0.0",
            test_data=Mock()
        )
        
        assert deployment.status == DeploymentStatus.ACTIVE
        assert deployment.current_traffic_percentage == 50
    
    def test_traffic_routing(self, service):
        """Test traffic routing updates"""
        service._update_traffic_routing("prediction", "1.0.0", 70)
        service._update_traffic_routing("prediction", "2.0.0", 30)
        
        assert service.traffic_routing["prediction"]["1.0.0"] == 70
        assert service.traffic_routing["prediction"]["2.0.0"] == 30
    
    def test_get_model_for_prediction(self, service, mock_storage):
        """Test getting model based on traffic routing"""
        # Setup traffic routing
        service.traffic_routing["prediction"] = {
            "1.0.0": 70,
            "2.0.0": 30
        }
        
        mock_storage.load_model = Mock(return_value=Mock())
        
        # Get model multiple times and check distribution
        versions = []
        for _ in range(100):
            version, model = service.get_model_for_prediction("prediction")
            versions.append(version)
        
        # Should get both versions
        assert "1.0.0" in versions
        assert "2.0.0" in versions
        
        # Rough check of distribution (70/30 split)
        v1_count = versions.count("1.0.0")
        assert 50 < v1_count < 90  # Allow some variance
    
    def test_rollback_deployment(self, service):
        """Test deployment rollback"""
        # Setup initial deployment
        service.traffic_routing["prediction"] = {
            "1.0.0": 0,
            "2.0.0": 100
        }
        
        deployment = DeploymentRecord(
            deployment_id="test-1",
            model_type="prediction",
            model_version="2.0.0",
            previous_version="1.0.0",
            strategy=DeploymentStrategy.IMMEDIATE,
            status=DeploymentStatus.ACTIVE,
            created_at=datetime.now()
        )
        
        # Rollback
        service._rollback_deployment(deployment)
        
        assert deployment.status == DeploymentStatus.ROLLED_BACK
        assert service.traffic_routing["prediction"]["1.0.0"] == 100
        assert service.traffic_routing["prediction"]["2.0.0"] == 0
    
    def test_manual_rollback(self, service):
        """Test manual rollback to specific version"""
        service.traffic_routing["prediction"] = {
            "1.0.0": 0,
            "2.0.0": 100
        }
        
        success = service.rollback_to_version("prediction", "1.0.0")
        
        assert success is True
        assert service.traffic_routing["prediction"]["1.0.0"] == 100
    
    def test_should_rollback_high_error_rate(self, service, mock_metrics):
        """Test automatic rollback on high error rate"""
        service.deployment_config.enable_auto_rollback = True
        service.deployment_config.rollback_on_error_rate = 0.30
        
        # Mock high error rate
        mock_metrics.get_recent_metrics.return_value = [
            {'error_rate': 0.35},
            {'error_rate': 0.40},
            {'error_rate': 0.38}
        ]
        
        deployment = DeploymentRecord(
            deployment_id="test-1",
            model_type="prediction",
            model_version="2.0.0",
            previous_version="1.0.0",
            strategy=DeploymentStrategy.CANARY,
            status=DeploymentStatus.DEPLOYING,
            created_at=datetime.now()
        )
        
        should_rollback = service._should_rollback(deployment)
        
        assert should_rollback is True
        assert 'error rate' in deployment.rollback_reason.lower()
    
    def test_should_rollback_high_latency(self, service, mock_metrics):
        """Test automatic rollback on high latency"""
        service.deployment_config.enable_auto_rollback = True
        service.deployment_config.rollback_on_latency_ms = 1000.0
        
        # Mock high latency
        mock_metrics.get_recent_metrics.return_value = [
            {'error_rate': 0.10, 'latency_ms': 1500},
            {'error_rate': 0.12, 'latency_ms': 1800},
            {'error_rate': 0.11, 'latency_ms': 1600}
        ]
        
        deployment = DeploymentRecord(
            deployment_id="test-1",
            model_type="prediction",
            model_version="2.0.0",
            previous_version="1.0.0",
            strategy=DeploymentStrategy.CANARY,
            status=DeploymentStatus.DEPLOYING,
            created_at=datetime.now()
        )
        
        should_rollback = service._should_rollback(deployment)
        
        assert should_rollback is True
        assert 'latency' in deployment.rollback_reason.lower()
    
    def test_get_deployment_history(self, service):
        """Test retrieving deployment history"""
        # Create some deployments
        for i in range(5):
            deployment = DeploymentRecord(
                deployment_id=f"test-{i}",
                model_type="prediction",
                model_version=f"2.{i}.0",
                previous_version=None,
                strategy=DeploymentStrategy.IMMEDIATE,
                status=DeploymentStatus.ACTIVE,
                created_at=datetime.now()
            )
            service.deployments.append(deployment)
        
        history = service.get_deployment_history(limit=3)
        
        assert len(history) == 3
    
    def test_get_deployment_history_filtered(self, service):
        """Test retrieving filtered deployment history"""
        # Create deployments for different models
        for model_type in ["prediction", "clustering", "prediction"]:
            deployment = DeploymentRecord(
                deployment_id=f"test-{model_type}",
                model_type=model_type,
                model_version="2.0.0",
                previous_version=None,
                strategy=DeploymentStrategy.IMMEDIATE,
                status=DeploymentStatus.ACTIVE,
                created_at=datetime.now()
            )
            service.deployments.append(deployment)
        
        history = service.get_deployment_history(model_type="prediction")
        
        assert len(history) == 2
        assert all(d.model_type == "prediction" for d in history)
    
    def test_get_statistics(self, service):
        """Test getting deployment statistics"""
        # Create deployments with different statuses
        statuses = [
            DeploymentStatus.ACTIVE,
            DeploymentStatus.ACTIVE,
            DeploymentStatus.FAILED,
            DeploymentStatus.ROLLED_BACK
        ]
        
        for i, status in enumerate(statuses):
            deployment = DeploymentRecord(
                deployment_id=f"test-{i}",
                model_type="prediction",
                model_version=f"2.{i}.0",
                previous_version=None,
                strategy=DeploymentStrategy.IMMEDIATE,
                status=status,
                created_at=datetime.now()
            )
            service.deployments.append(deployment)
        
        stats = service.get_statistics()
        
        assert stats["total_deployments"] == 4
        assert stats["successful"] == 2
        assert stats["failed"] == 1
        assert stats["rolled_back"] == 1
        assert stats["success_rate"] == 50.0


def test_deployment_status_enum():
    """Test DeploymentStatus enum"""
    assert DeploymentStatus.PENDING.value == "pending"
    assert DeploymentStatus.VALIDATING.value == "validating"
    assert DeploymentStatus.DEPLOYING.value == "deploying"
    assert DeploymentStatus.ACTIVE.value == "active"
    assert DeploymentStatus.ROLLED_BACK.value == "rolled_back"


def test_deployment_strategy_enum():
    """Test DeploymentStrategy enum"""
    assert DeploymentStrategy.IMMEDIATE.value == "immediate"
    assert DeploymentStrategy.CANARY.value == "canary"
    assert DeploymentStrategy.BLUE_GREEN.value == "blue_green"
    assert DeploymentStrategy.AB_TEST.value == "ab_test"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
