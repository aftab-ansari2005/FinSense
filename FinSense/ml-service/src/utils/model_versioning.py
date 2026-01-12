"""
Model Versioning Utilities

This module provides utilities for semantic versioning, model comparison,
and automated version management for ML models.
"""

import re
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from packaging import version

logger = logging.getLogger(__name__)

@dataclass
class VersionInfo:
    """Version information with semantic versioning support"""
    major: int
    minor: int
    patch: int
    
    def __str__(self) -> str:
        return f"{self.major}.{self.minor}.{self.patch}"
    
    def __lt__(self, other):
        return version.parse(str(self)) < version.parse(str(other))
    
    def __le__(self, other):
        return version.parse(str(self)) <= version.parse(str(other))
    
    def __gt__(self, other):
        return version.parse(str(self)) > version.parse(str(other))
    
    def __ge__(self, other):
        return version.parse(str(self)) >= version.parse(str(other))
    
    def __eq__(self, other):
        return version.parse(str(self)) == version.parse(str(other))

class ModelVersionManager:
    """Manages model versioning with semantic versioning rules"""
    
    def __init__(self, model_storage_service):
        """
        Initialize the version manager
        
        Args:
            model_storage_service: Instance of ModelStorageService
        """
        self.storage = model_storage_service
    
    def parse_version(self, version_string: str) -> VersionInfo:
        """
        Parse a version string into VersionInfo
        
        Args:
            version_string: Version string (e.g., "1.2.3")
            
        Returns:
            VersionInfo object
        """
        pattern = r'^(\d+)\.(\d+)\.(\d+)$'
        match = re.match(pattern, version_string)
        
        if not match:
            raise ValueError(f"Invalid version format: {version_string}")
        
        return VersionInfo(
            major=int(match.group(1)),
            minor=int(match.group(2)),
            patch=int(match.group(3))
        )
    
    def get_next_version(self, 
                        model_type: str, 
                        change_type: str = "patch") -> str:
        """
        Generate the next version number based on change type
        
        Args:
            model_type: Type of model
            change_type: Type of change ("major", "minor", "patch")
            
        Returns:
            Next version string
        """
        try:
            # Get current latest version
            models = self.storage.list_models(model_type)
            
            if not models:
                # First version
                return "1.0.0"
            
            # Find the highest version
            latest_version = VersionInfo(0, 0, 0)
            for model in models:
                try:
                    model_version = self.parse_version(model['version'])
                    if model_version > latest_version:
                        latest_version = model_version
                except ValueError:
                    logger.warning(f"Invalid version format: {model['version']}")
                    continue
            
            # Increment based on change type
            if change_type == "major":
                return str(VersionInfo(latest_version.major + 1, 0, 0))
            elif change_type == "minor":
                return str(VersionInfo(latest_version.major, latest_version.minor + 1, 0))
            else:  # patch
                return str(VersionInfo(latest_version.major, latest_version.minor, latest_version.patch + 1))
                
        except Exception as e:
            logger.error(f"Failed to generate next version: {str(e)}")
            raise
    
    def compare_model_performance(self, 
                                 model_type: str, 
                                 version1: str, 
                                 version2: str) -> Dict[str, any]:
        """
        Compare performance between two model versions
        
        Args:
            model_type: Type of model
            version1: First version to compare
            version2: Second version to compare
            
        Returns:
            Comparison results dictionary
        """
        try:
            # Get metadata for both versions
            metadata1 = self.storage._get_metadata_from_backend(model_type, version1)
            metadata2 = self.storage._get_metadata_from_backend(model_type, version2)
            
            if not metadata1 or not metadata2:
                raise ValueError("One or both model versions not found")
            
            # Extract performance metrics
            perf1 = metadata1.get('performance', {}).get('validation', {})
            perf2 = metadata2.get('performance', {}).get('validation', {})
            
            comparison = {
                'version1': version1,
                'version2': version2,
                'metrics': {},
                'winner': None,
                'improvement': {}
            }
            
            # Compare common metrics
            metrics_to_compare = ['accuracy', 'mae', 'rmse', 'r2Score']
            
            for metric in metrics_to_compare:
                if metric in perf1 and metric in perf2:
                    val1 = perf1[metric]
                    val2 = perf2[metric]
                    
                    comparison['metrics'][metric] = {
                        'version1': val1,
                        'version2': val2,
                        'difference': val2 - val1,
                        'percent_change': ((val2 - val1) / val1 * 100) if val1 != 0 else 0
                    }
                    
                    # For MAE and RMSE, lower is better
                    if metric in ['mae', 'rmse']:
                        comparison['improvement'][metric] = val2 < val1
                    else:
                        comparison['improvement'][metric] = val2 > val1
            
            # Determine overall winner based on primary metric (r2Score or accuracy)
            if 'r2Score' in comparison['metrics']:
                comparison['winner'] = version2 if comparison['improvement']['r2Score'] else version1
            elif 'accuracy' in comparison['metrics']:
                comparison['winner'] = version2 if comparison['improvement']['accuracy'] else version1
            
            return comparison
            
        except Exception as e:
            logger.error(f"Failed to compare model performance: {str(e)}")
            raise
    
    def should_retrain_model(self, 
                           model_type: str, 
                           max_age_days: int = 30,
                           min_performance_threshold: float = 0.8,
                           max_error_rate: float = 0.1) -> Tuple[bool, List[str]]:
        """
        Determine if a model should be retrained based on various criteria
        
        Args:
            model_type: Type of model to check
            max_age_days: Maximum age in days before retraining
            min_performance_threshold: Minimum performance score threshold
            max_error_rate: Maximum acceptable error rate
            
        Returns:
            Tuple of (should_retrain, reasons)
        """
        try:
            reasons = []
            
            # Get latest model metadata
            metadata = self.storage._get_latest_metadata_from_backend(model_type)
            if not metadata:
                return True, ["No model exists"]
            
            # Check age
            training_date = datetime.fromisoformat(metadata['trainingDate'].replace('Z', '+00:00'))
            age_days = (datetime.now() - training_date.replace(tzinfo=None)).days
            
            if age_days > max_age_days:
                reasons.append(f"Model is {age_days} days old (max: {max_age_days})")
            
            # Check performance
            performance = metadata.get('performance', {}).get('validation', {})
            
            # Check R² score or accuracy
            if 'r2Score' in performance:
                if performance['r2Score'] < min_performance_threshold:
                    reasons.append(f"R² score {performance['r2Score']:.3f} below threshold {min_performance_threshold}")
            elif 'accuracy' in performance:
                if performance['accuracy'] < min_performance_threshold:
                    reasons.append(f"Accuracy {performance['accuracy']:.3f} below threshold {min_performance_threshold}")
            
            # Check error rate
            monitoring = metadata.get('monitoring', {})
            error_rate = monitoring.get('errorRate', 0)
            
            if error_rate > max_error_rate:
                reasons.append(f"Error rate {error_rate:.3f} above threshold {max_error_rate}")
            
            # Check for performance drift
            drift = monitoring.get('performanceDrift', {})
            if drift.get('detected', False):
                severity = drift.get('severity', 'unknown')
                reasons.append(f"Performance drift detected (severity: {severity})")
            
            return len(reasons) > 0, reasons
            
        except Exception as e:
            logger.error(f"Failed to check retraining criteria: {str(e)}")
            raise
    
    def get_rollback_candidates(self, 
                              model_type: str, 
                              current_version: str = None) -> List[Dict]:
        """
        Get list of viable rollback candidates for a model
        
        Args:
            model_type: Type of model
            current_version: Current version (latest if None)
            
        Returns:
            List of rollback candidates with metadata
        """
        try:
            # Get all models of this type
            models = self.storage.list_models(model_type)
            
            if not models:
                return []
            
            # Filter for stable versions (not in training/testing status)
            stable_statuses = ['production', 'staging']
            candidates = [
                model for model in models 
                if model.get('deployment', {}).get('status') in stable_statuses
            ]
            
            # Exclude current version if specified
            if current_version:
                candidates = [
                    model for model in candidates 
                    if model['version'] != current_version
                ]
            
            # Sort by performance score (best first)
            def get_performance_score(model):
                perf = model.get('performance', {}).get('validation', {})
                if 'r2Score' in perf:
                    return perf['r2Score']
                elif 'accuracy' in perf:
                    return perf['accuracy']
                return 0
            
            candidates.sort(key=get_performance_score, reverse=True)
            
            # Add rollback suitability information
            for candidate in candidates:
                candidate['rollback_info'] = {
                    'performance_score': get_performance_score(candidate),
                    'age_days': (datetime.now() - datetime.fromisoformat(
                        candidate['trainingDate'].replace('Z', '+00:00')
                    ).replace(tzinfo=None)).days,
                    'prediction_count': candidate.get('monitoring', {}).get('predictionCount', 0),
                    'error_rate': candidate.get('monitoring', {}).get('errorRate', 0)
                }
            
            return candidates[:5]  # Return top 5 candidates
            
        except Exception as e:
            logger.error(f"Failed to get rollback candidates: {str(e)}")
            raise
    
    def validate_model_before_deployment(self, 
                                       model_type: str, 
                                       version: str,
                                       validation_criteria: Dict = None) -> Tuple[bool, List[str]]:
        """
        Validate a model before deployment
        
        Args:
            model_type: Type of model
            version: Version to validate
            validation_criteria: Custom validation criteria
            
        Returns:
            Tuple of (is_valid, validation_messages)
        """
        try:
            messages = []
            
            # Default validation criteria
            default_criteria = {
                'min_r2_score': 0.7,
                'min_accuracy': 0.8,
                'max_mae': 1000,
                'max_rmse': 1500,
                'min_dataset_size': 100
            }
            
            criteria = {**default_criteria, **(validation_criteria or {})}
            
            # Get model metadata
            metadata = self.storage._get_metadata_from_backend(model_type, version)
            if not metadata:
                return False, ["Model not found"]
            
            # Check if model files exist
            try:
                model, _, _, _ = self.storage.load_model(model_type, version)
                messages.append("✓ Model files loaded successfully")
            except Exception as e:
                return False, [f"Failed to load model files: {str(e)}"]
            
            # Validate performance metrics
            performance = metadata.get('performance', {}).get('validation', {})
            
            if 'r2Score' in performance:
                r2_score = performance['r2Score']
                if r2_score >= criteria['min_r2_score']:
                    messages.append(f"✓ R² score {r2_score:.3f} meets threshold {criteria['min_r2_score']}")
                else:
                    messages.append(f"✗ R² score {r2_score:.3f} below threshold {criteria['min_r2_score']}")
            
            if 'accuracy' in performance:
                accuracy = performance['accuracy']
                if accuracy >= criteria['min_accuracy']:
                    messages.append(f"✓ Accuracy {accuracy:.3f} meets threshold {criteria['min_accuracy']}")
                else:
                    messages.append(f"✗ Accuracy {accuracy:.3f} below threshold {criteria['min_accuracy']}")
            
            if 'mae' in performance:
                mae = performance['mae']
                if mae <= criteria['max_mae']:
                    messages.append(f"✓ MAE {mae:.2f} within acceptable range")
                else:
                    messages.append(f"✗ MAE {mae:.2f} exceeds threshold {criteria['max_mae']}")
            
            if 'rmse' in performance:
                rmse = performance['rmse']
                if rmse <= criteria['max_rmse']:
                    messages.append(f"✓ RMSE {rmse:.2f} within acceptable range")
                else:
                    messages.append(f"✗ RMSE {rmse:.2f} exceeds threshold {criteria['max_rmse']}")
            
            # Validate dataset size
            dataset_info = metadata.get('datasetInfo', {})
            dataset_size = dataset_info.get('size', 0)
            
            if dataset_size >= criteria['min_dataset_size']:
                messages.append(f"✓ Dataset size {dataset_size} meets minimum requirement")
            else:
                messages.append(f"✗ Dataset size {dataset_size} below minimum {criteria['min_dataset_size']}")
            
            # Check for any validation failures
            is_valid = not any(msg.startswith('✗') for msg in messages)
            
            return is_valid, messages
            
        except Exception as e:
            logger.error(f"Failed to validate model: {str(e)}")
            return False, [f"Validation error: {str(e)}"]
    
    def create_model_snapshot(self, model_type: str, version: str, tag: str = None) -> str:
        """
        Create a snapshot/backup of a model version
        
        Args:
            model_type: Type of model
            version: Version to snapshot
            tag: Optional tag for the snapshot
            
        Returns:
            Snapshot identifier
        """
        try:
            # Load the model and its metadata
            model, scaler, config, metadata = self.storage.load_model(model_type, version)
            
            # Create snapshot version
            snapshot_version = f"{version}-snapshot-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
            
            # Update metadata for snapshot
            from ..services.model_storage import ModelMetadata
            
            snapshot_metadata = ModelMetadata(
                model_type=metadata['modelType'],
                version=snapshot_version,
                name=f"{metadata['name']} (Snapshot)",
                algorithm=metadata['algorithm'],
                framework=metadata['framework'],
                training_date=datetime.fromisoformat(metadata['trainingDate'].replace('Z', '+00:00')),
                training_duration=metadata['trainingDuration'],
                dataset_info=metadata['datasetInfo'],
                parameters=metadata['parameters'],
                performance=metadata['performance'],
                deployment={'status': 'staging', 'deployedAt': None},
                files={},
                tags=metadata.get('tags', []) + (['snapshot'] + ([tag] if tag else []))
            )
            
            # Save snapshot
            snapshot_id = self.storage.save_model(model, snapshot_metadata, scaler, config)
            
            logger.info(f"Created snapshot {snapshot_version} for {model_type} v{version}")
            return snapshot_id
            
        except Exception as e:
            logger.error(f"Failed to create model snapshot: {str(e)}")
            raise