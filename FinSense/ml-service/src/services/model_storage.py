"""
Model Storage Service

This service handles the persistence, versioning, and management of ML models
using joblib for serialization and MongoDB for metadata tracking.
"""

import os
import hashlib
import shutil
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
import joblib
import requests
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)

@dataclass
class ModelMetadata:
    """Data class for model metadata"""
    model_type: str
    version: str
    name: str
    algorithm: str
    framework: str
    training_date: datetime
    training_duration: float
    dataset_info: Dict[str, Any]
    parameters: Dict[str, Any]
    performance: Dict[str, Any]
    deployment: Dict[str, Any]
    files: Dict[str, Any]
    tags: List[str] = None
    notes: str = ""
    
    def __post_init__(self):
        if self.tags is None:
            self.tags = []

class ModelStorageService:
    """Service for managing ML model storage and versioning"""
    
    def __init__(self, 
                 models_dir: str = "models",
                 backend_url: str = "http://localhost:5000"):
        """
        Initialize the model storage service
        
        Args:
            models_dir: Directory to store model files
            backend_url: URL of the Node.js backend for metadata operations
        """
        self.models_dir = Path(models_dir)
        self.backend_url = backend_url.rstrip('/')
        self.models_dir.mkdir(exist_ok=True)
        
        # Create subdirectories for different model types
        for model_type in ['clustering', 'prediction', 'stress']:
            (self.models_dir / model_type).mkdir(exist_ok=True)
    
    def _generate_model_path(self, model_type: str, version: str, filename: str) -> Path:
        """Generate the file path for a model"""
        return self.models_dir / model_type / f"v{version}" / filename
    
    def _calculate_checksum(self, file_path: Path) -> str:
        """Calculate SHA-256 checksum of a file"""
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                sha256_hash.update(chunk)
        return sha256_hash.hexdigest()
    
    def _get_file_size(self, file_path: Path) -> int:
        """Get file size in bytes"""
        return file_path.stat().st_size
    
    def save_model(self, 
                   model: Any,
                   metadata: ModelMetadata,
                   scaler: Any = None,
                   config: Dict[str, Any] = None) -> str:
        """
        Save a model with its metadata and associated files
        
        Args:
            model: The trained model object
            metadata: Model metadata
            scaler: Optional data scaler/preprocessor
            config: Optional configuration dictionary
            
        Returns:
            str: The model ID/path for future reference
        """
        try:
            # Create version directory
            version_dir = self.models_dir / metadata.model_type / f"v{metadata.version}"
            version_dir.mkdir(parents=True, exist_ok=True)
            
            # Define file paths
            model_path = version_dir / "model.joblib"
            scaler_path = version_dir / "scaler.joblib" if scaler else None
            config_path = version_dir / "config.joblib" if config else None
            
            # Save model
            joblib.dump(model, model_path)
            logger.info(f"Saved model to {model_path}")
            
            # Save scaler if provided
            if scaler:
                joblib.dump(scaler, scaler_path)
                logger.info(f"Saved scaler to {scaler_path}")
            
            # Save config if provided
            if config:
                joblib.dump(config, config_path)
                logger.info(f"Saved config to {config_path}")
            
            # Calculate checksums and file sizes
            model_checksum = self._calculate_checksum(model_path)
            model_size = self._get_file_size(model_path)
            
            # Update metadata with file information
            metadata.files = {
                "modelPath": str(model_path.relative_to(self.models_dir)),
                "scalerPath": str(scaler_path.relative_to(self.models_dir)) if scaler_path else None,
                "configPath": str(config_path.relative_to(self.models_dir)) if config_path else None,
                "size": model_size,
                "checksum": model_checksum
            }
            
            # Save metadata to backend
            metadata_id = self._save_metadata_to_backend(metadata)
            
            logger.info(f"Successfully saved model {metadata.model_type} v{metadata.version}")
            return metadata_id
            
        except Exception as e:
            logger.error(f"Failed to save model: {str(e)}")
            # Cleanup on failure
            if version_dir.exists():
                shutil.rmtree(version_dir)
            raise
    
    def load_model(self, 
                   model_type: str, 
                   version: str = None,
                   load_scaler: bool = True,
                   load_config: bool = True) -> Tuple[Any, Optional[Any], Optional[Dict], Dict]:
        """
        Load a model with its associated files and metadata
        
        Args:
            model_type: Type of model to load
            version: Specific version to load (latest if None)
            load_scaler: Whether to load the scaler
            load_config: Whether to load the config
            
        Returns:
            Tuple of (model, scaler, config, metadata)
        """
        try:
            # Get metadata from backend
            if version:
                metadata = self._get_metadata_from_backend(model_type, version)
            else:
                metadata = self._get_latest_metadata_from_backend(model_type)
            
            if not metadata:
                raise ValueError(f"No model found for type {model_type}" + 
                               (f" version {version}" if version else ""))
            
            # Load model
            model_path = self.models_dir / metadata['files']['modelPath']
            if not model_path.exists():
                raise FileNotFoundError(f"Model file not found: {model_path}")
            
            model = joblib.load(model_path)
            logger.info(f"Loaded model from {model_path}")
            
            # Load scaler if requested and available
            scaler = None
            if load_scaler and metadata['files'].get('scalerPath'):
                scaler_path = self.models_dir / metadata['files']['scalerPath']
                if scaler_path.exists():
                    scaler = joblib.load(scaler_path)
                    logger.info(f"Loaded scaler from {scaler_path}")
            
            # Load config if requested and available
            config = None
            if load_config and metadata['files'].get('configPath'):
                config_path = self.models_dir / metadata['files']['configPath']
                if config_path.exists():
                    config = joblib.load(config_path)
                    logger.info(f"Loaded config from {config_path}")
            
            # Verify model integrity
            if not self._verify_model_integrity(model_path, metadata['files']['checksum']):
                logger.warning(f"Model integrity check failed for {model_path}")
            
            return model, scaler, config, metadata
            
        except Exception as e:
            logger.error(f"Failed to load model: {str(e)}")
            raise
    
    def list_models(self, model_type: str = None) -> List[Dict]:
        """
        List all available models
        
        Args:
            model_type: Filter by model type (optional)
            
        Returns:
            List of model metadata dictionaries
        """
        try:
            return self._list_models_from_backend(model_type)
        except Exception as e:
            logger.error(f"Failed to list models: {str(e)}")
            raise
    
    def delete_model(self, model_type: str, version: str) -> bool:
        """
        Delete a model and its associated files
        
        Args:
            model_type: Type of model to delete
            version: Version to delete
            
        Returns:
            bool: True if successful
        """
        try:
            # Get metadata first
            metadata = self._get_metadata_from_backend(model_type, version)
            if not metadata:
                logger.warning(f"Model {model_type} v{version} not found in metadata")
                return False
            
            # Delete files
            version_dir = self.models_dir / model_type / f"v{version}"
            if version_dir.exists():
                shutil.rmtree(version_dir)
                logger.info(f"Deleted model files from {version_dir}")
            
            # Delete metadata from backend
            self._delete_metadata_from_backend(metadata['_id'])
            
            logger.info(f"Successfully deleted model {model_type} v{version}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete model: {str(e)}")
            raise
    
    def rollback_model(self, model_type: str, target_version: str) -> bool:
        """
        Rollback to a previous model version by setting it as active
        
        Args:
            model_type: Type of model to rollback
            target_version: Version to rollback to
            
        Returns:
            bool: True if successful
        """
        try:
            # Verify target version exists
            metadata = self._get_metadata_from_backend(model_type, target_version)
            if not metadata:
                raise ValueError(f"Target version {target_version} not found")
            
            # Set target version as production
            success = self._set_model_deployment_status(
                metadata['_id'], 'production'
            )
            
            if success:
                logger.info(f"Successfully rolled back {model_type} to version {target_version}")
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to rollback model: {str(e)}")
            raise
    
    def get_model_performance_history(self, model_type: str, limit: int = 10) -> List[Dict]:
        """
        Get performance history for a model type
        
        Args:
            model_type: Type of model
            limit: Maximum number of records to return
            
        Returns:
            List of performance records
        """
        try:
            return self._get_performance_history_from_backend(model_type, limit)
        except Exception as e:
            logger.error(f"Failed to get performance history: {str(e)}")
            raise
    
    def _verify_model_integrity(self, file_path: Path, expected_checksum: str) -> bool:
        """Verify model file integrity using checksum"""
        try:
            actual_checksum = self._calculate_checksum(file_path)
            return actual_checksum == expected_checksum
        except Exception as e:
            logger.error(f"Failed to verify model integrity: {str(e)}")
            return False
    
    def _save_metadata_to_backend(self, metadata: ModelMetadata) -> str:
        """Save model metadata to the backend"""
        try:
            # Convert dataclass to dict and format for backend
            metadata_dict = asdict(metadata)
            
            # Format dates for JSON serialization
            if isinstance(metadata_dict['training_date'], datetime):
                metadata_dict['trainingDate'] = metadata_dict.pop('training_date').isoformat()
            
            # Rename fields to match backend schema
            metadata_dict['trainingDuration'] = metadata_dict.pop('training_duration')
            metadata_dict['datasetInfo'] = metadata_dict.pop('dataset_info')
            metadata_dict['modelType'] = metadata_dict.pop('model_type')
            
            response = requests.post(
                f"{self.backend_url}/api/ml/models/metadata",
                json=metadata_dict,
                timeout=30
            )
            response.raise_for_status()
            
            result = response.json()
            return result.get('id') or result.get('_id')
            
        except requests.RequestException as e:
            logger.error(f"Failed to save metadata to backend: {str(e)}")
            raise
    
    def _get_metadata_from_backend(self, model_type: str, version: str) -> Optional[Dict]:
        """Get specific model metadata from backend"""
        try:
            response = requests.get(
                f"{self.backend_url}/api/ml/models/metadata/{model_type}/{version}",
                timeout=30
            )
            
            if response.status_code == 404:
                return None
                
            response.raise_for_status()
            return response.json()
            
        except requests.RequestException as e:
            logger.error(f"Failed to get metadata from backend: {str(e)}")
            raise
    
    def _get_latest_metadata_from_backend(self, model_type: str) -> Optional[Dict]:
        """Get latest model metadata from backend"""
        try:
            response = requests.get(
                f"{self.backend_url}/api/ml/models/metadata/{model_type}/latest",
                timeout=30
            )
            
            if response.status_code == 404:
                return None
                
            response.raise_for_status()
            return response.json()
            
        except requests.RequestException as e:
            logger.error(f"Failed to get latest metadata from backend: {str(e)}")
            raise
    
    def _list_models_from_backend(self, model_type: str = None) -> List[Dict]:
        """List models from backend"""
        try:
            url = f"{self.backend_url}/api/ml/models/metadata"
            if model_type:
                url += f"?modelType={model_type}"
            
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            
            return response.json()
            
        except requests.RequestException as e:
            logger.error(f"Failed to list models from backend: {str(e)}")
            raise
    
    def _delete_metadata_from_backend(self, model_id: str) -> bool:
        """Delete model metadata from backend"""
        try:
            response = requests.delete(
                f"{self.backend_url}/api/ml/models/metadata/{model_id}",
                timeout=30
            )
            response.raise_for_status()
            return True
            
        except requests.RequestException as e:
            logger.error(f"Failed to delete metadata from backend: {str(e)}")
            raise
    
    def _set_model_deployment_status(self, model_id: str, status: str) -> bool:
        """Set model deployment status in backend"""
        try:
            response = requests.patch(
                f"{self.backend_url}/api/ml/models/metadata/{model_id}/deployment",
                json={"status": status},
                timeout=30
            )
            response.raise_for_status()
            return True
            
        except requests.RequestException as e:
            logger.error(f"Failed to set deployment status: {str(e)}")
            raise
    
    def _get_performance_history_from_backend(self, model_type: str, limit: int) -> List[Dict]:
        """Get performance history from backend"""
        try:
            response = requests.get(
                f"{self.backend_url}/api/ml/models/metadata/{model_type}/performance?limit={limit}",
                timeout=30
            )
            response.raise_for_status()
            return response.json()
            
        except requests.RequestException as e:
            logger.error(f"Failed to get performance history: {str(e)}")
            raise