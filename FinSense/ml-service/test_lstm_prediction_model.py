"""
Tests for LSTM Prediction Model Service

This module contains comprehensive tests for the LSTM prediction model system,
including model architecture, training, prediction, and evaluation.
"""

import pytest
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
import tempfile
import os

# Mock TensorFlow if not available
try:
    import tensorflow as tf
    TENSORFLOW_AVAILABLE = True
except ImportError:
    TENSORFLOW_AVAILABLE = False
    tf = None

from src.services.lstm_prediction_model import (
    LSTMPredictionModel,
    LSTMConfig,
    PredictionResult,
    create_lstm_model_for_financial_prediction,
    train_financial_prediction_model
)

from src.services.time_series_preprocessing import (
    TimeSeriesPreprocessor,
    TimeSeriesConfig,
    create_sample_time_series_data
)

@pytest.mark.skipif(not TENSORFLOW_AVAILABLE, reason="TensorFlow not available")
class TestLSTMConfig:
    """Test cases for LSTMConfig"""
    
    def test_default_config(self):
        """Test default configuration values"""
        config = LSTMConfig()
        
        assert config.lstm_units == [50, 50]
        assert config.dense_units == [25]
        assert config.dropout_rate == 0.2
        assert config.recurrent_dropout == 0.2
        assert config.use_batch_normalization is True
        assert config.use_bidirectional is False
        assert config.l1_reg == 0.0
        assert config.l2_reg == 0.001
        assert config.optimizer == 'adam'
        assert config.learning_rate == 0.001
        assert config.loss_function == 'mse'
        assert config.metrics == ['mae', 'mse']
        assert config.epochs == 100
        assert config.batch_size == 32
        assert config.validation_split == 0.2
        assert config.early_stopping_patience == 15
    
    def test_custom_config(self):
        """Test custom configuration values"""
        config = LSTMConfig(
            lstm_units=[32, 16],
            dense_units=[16, 8],
            dropout_rate=0.3,
            learning_rate=0.01,
            epochs=50,
            batch_size=64
        )
        
        assert config.lstm_units == [32, 16]
        assert config.dense_units == [16, 8]
        assert config.dropout_rate == 0.3
        assert config.learning_rate == 0.01
        assert config.epochs == 50
        assert config.batch_size == 64

@pytest.mark.skipif(not TENSORFLOW_AVAILABLE, reason="TensorFlow not available")
class TestLSTMPredictionModel:
    """Test cases for LSTMPredictionModel"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.config = LSTMConfig(
            lstm_units=[8, 4],  # Small units for testing
            dense_units=[4],
            epochs=2,  # Few epochs for testing
            batch_size=4,
            early_stopping_patience=1
        )
        
        # Create sample preprocessor
        ts_config = TimeSeriesConfig(
            sequence_length=5,
            prediction_horizon=3,
            min_data_points=20
        )
        self.preprocessor = TimeSeriesPreprocessor(ts_config)
        
        self.model = LSTMPredictionModel(self.config, self.preprocessor)
        
        # Create sample data
        self.sample_data = create_sample_time_series_data(n_days=30)
        
        # Create sample sequences
        X_seq, y_seq, _ = self.preprocessor.fit_transform(self.sample_data)
        self.X_sample = X_seq[:10]  # Small sample for testing
        self.y_sample = y_seq[:10]
    
    def test_initialization(self):
        """Test model initialization"""
        assert self.model.config == self.config
        assert self.model.preprocessor == self.preprocessor
        assert self.model.model is None
        assert not self.model.is_fitted
        assert 'created_at' in self.model.model_metadata
        assert self.model.model_metadata['model_type'] == 'lstm_financial_predictor'
    
    def test_initialization_without_tensorflow_raises_error(self):
        """Test that initialization raises error when TensorFlow is not available"""
        with patch('src.services.lstm_prediction_model.TENSORFLOW_AVAILABLE', False):
            with pytest.raises(ImportError, match="TensorFlow is required"):
                LSTMPredictionModel()
    
    def test_create_optimizer(self):
        """Test optimizer creation"""
        # Test Adam optimizer
        adam_config = LSTMConfig(optimizer='adam', learning_rate=0.01)
        model = LSTMPredictionModel(adam_config)
        optimizer = model._create_optimizer()
        assert isinstance(optimizer, tf.keras.optimizers.Adam)
        
        # Test RMSprop optimizer
        rmsprop_config = LSTMConfig(optimizer='rmsprop', learning_rate=0.01)
        model = LSTMPredictionModel(rmsprop_config)
        optimizer = model._create_optimizer()
        assert isinstance(optimizer, tf.keras.optimizers.RMSprop)
        
        # Test invalid optimizer
        invalid_config = LSTMConfig(optimizer='invalid')
        model = LSTMPredictionModel(invalid_config)
        with pytest.raises(ValueError, match="Unsupported optimizer"):
            model._create_optimizer()
    
    def test_create_model(self):
        """Test model architecture creation"""
        input_shape = (5, 10)  # sequence_length, n_features
        output_size = 3
        
        keras_model = self.model._create_model(input_shape, output_size)
        
        # Check model structure
        assert keras_model is not None
        assert len(keras_model.layers) > 0
        assert keras_model.input_shape == (None, 5, 10)
        assert keras_model.output_shape == (None, 3)
        
        # Check that model is compiled
        assert keras_model.optimizer is not None
        assert keras_model.loss is not None
    
    def test_create_callbacks(self):
        """Test callback creation"""
        callbacks = self.model._create_callbacks()
        
        # Should have at least early stopping and reduce LR
        assert len(callbacks) >= 2
        
        callback_types = [type(cb).__name__ for cb in callbacks]
        assert 'EarlyStopping' in callback_types
        assert 'ReduceLROnPlateau' in callback_types
        
        # Test with model filepath
        callbacks_with_checkpoint = self.model._create_callbacks('test_model.h5')
        callback_types_with_checkpoint = [type(cb).__name__ for cb in callbacks_with_checkpoint]
        assert 'ModelCheckpoint' in callback_types_with_checkpoint
    
    def test_fit(self):
        """Test model training"""
        # Train model
        results = self.model.fit(self.X_sample, self.y_sample)
        
        # Check that model is fitted
        assert self.model.is_fitted is True
        assert self.model.model is not None
        
        # Check results structure
        assert 'training_stats' in results
        assert 'validation_stats' in results
        assert 'history' in results
        assert 'model_metadata' in results
        
        # Check training stats
        training_stats = results['training_stats']
        assert 'training_time_seconds' in training_stats
        assert 'epochs_trained' in training_stats
        assert 'final_train_loss' in training_stats
        assert 'model_parameters' in training_stats
        
        # Check that history is recorded
        assert 'loss' in results['history']
        assert len(results['history']['loss']) > 0
    
    def test_fit_with_validation_data(self):
        """Test model training with separate validation data"""
        # Split data
        split_idx = len(self.X_sample) // 2
        X_train = self.X_sample[:split_idx]
        y_train = self.y_sample[:split_idx]
        X_val = self.X_sample[split_idx:]
        y_val = self.y_sample[split_idx:]
        
        # Train model
        results = self.model.fit(X_train, y_train, X_val, y_val)
        
        # Check validation stats
        assert 'validation_stats' in results
        validation_stats = results['validation_stats']
        assert 'final_val_loss' in validation_stats
        assert 'best_val_loss' in validation_stats
        assert 'best_epoch' in validation_stats
    
    def test_fit_invalid_input_shapes(self):
        """Test that fit raises error for invalid input shapes"""
        # Test 2D input (should be 3D)
        X_2d = np.random.randn(10, 5)
        y_2d = np.random.randn(10, 3)
        
        with pytest.raises(ValueError, match="X_train must be 3D array"):
            self.model.fit(X_2d, y_2d)
        
        # Test 3D target (should be 2D)
        X_3d = np.random.randn(10, 5, 8)
        y_3d = np.random.randn(10, 3, 1)
        
        with pytest.raises(ValueError, match="y_train must be 2D array"):
            self.model.fit(X_3d, y_3d)
    
    def test_predict(self):
        """Test model prediction"""
        # Train model first
        self.model.fit(self.X_sample, self.y_sample)
        
        # Make predictions
        test_X = self.X_sample[:3]
        result = self.model.predict(test_X, user_id='test_user')
        
        # Check result structure
        assert isinstance(result, PredictionResult)
        assert result.user_id == 'test_user'
        assert result.predictions.shape[0] == 3  # 3 sequences
        assert result.predictions.shape[1] == 3  # prediction_horizon
        assert len(result.prediction_dates) == 3
        assert result.generated_at is not None
        
        # Check metadata
        assert 'model_version' in result.metadata
        assert 'prediction_horizon' in result.metadata
        assert 'input_features' in result.metadata
    
    def test_predict_without_fit_raises_error(self):
        """Test that predict raises error when model is not fitted"""
        test_X = np.random.randn(3, 5, 8)
        
        with pytest.raises(ValueError, match="Model must be fitted"):
            self.model.predict(test_X)
    
    def test_predict_invalid_input_shape(self):
        """Test that predict raises error for invalid input shape"""
        # Train model first
        self.model.fit(self.X_sample, self.y_sample)
        
        # Test 2D input (should be 3D)
        X_2d = np.random.randn(3, 5)
        
        with pytest.raises(ValueError, match="X must be 3D array"):
            self.model.predict(X_2d)
    
    def test_calculate_confidence_intervals(self):
        """Test confidence interval calculation"""
        # Train model first
        self.model.fit(self.X_sample, self.y_sample)
        
        # Test confidence calculation
        test_X = self.X_sample[:2]
        predictions_scaled = self.model.model.predict(test_X, verbose=0)
        predictions = self.preprocessor.inverse_transform_targets(predictions_scaled)
        
        confidence_intervals = self.model._calculate_confidence_intervals(
            test_X, predictions_scaled, predictions
        )
        
        # Check confidence interval structure
        expected_keys = ['mean', 'std', 'lower_95', 'upper_95', 'lower_80', 'upper_80']
        for key in expected_keys:
            assert key in confidence_intervals
            assert confidence_intervals[key].shape == predictions.shape
    
    def test_evaluate(self):
        """Test model evaluation"""
        # Train model first
        self.model.fit(self.X_sample, self.y_sample)
        
        # Evaluate model
        test_X = self.X_sample[:5]
        test_y = self.y_sample[:5]
        
        metrics = self.model.evaluate(test_X, test_y)
        
        # Check metrics structure
        assert 'test_loss' in metrics
        assert 'test_mae' in metrics
        assert 'test_mse' in metrics
        assert 'test_mape' in metrics
        assert 'test_rmse' in metrics
        assert 'test_r2' in metrics
        
        # Check that metrics are reasonable
        assert isinstance(metrics['test_loss'], float)
        assert metrics['test_mape'] >= 0  # MAPE should be non-negative
    
    def test_evaluate_without_fit_raises_error(self):
        """Test that evaluate raises error when model is not fitted"""
        test_X = np.random.randn(3, 5, 8)
        test_y = np.random.randn(3, 3)
        
        with pytest.raises(ValueError, match="Model must be fitted"):
            self.model.evaluate(test_X, test_y)
    
    def test_get_model_summary(self):
        """Test model summary generation"""
        # Train model first
        self.model.fit(self.X_sample, self.y_sample)
        
        summary = self.model.get_model_summary()
        
        # Check summary structure
        assert 'model_metadata' in summary
        assert 'training_stats' in summary
        assert 'validation_stats' in summary
        assert 'architecture_summary' in summary
        assert 'config' in summary
        assert 'total_parameters' in summary
        assert 'trainable_parameters' in summary
        assert 'is_fitted' in summary
        
        # Check that architecture summary is a string
        assert isinstance(summary['architecture_summary'], str)
        assert len(summary['architecture_summary']) > 0
    
    def test_get_model_summary_without_fit_raises_error(self):
        """Test that get_model_summary raises error when model is not fitted"""
        with pytest.raises(ValueError, match="Model must be fitted"):
            self.model.get_model_summary()
    
    def test_save_load_model(self):
        """Test model saving and loading"""
        # Train model first
        self.model.fit(self.X_sample, self.y_sample)
        
        with tempfile.TemporaryDirectory() as temp_dir:
            # Save model
            filepath = os.path.join(temp_dir, 'test_model')
            self.model.save_model(filepath)
            
            # Check that files were created
            assert os.path.exists(f"{filepath}_model.h5")
            assert os.path.exists(f"{filepath}_metadata.json")
            assert os.path.exists(f"{filepath}_preprocessor.pkl")
            
            # Load model
            loaded_model = LSTMPredictionModel.load_model(filepath)
            
            # Check that loaded model has same properties
            assert loaded_model.is_fitted is True
            assert loaded_model.config.lstm_units == self.config.lstm_units
            assert loaded_model.preprocessor is not None
            
            # Test that loaded model can make predictions
            test_X = self.X_sample[:2]
            original_pred = self.model.predict(test_X)
            loaded_pred = loaded_model.predict(test_X)
            
            # Predictions should be very similar (allowing for small numerical differences)
            np.testing.assert_allclose(
                original_pred.predictions, 
                loaded_pred.predictions, 
                rtol=1e-5
            )
    
    def test_save_without_fit_raises_error(self):
        """Test that save raises error when model is not fitted"""
        with pytest.raises(ValueError, match="Model must be fitted"):
            self.model.save_model('test_model')

@pytest.mark.skipif(not TENSORFLOW_AVAILABLE, reason="TensorFlow not available")
class TestPredictionResult:
    """Test cases for PredictionResult"""
    
    def test_prediction_result_creation(self):
        """Test PredictionResult creation"""
        predictions = np.random.randn(5, 7)  # 5 sequences, 7 days
        confidence_intervals = {
            'mean': np.random.randn(5, 7),
            'std': np.random.randn(5, 7)
        }
        prediction_dates = [datetime.now().date() + timedelta(days=i) for i in range(7)]
        input_sequence = np.random.randn(5, 10, 15)
        
        result = PredictionResult(
            user_id='test_user',
            predictions=predictions,
            confidence_intervals=confidence_intervals,
            model_accuracy=0.85,
            prediction_dates=prediction_dates,
            input_sequence=input_sequence,
            metadata={'test': 'value'},
            generated_at=datetime.now()
        )
        
        assert result.user_id == 'test_user'
        assert result.predictions.shape == (5, 7)
        assert result.model_accuracy == 0.85
        assert len(result.prediction_dates) == 7
        assert result.metadata['test'] == 'value'

@pytest.mark.skipif(not TENSORFLOW_AVAILABLE, reason="TensorFlow not available")
class TestUtilityFunctions:
    """Test cases for utility functions"""
    
    def test_create_lstm_model_for_financial_prediction(self):
        """Test LSTM model creation utility"""
        model = create_lstm_model_for_financial_prediction(
            sequence_length=20,
            prediction_horizon=14,
            lstm_units=[32, 16],
            dense_units=[16, 8]
        )
        
        assert isinstance(model, LSTMPredictionModel)
        assert model.config.lstm_units == [32, 16]
        assert model.config.dense_units == [16, 8]
        assert model.preprocessor is not None
        assert model.preprocessor.config.sequence_length == 20
        assert model.preprocessor.config.prediction_horizon == 14
    
    def test_train_financial_prediction_model(self):
        """Test complete training pipeline"""
        # Create sample data
        balance_data = create_sample_time_series_data(n_days=60)
        
        with tempfile.TemporaryDirectory() as temp_dir:
            model_path = os.path.join(temp_dir, 'trained_model')
            
            # Train model
            trained_model, results = train_financial_prediction_model(
                balance_data=balance_data,
                user_id='test_user',
                test_split=0.3,
                model_save_path=model_path
            )
            
            # Check that model is trained
            assert trained_model.is_fitted is True
            
            # Check results structure
            assert 'training_stats' in results
            assert 'validation_stats' in results
            assert 'test_metrics' in results
            assert 'preprocessing_report' in results
            assert 'data_split' in results
            
            # Check that model files were saved
            assert os.path.exists(f"{model_path}_model.h5")
            assert os.path.exists(f"{model_path}_metadata.json")
            
            # Check data split information
            data_split = results['data_split']
            assert 'train_sequences' in data_split
            assert 'test_sequences' in data_split
            assert data_split['test_split_ratio'] == 0.3

@pytest.mark.skipif(not TENSORFLOW_AVAILABLE, reason="TensorFlow not available")
class TestIntegrationScenarios:
    """Integration test scenarios"""
    
    def test_full_prediction_pipeline(self):
        """Test complete prediction pipeline from data to results"""
        # Create realistic financial data
        balance_data = create_sample_time_series_data(
            n_days=120,
            start_balance=5000.0,
            trend=2.0,
            volatility=100.0,
            seasonal_amplitude=200.0
        )
        
        # Create and configure model
        config = LSTMConfig(
            lstm_units=[16, 8],  # Small for testing
            dense_units=[8],
            epochs=3,  # Few epochs for testing
            batch_size=8,
            early_stopping_patience=2
        )
        
        ts_config = TimeSeriesConfig(
            sequence_length=15,
            prediction_horizon=7,
            min_data_points=50
        )
        
        preprocessor = TimeSeriesPreprocessor(ts_config)
        model = LSTMPredictionModel(config, preprocessor)
        
        # Preprocess data
        X_sequences, y_sequences, preprocessing_report = preprocessor.fit_transform(balance_data)
        
        # Train model
        training_results = model.fit(X_sequences, y_sequences)
        
        # Make predictions
        test_sequences = X_sequences[-5:]
        prediction_result = model.predict(test_sequences, user_id='integration_test')
        
        # Validate complete pipeline
        assert preprocessing_report['final_sequences'] > 0
        assert training_results['training_stats']['epochs_trained'] > 0
        assert prediction_result.predictions.shape[0] == 5
        assert prediction_result.predictions.shape[1] == 7
        assert len(prediction_result.prediction_dates) == 7
        assert prediction_result.user_id == 'integration_test'
        
        # Test model evaluation
        test_metrics = model.evaluate(X_sequences[-10:], y_sequences[-10:])
        assert 'test_loss' in test_metrics
        assert 'test_r2' in test_metrics
    
    def test_model_with_different_configurations(self):
        """Test model with various configuration combinations"""
        balance_data = create_sample_time_series_data(n_days=80)
        
        configurations = [
            # Simple configuration
            {
                'lstm_units': [8],
                'dense_units': [4],
                'use_batch_normalization': False,
                'dropout_rate': 0.1
            },
            # Complex configuration
            {
                'lstm_units': [16, 8, 4],
                'dense_units': [8, 4],
                'use_batch_normalization': True,
                'dropout_rate': 0.3,
                'use_bidirectional': False  # Keep False for testing speed
            }
        ]
        
        for config_dict in configurations:
            config = LSTMConfig(
                epochs=2,  # Few epochs for testing
                batch_size=4,
                **config_dict
            )
            
            ts_config = TimeSeriesConfig(
                sequence_length=8,
                prediction_horizon=3,
                min_data_points=30
            )
            
            preprocessor = TimeSeriesPreprocessor(ts_config)
            model = LSTMPredictionModel(config, preprocessor)
            
            # Should be able to preprocess and train without errors
            X_seq, y_seq, _ = preprocessor.fit_transform(balance_data)
            training_results = model.fit(X_seq, y_seq)
            
            assert model.is_fitted is True
            assert training_results['training_stats']['epochs_trained'] > 0
    
    def test_robustness_with_edge_cases(self):
        """Test model robustness with edge cases"""
        # Test with minimal data
        minimal_data = create_sample_time_series_data(n_days=40)
        
        config = LSTMConfig(
            lstm_units=[4],
            dense_units=[2],
            epochs=2,
            batch_size=2
        )
        
        ts_config = TimeSeriesConfig(
            sequence_length=5,
            prediction_horizon=2,
            min_data_points=20
        )
        
        preprocessor = TimeSeriesPreprocessor(ts_config)
        model = LSTMPredictionModel(config, preprocessor)
        
        # Should handle minimal data
        X_seq, y_seq, _ = preprocessor.fit_transform(minimal_data)
        training_results = model.fit(X_seq, y_seq)
        
        assert model.is_fitted is True
        
        # Test prediction with single sequence
        single_prediction = model.predict(X_seq[:1])
        assert single_prediction.predictions.shape[0] == 1
        
        # Test with constant data (no variance)
        constant_data = minimal_data.copy()
        constant_data['balance'] = 1000.0  # All same value
        
        # Should handle constant data gracefully
        X_const, y_const, _ = preprocessor.fit_transform(constant_data)
        
        # Create new model for constant data
        const_model = LSTMPredictionModel(config, preprocessor)
        const_results = const_model.fit(X_const, y_const)
        
        assert const_model.is_fitted is True

# Mock tests for when TensorFlow is not available
@pytest.mark.skipif(TENSORFLOW_AVAILABLE, reason="TensorFlow is available")
class TestWithoutTensorFlow:
    """Test cases when TensorFlow is not available"""
    
    def test_import_error_without_tensorflow(self):
        """Test that appropriate error is raised when TensorFlow is not available"""
        with pytest.raises(ImportError, match="TensorFlow is required"):
            LSTMPredictionModel()

if __name__ == '__main__':
    pytest.main([__file__])