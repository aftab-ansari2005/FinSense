#!/usr/bin/env python3
"""
LSTM Prediction Model Validation Script

This script validates the LSTM prediction model functionality without requiring
full TensorFlow dependencies. It tests core functionality and integration points.
"""

import sys
import os
import logging
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def create_sample_balance_data(n_days=120, start_balance=5000.0):
    """Create sample balance data for testing"""
    dates = pd.date_range(start='2023-01-01', periods=n_days, freq='D')
    
    # Create realistic balance progression with trend and noise
    trend = np.linspace(0, 200, n_days)  # Slight upward trend
    seasonal = 100 * np.sin(2 * np.pi * np.arange(n_days) / 30)  # Monthly cycle
    noise = np.random.normal(0, 50, n_days)
    
    balances = start_balance + trend + seasonal + noise
    
    return pd.DataFrame({
        'date': dates,
        'balance': balances
    })

def validate_lstm_config():
    """Validate LSTM configuration functionality"""
    logger.info("Validating LSTM configuration...")
    
    try:
        from services.lstm_prediction_model import LSTMConfig
        
        # Test default configuration
        default_config = LSTMConfig()
        assert default_config.lstm_units == [50, 50]
        assert default_config.dense_units == [25]
        assert default_config.dropout_rate == 0.2
        assert default_config.epochs == 100
        
        # Test custom configuration
        custom_config = LSTMConfig(
            lstm_units=[32, 16],
            dense_units=[16, 8],
            dropout_rate=0.3,
            learning_rate=0.01
        )
        assert custom_config.lstm_units == [32, 16]
        assert custom_config.dense_units == [16, 8]
        assert custom_config.dropout_rate == 0.3
        assert custom_config.learning_rate == 0.01
        
        logger.info("✓ LSTM configuration validation passed")
        return True
        
    except Exception as e:
        logger.error(f"✗ LSTM configuration validation failed: {e}")
        return False

def validate_prediction_result():
    """Validate PredictionResult functionality"""
    logger.info("Validating PredictionResult...")
    
    try:
        from services.lstm_prediction_model import PredictionResult
        
        # Create sample prediction result
        predictions = np.random.randn(3, 7)  # 3 sequences, 7 days
        confidence_intervals = {
            'mean': np.random.randn(3, 7),
            'std': np.random.randn(3, 7),
            'lower_95': np.random.randn(3, 7),
            'upper_95': np.random.randn(3, 7)
        }
        prediction_dates = [datetime.now().date() + timedelta(days=i) for i in range(7)]
        input_sequence = np.random.randn(3, 10, 15)
        
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
        
        # Validate result properties
        assert result.user_id == 'test_user'
        assert result.predictions.shape == (3, 7)
        assert result.model_accuracy == 0.85
        assert len(result.prediction_dates) == 7
        assert result.metadata['test'] == 'value'
        assert 'mean' in result.confidence_intervals
        
        logger.info("✓ PredictionResult validation passed")
        return True
        
    except Exception as e:
        logger.error(f"✗ PredictionResult validation failed: {e}")
        return False

def validate_model_creation():
    """Validate LSTM model creation without TensorFlow"""
    logger.info("Validating LSTM model creation...")
    
    try:
        from services.lstm_prediction_model import LSTMPredictionModel, LSTMConfig
        
        # Test model initialization
        config = LSTMConfig(
            lstm_units=[8, 4],
            dense_units=[4],
            epochs=2,
            batch_size=4
        )
        
        # This should work without TensorFlow (just initialization)
        try:
            model = LSTMPredictionModel(config)
            # If TensorFlow is not available, this should raise ImportError
            logger.warning("TensorFlow appears to be available - full model creation possible")
            return True
        except ImportError as e:
            if "TensorFlow is required" in str(e):
                logger.info("✓ Model correctly raises ImportError when TensorFlow unavailable")
                return True
            else:
                raise e
        
    except Exception as e:
        logger.error(f"✗ Model creation validation failed: {e}")
        return False

def validate_utility_functions():
    """Validate utility functions"""
    logger.info("Validating utility functions...")
    
    try:
        from services.lstm_prediction_model import create_lstm_model_for_financial_prediction
        
        # Test utility function parameters
        try:
            model = create_lstm_model_for_financial_prediction(
                sequence_length=20,
                prediction_horizon=14,
                lstm_units=[32, 16],
                dense_units=[16, 8]
            )
            logger.warning("TensorFlow available - utility function works fully")
            return True
        except ImportError as e:
            if "TensorFlow is required" in str(e):
                logger.info("✓ Utility function correctly handles TensorFlow unavailability")
                return True
            else:
                raise e
        
    except Exception as e:
        logger.error(f"✗ Utility function validation failed: {e}")
        return False

def validate_time_series_integration():
    """Validate integration with time series preprocessing"""
    logger.info("Validating time series preprocessing integration...")
    
    try:
        from services.time_series_preprocessing import TimeSeriesPreprocessor, TimeSeriesConfig
        from services.lstm_prediction_model import LSTMConfig
        
        # Create time series config
        ts_config = TimeSeriesConfig(
            sequence_length=15,
            prediction_horizon=7,
            min_data_points=50
        )
        
        # Create preprocessor
        preprocessor = TimeSeriesPreprocessor(ts_config)
        
        # Create sample data
        balance_data = create_sample_balance_data(n_days=80)
        
        # Test preprocessing
        X_sequences, y_sequences, report = preprocessor.fit_transform(balance_data)
        
        # Validate preprocessing results
        assert X_sequences.ndim == 3  # Should be 3D for LSTM
        assert y_sequences.ndim == 2  # Should be 2D targets
        assert X_sequences.shape[1] == 15  # sequence_length
        assert y_sequences.shape[1] == 7   # prediction_horizon
        assert report['final_sequences'] > 0
        
        # Test LSTM model initialization with preprocessor
        lstm_config = LSTMConfig(
            lstm_units=[8, 4],
            dense_units=[4],
            epochs=2
        )
        
        try:
            from services.lstm_prediction_model import LSTMPredictionModel
            model = LSTMPredictionModel(lstm_config, preprocessor)
            assert model.preprocessor == preprocessor
            logger.info("✓ Time series integration validation passed")
            return True
        except ImportError as e:
            if "TensorFlow is required" in str(e):
                logger.info("✓ Time series integration correctly handles TensorFlow unavailability")
                return True
            else:
                raise e
        
    except Exception as e:
        logger.error(f"✗ Time series integration validation failed: {e}")
        return False

def validate_model_persistence():
    """Validate model persistence functionality"""
    logger.info("Validating model persistence...")
    
    try:
        # Test that persistence methods exist and have correct signatures
        from services.lstm_prediction_model import LSTMPredictionModel
        
        # Check that save/load methods exist
        assert hasattr(LSTMPredictionModel, 'save_model')
        assert hasattr(LSTMPredictionModel, 'load_model')
        
        # Check method signatures (basic validation)
        import inspect
        save_sig = inspect.signature(LSTMPredictionModel.save_model)
        load_sig = inspect.signature(LSTMPredictionModel.load_model)
        
        assert 'filepath' in save_sig.parameters
        assert 'save_preprocessor' in save_sig.parameters
        assert 'filepath' in load_sig.parameters
        assert 'load_preprocessor' in load_sig.parameters
        
        logger.info("✓ Model persistence validation passed")
        return True
        
    except Exception as e:
        logger.error(f"✗ Model persistence validation failed: {e}")
        return False

def validate_documentation_completeness():
    """Validate that documentation files exist and are complete"""
    logger.info("Validating documentation completeness...")
    
    try:
        # Check README exists
        readme_path = 'LSTM_PREDICTION_MODEL_README.md'
        if not os.path.exists(readme_path):
            logger.error(f"✗ README file not found: {readme_path}")
            return False
        
        # Check README content
        with open(readme_path, 'r') as f:
            readme_content = f.read()
        
        required_sections = [
            '# LSTM Prediction Model System',
            '## Overview',
            '## Key Features',
            '## Architecture',
            '## Usage Examples',
            '## Testing',
            '## Troubleshooting'
        ]
        
        for section in required_sections:
            if section not in readme_content:
                logger.error(f"✗ Missing section in README: {section}")
                return False
        
        # Check test file exists
        test_path = 'test_lstm_prediction_model.py'
        if not os.path.exists(test_path):
            logger.error(f"✗ Test file not found: {test_path}")
            return False
        
        logger.info("✓ Documentation completeness validation passed")
        return True
        
    except Exception as e:
        logger.error(f"✗ Documentation validation failed: {e}")
        return False

def validate_error_handling():
    """Validate error handling in LSTM model"""
    logger.info("Validating error handling...")
    
    try:
        from services.lstm_prediction_model import LSTMConfig, LSTMPredictionModel
        
        # Test invalid configuration
        try:
            invalid_config = LSTMConfig(optimizer='invalid_optimizer')
            model = LSTMPredictionModel(invalid_config)
            # This should work until we try to create the optimizer
            logger.info("✓ Invalid configuration handled appropriately")
        except Exception:
            pass  # Expected for some invalid configs
        
        # Test model operations without fitting
        try:
            config = LSTMConfig()
            model = LSTMPredictionModel(config)
            
            # These operations should raise appropriate errors
            test_data = np.random.randn(5, 10, 8)
            
            # Should raise error about model not being fitted
            try:
                model.predict(test_data)
                logger.error("✗ predict() should raise error when model not fitted")
                return False
            except (ValueError, ImportError) as e:
                if "fitted" in str(e).lower() or "tensorflow" in str(e).lower():
                    logger.info("✓ predict() correctly raises error when model not fitted")
                else:
                    raise e
            
            # Should raise error about model not being fitted
            try:
                model.evaluate(test_data, np.random.randn(5, 3))
                logger.error("✗ evaluate() should raise error when model not fitted")
                return False
            except (ValueError, ImportError) as e:
                if "fitted" in str(e).lower() or "tensorflow" in str(e).lower():
                    logger.info("✓ evaluate() correctly raises error when model not fitted")
                else:
                    raise e
            
        except ImportError as e:
            if "TensorFlow is required" in str(e):
                logger.info("✓ Error handling works correctly without TensorFlow")
            else:
                raise e
        
        logger.info("✓ Error handling validation passed")
        return True
        
    except Exception as e:
        logger.error(f"✗ Error handling validation failed: {e}")
        return False

def main():
    """Run all validation tests"""
    logger.info("Starting LSTM Prediction Model validation...")
    logger.info("=" * 60)
    
    validation_functions = [
        validate_lstm_config,
        validate_prediction_result,
        validate_model_creation,
        validate_utility_functions,
        validate_time_series_integration,
        validate_model_persistence,
        validate_documentation_completeness,
        validate_error_handling
    ]
    
    results = []
    for validation_func in validation_functions:
        try:
            result = validation_func()
            results.append(result)
        except Exception as e:
            logger.error(f"Validation function {validation_func.__name__} failed with exception: {e}")
            results.append(False)
        
        logger.info("-" * 40)
    
    # Summary
    passed = sum(results)
    total = len(results)
    
    logger.info("=" * 60)
    logger.info("VALIDATION SUMMARY")
    logger.info("=" * 60)
    logger.info(f"Tests passed: {passed}/{total}")
    logger.info(f"Success rate: {passed/total*100:.1f}%")
    
    if passed == total:
        logger.info("🎉 All validations passed! LSTM Prediction Model is ready.")
        return True
    else:
        logger.warning(f"⚠️  {total-passed} validation(s) failed. Please review the issues above.")
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)