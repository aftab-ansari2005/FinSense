"""
LSTM Prediction Model Service

This service implements LSTM neural networks for financial balance prediction,
including model training, validation, and 30-day balance forecasting capabilities.
"""

import logging
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional, Any, Union
from dataclasses import dataclass
import joblib
import json

# TensorFlow/Keras imports
try:
    import tensorflow as tf
    from tensorflow.keras.models import Sequential, Model
    from tensorflow.keras.layers import LSTM, Dense, Dropout, BatchNormalization, Input
    from tensorflow.keras.optimizers import Adam, RMSprop
    from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint
    from tensorflow.keras.regularizers import l1_l2
    TENSORFLOW_AVAILABLE = True
except ImportError:
    TENSORFLOW_AVAILABLE = False
    tf = None

from .time_series_preprocessing import TimeSeriesPreprocessor, TimeSeriesConfig

logger = logging.getLogger(__name__)

@dataclass
class LSTMConfig:
    """Configuration for LSTM prediction model"""
    # Model architecture
    lstm_units: List[int] = None  # LSTM layer units
    dense_units: List[int] = None  # Dense layer units
    dropout_rate: float = 0.2
    recurrent_dropout: float = 0.2
    use_batch_normalization: bool = True
    use_bidirectional: bool = False
    
    # Regularization
    l1_reg: float = 0.0
    l2_reg: float = 0.001
    
    # Training parameters
    optimizer: str = 'adam'
    learning_rate: float = 0.001
    loss_function: str = 'mse'
    metrics: List[str] = None
    
    # Training configuration
    epochs: int = 100
    batch_size: int = 32
    validation_split: float = 0.2
    shuffle: bool = True
    
    # Callbacks
    early_stopping_patience: int = 15
    reduce_lr_patience: int = 10
    reduce_lr_factor: float = 0.5
    min_lr: float = 1e-7
    
    # Model saving
    save_best_only: bool = True
    monitor_metric: str = 'val_loss'
    mode: str = 'min'
    
    def __post_init__(self):
        if self.lstm_units is None:
            self.lstm_units = [50, 50]
        if self.dense_units is None:
            self.dense_units = [25]
        if self.metrics is None:
            self.metrics = ['mae', 'mse']

@dataclass
class PredictionResult:
    """Result of a prediction operation"""
    user_id: str
    predictions: np.ndarray
    confidence_intervals: Dict[str, np.ndarray]
    model_accuracy: float
    prediction_dates: List[datetime]
    input_sequence: np.ndarray
    metadata: Dict[str, Any]
    generated_at: datetime

class LSTMPredictionModel:
    """
    LSTM-based financial balance prediction model
    """
    
    def __init__(self, config: LSTMConfig = None, preprocessor: TimeSeriesPreprocessor = None):
        """
        Initialize the LSTM prediction model
        
        Args:
            config: Configuration for the LSTM model
            preprocessor: Time series preprocessor (optional)
        """
        if not TENSORFLOW_AVAILABLE:
            raise ImportError(
                "TensorFlow is required for LSTM prediction model. "
                "Install with: pip install tensorflow"
            )
        
        self.config = config or LSTMConfig()
        self.preprocessor = preprocessor
        
        # Model components
        self.model = None
        self.history = None
        
        # Training statistics
        self.training_stats = {}
        self.validation_stats = {}
        
        # Model metadata
        self.model_metadata = {
            'created_at': datetime.now(),
            'version': '1.0.0',
            'framework': 'tensorflow',
            'model_type': 'lstm_financial_predictor'
        }
        
        self.is_fitted = False
    
    def _create_model(self, input_shape: Tuple[int, int], output_size: int) -> Model:
        """
        Create the LSTM model architecture
        
        Args:
            input_shape: Shape of input sequences (sequence_length, n_features)
            output_size: Number of prediction steps
            
        Returns:
            Compiled Keras model
        """
        model = Sequential()
        
        # Input layer
        model.add(Input(shape=input_shape))
        
        # LSTM layers
        for i, units in enumerate(self.config.lstm_units):
            return_sequences = i < len(self.config.lstm_units) - 1
            
            if self.config.use_bidirectional:
                from tensorflow.keras.layers import Bidirectional
                model.add(Bidirectional(
                    LSTM(
                        units,
                        return_sequences=return_sequences,
                        dropout=self.config.dropout_rate,
                        recurrent_dropout=self.config.recurrent_dropout,
                        kernel_regularizer=l1_l2(l1=self.config.l1_reg, l2=self.config.l2_reg)
                    )
                ))
            else:
                model.add(LSTM(
                    units,
                    return_sequences=return_sequences,
                    dropout=self.config.dropout_rate,
                    recurrent_dropout=self.config.recurrent_dropout,
                    kernel_regularizer=l1_l2(l1=self.config.l1_reg, l2=self.config.l2_reg)
                ))
            
            if self.config.use_batch_normalization:
                model.add(BatchNormalization())
        
        # Dense layers
        for units in self.config.dense_units:
            model.add(Dense(
                units,
                activation='relu',
                kernel_regularizer=l1_l2(l1=self.config.l1_reg, l2=self.config.l2_reg)
            ))
            model.add(Dropout(self.config.dropout_rate))
            
            if self.config.use_batch_normalization:
                model.add(BatchNormalization())
        
        # Output layer
        model.add(Dense(output_size, activation='linear'))
        
        # Compile model
        optimizer = self._create_optimizer()
        model.compile(
            optimizer=optimizer,
            loss=self.config.loss_function,
            metrics=self.config.metrics
        )
        
        return model
    
    def _create_optimizer(self):
        """Create the optimizer based on configuration"""
        if self.config.optimizer.lower() == 'adam':
            return Adam(learning_rate=self.config.learning_rate)
        elif self.config.optimizer.lower() == 'rmsprop':
            return RMSprop(learning_rate=self.config.learning_rate)
        else:
            raise ValueError(f"Unsupported optimizer: {self.config.optimizer}")
    
    def _create_callbacks(self, model_filepath: str = None) -> List:
        """
        Create training callbacks
        
        Args:
            model_filepath: Path to save the best model
            
        Returns:
            List of Keras callbacks
        """
        callbacks = []
        
        # Early stopping
        early_stopping = EarlyStopping(
            monitor=self.config.monitor_metric,
            patience=self.config.early_stopping_patience,
            restore_best_weights=True,
            verbose=1
        )
        callbacks.append(early_stopping)
        
        # Reduce learning rate on plateau
        reduce_lr = ReduceLROnPlateau(
            monitor=self.config.monitor_metric,
            factor=self.config.reduce_lr_factor,
            patience=self.config.reduce_lr_patience,
            min_lr=self.config.min_lr,
            verbose=1
        )
        callbacks.append(reduce_lr)
        
        # Model checkpoint
        if model_filepath:
            checkpoint = ModelCheckpoint(
                filepath=model_filepath,
                monitor=self.config.monitor_metric,
                save_best_only=self.config.save_best_only,
                mode=self.config.mode,
                verbose=1
            )
            callbacks.append(checkpoint)
        
        return callbacks
    
    def fit(self, 
            X_train: np.ndarray, 
            y_train: np.ndarray,
            X_val: np.ndarray = None,
            y_val: np.ndarray = None,
            model_filepath: str = None) -> Dict[str, Any]:
        """
        Train the LSTM model
        
        Args:
            X_train: Training input sequences
            y_train: Training target sequences
            X_val: Validation input sequences (optional)
            y_val: Validation target sequences (optional)
            model_filepath: Path to save the best model
            
        Returns:
            Training results and statistics
        """
        logger.info(f"Training LSTM model on {len(X_train)} sequences")
        
        # Validate input shapes
        if X_train.ndim != 3:
            raise ValueError(f"X_train must be 3D array, got {X_train.ndim}D")
        if y_train.ndim != 2:
            raise ValueError(f"y_train must be 2D array, got {y_train.ndim}D")
        
        # Create model
        input_shape = (X_train.shape[1], X_train.shape[2])
        output_size = y_train.shape[1]
        
        self.model = self._create_model(input_shape, output_size)
        
        logger.info(f"Model architecture: {input_shape} -> {output_size}")
        logger.info(f"Total parameters: {self.model.count_params():,}")
        
        # Prepare validation data
        if X_val is not None and y_val is not None:
            validation_data = (X_val, y_val)
            validation_split = None
        else:
            validation_data = None
            validation_split = self.config.validation_split
        
        # Create callbacks
        callbacks = self._create_callbacks(model_filepath)
        
        # Train model
        start_time = datetime.now()
        
        self.history = self.model.fit(
            X_train, y_train,
            epochs=self.config.epochs,
            batch_size=self.config.batch_size,
            validation_data=validation_data,
            validation_split=validation_split,
            shuffle=self.config.shuffle,
            callbacks=callbacks,
            verbose=1
        )
        
        training_time = (datetime.now() - start_time).total_seconds()
        
        # Calculate training statistics
        self.training_stats = {
            'training_time_seconds': training_time,
            'epochs_trained': len(self.history.history['loss']),
            'final_train_loss': float(self.history.history['loss'][-1]),
            'best_train_loss': float(min(self.history.history['loss'])),
            'final_train_mae': float(self.history.history.get('mae', [0])[-1]),
            'model_parameters': int(self.model.count_params()),
            'input_shape': input_shape,
            'output_size': output_size
        }
        
        # Validation statistics
        if 'val_loss' in self.history.history:
            self.validation_stats = {
                'final_val_loss': float(self.history.history['val_loss'][-1]),
                'best_val_loss': float(min(self.history.history['val_loss'])),
                'final_val_mae': float(self.history.history.get('val_mae', [0])[-1]),
                'best_epoch': int(np.argmin(self.history.history['val_loss'])) + 1
            }
        
        # Update metadata
        self.model_metadata.update({
            'trained_at': datetime.now(),
            'training_stats': self.training_stats,
            'validation_stats': self.validation_stats,
            'config': self.config
        })
        
        self.is_fitted = True
        
        logger.info(f"Training complete in {training_time:.2f}s")
        logger.info(f"Final train loss: {self.training_stats['final_train_loss']:.6f}")
        if self.validation_stats:
            logger.info(f"Final val loss: {self.validation_stats['final_val_loss']:.6f}")
        
        return {
            'training_stats': self.training_stats,
            'validation_stats': self.validation_stats,
            'history': self.history.history,
            'model_metadata': self.model_metadata
        }
    
    def predict(self, 
                X: np.ndarray, 
                user_id: str = None,
                calculate_confidence: bool = True) -> PredictionResult:
        """
        Make predictions using the trained model
        
        Args:
            X: Input sequences for prediction
            user_id: User ID for the prediction
            calculate_confidence: Whether to calculate confidence intervals
            
        Returns:
            PredictionResult object
        """
        if not self.is_fitted:
            raise ValueError("Model must be fitted before making predictions")
        
        if X.ndim != 3:
            raise ValueError(f"X must be 3D array, got {X.ndim}D")
        
        logger.info(f"Making predictions for {len(X)} sequences")
        
        # Make predictions
        predictions_scaled = self.model.predict(X, verbose=0)
        
        # Convert back to original scale if preprocessor is available
        if self.preprocessor:
            predictions = self.preprocessor.inverse_transform_targets(predictions_scaled)
        else:
            predictions = predictions_scaled
        
        # Calculate confidence intervals
        confidence_intervals = {}
        if calculate_confidence:
            confidence_intervals = self._calculate_confidence_intervals(
                X, predictions_scaled, predictions
            )
        
        # Generate prediction dates (assuming daily predictions)
        prediction_dates = []
        if predictions.shape[1] > 0:
            base_date = datetime.now().date()
            prediction_dates = [
                base_date + timedelta(days=i) 
                for i in range(1, predictions.shape[1] + 1)
            ]
        
        # Calculate model accuracy (if validation stats available)
        model_accuracy = 0.0
        if self.validation_stats and 'final_val_mae' in self.validation_stats:
            # Convert MAE to accuracy percentage (simplified)
            val_mae = self.validation_stats['final_val_mae']
            model_accuracy = max(0.0, 1.0 - (val_mae / 1000.0))  # Assuming balance scale
        
        # Create metadata
        metadata = {
            'model_version': self.model_metadata.get('version', '1.0.0'),
            'prediction_horizon': predictions.shape[1],
            'input_features': X.shape[2],
            'model_type': 'lstm_financial_predictor',
            'confidence_calculated': calculate_confidence,
            'preprocessing_applied': self.preprocessor is not None
        }
        
        return PredictionResult(
            user_id=user_id or 'unknown',
            predictions=predictions,
            confidence_intervals=confidence_intervals,
            model_accuracy=model_accuracy,
            prediction_dates=prediction_dates,
            input_sequence=X,
            metadata=metadata,
            generated_at=datetime.now()
        )
    
    def _calculate_confidence_intervals(self, 
                                     X: np.ndarray, 
                                     predictions_scaled: np.ndarray,
                                     predictions: np.ndarray) -> Dict[str, np.ndarray]:
        """
        Calculate confidence intervals for predictions
        
        Args:
            X: Input sequences
            predictions_scaled: Scaled predictions
            predictions: Original scale predictions
            
        Returns:
            Dictionary with confidence intervals
        """
        # Monte Carlo dropout for uncertainty estimation
        n_samples = 100
        dropout_predictions = []
        
        # Enable dropout during inference
        for layer in self.model.layers:
            if hasattr(layer, 'training'):
                layer.training = True
        
        for _ in range(n_samples):
            pred = self.model(X, training=True)
            if self.preprocessor:
                pred_original = self.preprocessor.inverse_transform_targets(pred.numpy())
            else:
                pred_original = pred.numpy()
            dropout_predictions.append(pred_original)
        
        # Disable dropout
        for layer in self.model.layers:
            if hasattr(layer, 'training'):
                layer.training = False
        
        dropout_predictions = np.array(dropout_predictions)
        
        # Calculate confidence intervals
        confidence_intervals = {
            'mean': np.mean(dropout_predictions, axis=0),
            'std': np.std(dropout_predictions, axis=0),
            'lower_95': np.percentile(dropout_predictions, 2.5, axis=0),
            'upper_95': np.percentile(dropout_predictions, 97.5, axis=0),
            'lower_80': np.percentile(dropout_predictions, 10, axis=0),
            'upper_80': np.percentile(dropout_predictions, 90, axis=0)
        }
        
        return confidence_intervals
    
    def evaluate(self, X_test: np.ndarray, y_test: np.ndarray) -> Dict[str, float]:
        """
        Evaluate the model on test data
        
        Args:
            X_test: Test input sequences
            y_test: Test target sequences
            
        Returns:
            Evaluation metrics
        """
        if not self.is_fitted:
            raise ValueError("Model must be fitted before evaluation")
        
        logger.info(f"Evaluating model on {len(X_test)} test sequences")
        
        # Evaluate model
        test_results = self.model.evaluate(X_test, y_test, verbose=0)
        
        # Create metrics dictionary
        metrics = {}
        metric_names = ['loss'] + self.config.metrics
        
        for i, metric_name in enumerate(metric_names):
            if i < len(test_results):
                metrics[f'test_{metric_name}'] = float(test_results[i])
        
        # Additional custom metrics
        predictions = self.model.predict(X_test, verbose=0)
        
        # Mean Absolute Percentage Error
        mape = np.mean(np.abs((y_test - predictions) / np.maximum(np.abs(y_test), 1e-8))) * 100
        metrics['test_mape'] = float(mape)
        
        # Root Mean Square Error
        rmse = np.sqrt(np.mean((y_test - predictions) ** 2))
        metrics['test_rmse'] = float(rmse)
        
        # R-squared
        ss_res = np.sum((y_test - predictions) ** 2)
        ss_tot = np.sum((y_test - np.mean(y_test)) ** 2)
        r2 = 1 - (ss_res / (ss_tot + 1e-8))
        metrics['test_r2'] = float(r2)
        
        logger.info(f"Test evaluation complete: {metrics}")
        
        return metrics
    
    def get_model_summary(self) -> Dict[str, Any]:
        """
        Get a comprehensive summary of the model
        
        Returns:
            Model summary dictionary
        """
        if not self.is_fitted:
            raise ValueError("Model must be fitted to get summary")
        
        # Get model architecture summary
        summary_lines = []
        self.model.summary(print_fn=lambda x: summary_lines.append(x))
        architecture_summary = '\n'.join(summary_lines)
        
        return {
            'model_metadata': self.model_metadata,
            'training_stats': self.training_stats,
            'validation_stats': self.validation_stats,
            'architecture_summary': architecture_summary,
            'config': self.config,
            'total_parameters': int(self.model.count_params()),
            'trainable_parameters': int(sum([tf.keras.backend.count_params(w) for w in self.model.trainable_weights])),
            'is_fitted': self.is_fitted
        }
    
    def save_model(self, filepath: str, save_preprocessor: bool = True) -> None:
        """
        Save the complete model including preprocessor
        
        Args:
            filepath: Base filepath (without extension)
            save_preprocessor: Whether to save the preprocessor
        """
        if not self.is_fitted:
            raise ValueError("Model must be fitted before saving")
        
        # Save Keras model
        model_path = f"{filepath}_model.h5"
        self.model.save(model_path)
        
        # Save model metadata and configuration
        metadata_path = f"{filepath}_metadata.json"
        metadata = {
            'model_metadata': self.model_metadata,
            'training_stats': self.training_stats,
            'validation_stats': self.validation_stats,
            'config': self.config.__dict__,
            'model_path': model_path,
            'preprocessor_path': f"{filepath}_preprocessor.pkl" if save_preprocessor else None
        }
        
        # Convert datetime objects to strings for JSON serialization
        def convert_datetime(obj):
            if isinstance(obj, datetime):
                return obj.isoformat()
            elif isinstance(obj, dict):
                return {k: convert_datetime(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_datetime(item) for item in obj]
            return obj
        
        metadata = convert_datetime(metadata)
        
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        # Save preprocessor if available
        if save_preprocessor and self.preprocessor:
            preprocessor_path = f"{filepath}_preprocessor.pkl"
            self.preprocessor.save_preprocessor(preprocessor_path)
        
        logger.info(f"Model saved to {filepath}")
    
    @classmethod
    def load_model(cls, filepath: str, load_preprocessor: bool = True) -> 'LSTMPredictionModel':
        """
        Load a saved model
        
        Args:
            filepath: Base filepath (without extension)
            load_preprocessor: Whether to load the preprocessor
            
        Returns:
            Loaded LSTM prediction model
        """
        # Load metadata
        metadata_path = f"{filepath}_metadata.json"
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
        
        # Recreate config
        config_dict = metadata['config']
        config = LSTMConfig(**config_dict)
        
        # Load preprocessor if available
        preprocessor = None
        if load_preprocessor and metadata.get('preprocessor_path'):
            try:
                preprocessor = TimeSeriesPreprocessor.load_preprocessor(metadata['preprocessor_path'])
            except Exception as e:
                logger.warning(f"Could not load preprocessor: {e}")
        
        # Create model instance
        model_instance = cls(config=config, preprocessor=preprocessor)
        
        # Load Keras model
        model_path = metadata['model_path']
        model_instance.model = tf.keras.models.load_model(model_path)
        
        # Restore metadata and statistics
        model_instance.model_metadata = metadata['model_metadata']
        model_instance.training_stats = metadata['training_stats']
        model_instance.validation_stats = metadata['validation_stats']
        model_instance.is_fitted = True
        
        logger.info(f"Model loaded from {filepath}")
        
        return model_instance

def create_lstm_model_for_financial_prediction(
    sequence_length: int = 30,
    prediction_horizon: int = 30,
    n_features: int = None,
    lstm_units: List[int] = None,
    dense_units: List[int] = None
) -> LSTMPredictionModel:
    """
    Create a pre-configured LSTM model for financial prediction
    
    Args:
        sequence_length: Number of days to look back
        prediction_horizon: Number of days to predict
        n_features: Number of input features (auto-detected if None)
        lstm_units: LSTM layer units
        dense_units: Dense layer units
        
    Returns:
        Configured LSTM prediction model
    """
    # Create time series preprocessor config
    ts_config = TimeSeriesConfig(
        sequence_length=sequence_length,
        prediction_horizon=prediction_horizon,
        scaler_type='minmax',
        include_moving_averages=True,
        include_lag_features=True,
        include_seasonal_features=True,
        include_trend_features=True
    )
    
    # Create preprocessor
    preprocessor = TimeSeriesPreprocessor(ts_config)
    
    # Create LSTM config
    lstm_config = LSTMConfig(
        lstm_units=lstm_units or [64, 32],
        dense_units=dense_units or [32, 16],
        dropout_rate=0.2,
        learning_rate=0.001,
        epochs=100,
        batch_size=32,
        early_stopping_patience=15
    )
    
    # Create model
    model = LSTMPredictionModel(config=lstm_config, preprocessor=preprocessor)
    
    return model

def train_financial_prediction_model(
    balance_data: pd.DataFrame,
    user_id: str = None,
    test_split: float = 0.2,
    model_save_path: str = None
) -> Tuple[LSTMPredictionModel, Dict[str, Any]]:
    """
    Complete training pipeline for financial prediction model
    
    Args:
        balance_data: DataFrame with 'date' and 'balance' columns
        user_id: User ID for the model
        test_split: Fraction of data to use for testing
        model_save_path: Path to save the trained model
        
    Returns:
        Tuple of (trained_model, training_results)
    """
    logger.info(f"Starting financial prediction model training for user {user_id}")
    
    # Create model
    model = create_lstm_model_for_financial_prediction()
    
    # Preprocess data
    X_sequences, y_sequences, preprocessing_report = model.preprocessor.fit_transform(balance_data)
    
    logger.info(f"Preprocessing complete: {len(X_sequences)} sequences created")
    
    # Split data
    split_idx = int(len(X_sequences) * (1 - test_split))
    
    X_train = X_sequences[:split_idx]
    y_train = y_sequences[:split_idx]
    X_test = X_sequences[split_idx:]
    y_test = y_sequences[split_idx:]
    
    logger.info(f"Data split: {len(X_train)} train, {len(X_test)} test sequences")
    
    # Train model
    training_results = model.fit(
        X_train, y_train,
        X_val=X_test, y_val=y_test,
        model_filepath=f"{model_save_path}_best.h5" if model_save_path else None
    )
    
    # Evaluate model
    test_metrics = model.evaluate(X_test, y_test)
    training_results['test_metrics'] = test_metrics
    
    # Save model if path provided
    if model_save_path:
        model.save_model(model_save_path)
    
    # Add preprocessing report to results
    training_results['preprocessing_report'] = preprocessing_report
    training_results['data_split'] = {
        'train_sequences': len(X_train),
        'test_sequences': len(X_test),
        'test_split_ratio': test_split
    }
    
    logger.info("Model training complete")
    logger.info(f"Test metrics: {test_metrics}")
    
    return model, training_results