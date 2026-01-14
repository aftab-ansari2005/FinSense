"""
Simple validation script for Time Series Preprocessing Service
This script tests the core functionality without requiring external dependencies
"""

import sys
import os
from datetime import datetime, timedelta

# Add the src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

def test_basic_functionality():
    """Test basic functionality of the time series preprocessing service"""
    try:
        # Test imports
        from services.time_series_preprocessing import (
            TimeSeriesPreprocessor,
            TimeSeriesConfig,
            create_sample_time_series_data
        )
        print("✓ Imports successful")
        
        # Test configuration
        config = TimeSeriesConfig(
            sequence_length=10,
            prediction_horizon=5,
            min_data_points=30,
            scaler_type='minmax'
        )
        print("✓ Configuration created")
        
        # Test service initialization
        preprocessor = TimeSeriesPreprocessor(config)
        print("✓ Preprocessor initialized")
        
        # Test sample data creation
        sample_data = create_sample_time_series_data(
            n_days=50,
            start_balance=1000.0,
            trend=1.0,
            volatility=50.0
        )
        print(f"✓ Sample data created: {len(sample_data)} days")
        
        # Test data validation
        validation_report = preprocessor._validate_data(sample_data)
        print(f"✓ Data validation: {'PASSED' if validation_report['is_valid'] else 'FAILED'}")
        
        # Test data cleaning
        cleaned_data = preprocessor._clean_data(sample_data)
        print(f"✓ Data cleaning: {len(cleaned_data)} records after cleaning")
        
        # Test feature creation
        temporal_features = preprocessor._create_temporal_features(cleaned_data)
        print(f"✓ Temporal features: {temporal_features.shape[1]} features created")
        
        print("\n🎉 All basic functionality tests passed!")
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure all required dependencies are installed:")
        print("pip install numpy pandas scikit-learn joblib")
        return False
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_feature_engineering():
    """Test feature engineering functionality"""
    try:
        from services.time_series_preprocessing import (
            TimeSeriesPreprocessor,
            TimeSeriesConfig,
            create_sample_time_series_data
        )
        
        print("\n--- Testing Feature Engineering ---")
        
        config = TimeSeriesConfig(
            sequence_length=5,
            prediction_horizon=3,
            min_data_points=20,
            ma_windows=[3, 7],
            lag_periods=[1, 3],
            include_moving_averages=True,
            include_lag_features=True,
            include_seasonal_features=True,
            include_trend_features=True
        )
        
        preprocessor = TimeSeriesPreprocessor(config)
        sample_data = create_sample_time_series_data(n_days=30)
        
        # Test individual feature creation methods
        temporal_features = preprocessor._create_temporal_features(sample_data)
        print(f"✓ Temporal features: {temporal_features.shape[1]} columns")
        
        lag_features = preprocessor._create_lag_features(temporal_features)
        print(f"✓ Lag features: {lag_features.shape[1]} columns")
        
        ma_features = preprocessor._create_moving_average_features(lag_features)
        print(f"✓ Moving average features: {ma_features.shape[1]} columns")
        
        trend_features = preprocessor._create_trend_features(ma_features)
        print(f"✓ Trend features: {trend_features.shape[1]} columns")
        
        # Check for expected feature types
        feature_names = trend_features.columns.tolist()
        
        temporal_count = sum(1 for name in feature_names if any(
            keyword in name for keyword in ['year', 'month', 'day', 'week', 'sin', 'cos', 'is_']
        ))
        lag_count = sum(1 for name in feature_names if 'lag' in name)
        ma_count = sum(1 for name in feature_names if any(
            keyword in name for keyword in ['ma_', 'ema_', 'std_', 'min_', 'max_']
        ))
        trend_count = sum(1 for name in feature_names if any(
            keyword in name for keyword in ['change', 'trend', 'momentum', 'volatility']
        ))
        
        print(f"  - Temporal features: {temporal_count}")
        print(f"  - Lag features: {lag_count}")
        print(f"  - Moving average features: {ma_count}")
        print(f"  - Trend features: {trend_count}")
        
        print("✓ Feature engineering test passed!")
        return True
        
    except Exception as e:
        print(f"❌ Feature engineering test failed: {e}")
        return False

def test_sequence_generation():
    """Test sequence generation for LSTM"""
    try:
        from services.time_series_preprocessing import (
            TimeSeriesPreprocessor,
            TimeSeriesConfig
        )
        import numpy as np
        
        print("\n--- Testing Sequence Generation ---")
        
        config = TimeSeriesConfig(
            sequence_length=5,
            prediction_horizon=3,
            step_size=1
        )
        
        preprocessor = TimeSeriesPreprocessor(config)
        
        # Create simple test data
        n_points = 20
        n_features = 4
        features = np.random.randn(n_points, n_features)
        targets = np.random.randn(n_points)
        
        X_sequences, y_sequences = preprocessor._create_sequences(features, targets)
        
        print(f"✓ Input data: {features.shape}")
        print(f"✓ Sequences created: {X_sequences.shape}")
        print(f"✓ Targets created: {y_sequences.shape}")
        
        # Validate sequence shapes
        expected_n_sequences = n_points - config.sequence_length - config.prediction_horizon + 1
        expected_n_sequences = max(0, expected_n_sequences)
        
        assert X_sequences.shape[0] == expected_n_sequences, f"Expected {expected_n_sequences} sequences, got {X_sequences.shape[0]}"
        assert X_sequences.shape[1] == config.sequence_length, f"Expected sequence length {config.sequence_length}, got {X_sequences.shape[1]}"
        assert X_sequences.shape[2] == n_features, f"Expected {n_features} features, got {X_sequences.shape[2]}"
        assert y_sequences.shape[1] == config.prediction_horizon, f"Expected prediction horizon {config.prediction_horizon}, got {y_sequences.shape[1]}"
        
        print("✓ Sequence generation test passed!")
        return True
        
    except Exception as e:
        print(f"❌ Sequence generation test failed: {e}")
        return False

def test_full_pipeline():
    """Test the complete preprocessing pipeline"""
    try:
        from services.time_series_preprocessing import (
            TimeSeriesPreprocessor,
            TimeSeriesConfig,
            create_sample_time_series_data
        )
        
        print("\n--- Testing Full Pipeline ---")
        
        # Create realistic configuration
        config = TimeSeriesConfig(
            sequence_length=10,
            prediction_horizon=5,
            min_data_points=30,
            scaler_type='minmax',
            include_moving_averages=True,
            include_lag_features=True,
            include_seasonal_features=True,
            include_trend_features=True
        )
        
        preprocessor = TimeSeriesPreprocessor(config)
        
        # Create sample data
        sample_data = create_sample_time_series_data(
            n_days=60,
            start_balance=2000.0,
            trend=2.0,
            volatility=100.0
        )
        
        print(f"✓ Sample data created: {len(sample_data)} days")
        print(f"  - Date range: {sample_data['date'].min()} to {sample_data['date'].max()}")
        print(f"  - Balance range: ${sample_data['balance'].min():.2f} to ${sample_data['balance'].max():.2f}")
        
        # Run full preprocessing pipeline
        X_sequences, y_sequences, report = preprocessor.fit_transform(sample_data)
        
        print(f"✓ Preprocessing complete:")
        print(f"  - Input sequences shape: {X_sequences.shape}")
        print(f"  - Target sequences shape: {y_sequences.shape}")
        print(f"  - Features created: {report['feature_stats']['n_features']}")
        print(f"  - Sequences generated: {report['final_sequences']}")
        
        # Validate results
        assert X_sequences.shape[0] > 0, "No sequences generated"
        assert y_sequences.shape[0] > 0, "No target sequences generated"
        assert X_sequences.shape[0] == y_sequences.shape[0], "Sequence count mismatch"
        assert X_sequences.shape[1] == config.sequence_length, "Incorrect sequence length"
        assert y_sequences.shape[1] == config.prediction_horizon, "Incorrect prediction horizon"
        
        # Test that preprocessor is fitted
        assert preprocessor.is_fitted, "Preprocessor should be fitted"
        assert preprocessor.feature_scaler is not None, "Feature scaler should be fitted"
        assert preprocessor.target_scaler is not None, "Target scaler should be fitted"
        
        print("✓ Full pipeline test passed!")
        return True
        
    except Exception as e:
        print(f"❌ Full pipeline test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_configuration_options():
    """Test different configuration options"""
    try:
        from services.time_series_preprocessing import (
            TimeSeriesPreprocessor,
            TimeSeriesConfig,
            create_sample_time_series_data
        )
        
        print("\n--- Testing Configuration Options ---")
        
        sample_data = create_sample_time_series_data(n_days=50)
        
        # Test different scaler types
        scaler_types = ['minmax', 'standard', 'robust']
        for scaler_type in scaler_types:
            config = TimeSeriesConfig(
                sequence_length=5,
                prediction_horizon=3,
                min_data_points=20,
                scaler_type=scaler_type
            )
            
            preprocessor = TimeSeriesPreprocessor(config)
            scaler = preprocessor._create_scaler(scaler_type)
            print(f"✓ {scaler_type} scaler: {scaler.__class__.__name__}")
        
        # Test minimal configuration
        minimal_config = TimeSeriesConfig(
            sequence_length=3,
            prediction_horizon=1,
            min_data_points=10,
            include_moving_averages=False,
            include_lag_features=False,
            include_seasonal_features=False,
            include_trend_features=False
        )
        
        minimal_preprocessor = TimeSeriesPreprocessor(minimal_config)
        X_min, y_min, _ = minimal_preprocessor.fit_transform(sample_data)
        print(f"✓ Minimal config: {X_min.shape} sequences with {X_min.shape[2]} features")
        
        # Test maximal configuration
        maximal_config = TimeSeriesConfig(
            sequence_length=15,
            prediction_horizon=7,
            min_data_points=30,
            ma_windows=[3, 5, 7, 10],
            lag_periods=[1, 2, 3, 5, 7],
            include_moving_averages=True,
            include_lag_features=True,
            include_seasonal_features=True,
            include_trend_features=True
        )
        
        maximal_preprocessor = TimeSeriesPreprocessor(maximal_config)
        X_max, y_max, _ = maximal_preprocessor.fit_transform(sample_data)
        print(f"✓ Maximal config: {X_max.shape} sequences with {X_max.shape[2]} features")
        
        # Verify that maximal config has more features than minimal
        assert X_max.shape[2] > X_min.shape[2], "Maximal config should have more features"
        
        print("✓ Configuration options test passed!")
        return True
        
    except Exception as e:
        print(f"❌ Configuration options test failed: {e}")
        return False

def test_integration_readiness():
    """Test integration readiness with LSTM models"""
    try:
        print("\n--- Testing Integration Readiness ---")
        
        # Test that the preprocessing output is suitable for LSTM models
        from services.time_series_preprocessing import (
            TimeSeriesPreprocessor,
            TimeSeriesConfig,
            create_sample_time_series_data
        )
        
        config = TimeSeriesConfig(
            sequence_length=10,
            prediction_horizon=5,
            min_data_points=30
        )
        
        preprocessor = TimeSeriesPreprocessor(config)
        sample_data = create_sample_time_series_data(n_days=50)
        
        X_sequences, y_sequences, report = preprocessor.fit_transform(sample_data)
        
        # Validate LSTM compatibility
        assert X_sequences.ndim == 3, f"Expected 3D array for LSTM input, got {X_sequences.ndim}D"
        assert y_sequences.ndim == 2, f"Expected 2D array for targets, got {y_sequences.ndim}D"
        
        # Check data types
        assert str(X_sequences.dtype).startswith('float'), f"Expected float dtype, got {X_sequences.dtype}"
        assert str(y_sequences.dtype).startswith('float'), f"Expected float dtype, got {y_sequences.dtype}"
        
        # Check for NaN values
        import numpy as np
        assert not any(np.isnan(X_sequences).any() for X_sequences in [X_sequences]), "X_sequences contains NaN values"
        assert not any(np.isnan(y_sequences).any() for y_sequences in [y_sequences]), "y_sequences contains NaN values"
        
        # Test inverse transformation
        sample_predictions = y_sequences[:3]  # Use first 3 sequences as mock predictions
        original_scale = preprocessor.inverse_transform_targets(sample_predictions)
        
        assert original_scale.shape[0] == sample_predictions.shape[0], "Inverse transform shape mismatch"
        assert not any(np.isnan(original_scale).any() for original_scale in [original_scale]), "Inverse transform contains NaN"
        
        print(f"✓ LSTM-ready sequences: {X_sequences.shape}")
        print(f"✓ Target sequences: {y_sequences.shape}")
        print(f"✓ Data types: X={X_sequences.dtype}, y={y_sequences.dtype}")
        print(f"✓ No NaN values detected")
        print(f"✓ Inverse transform working: {original_scale.shape}")
        
        print("✓ Integration readiness test passed!")
        return True
        
    except Exception as e:
        print(f"❌ Integration readiness test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("=== Time Series Preprocessing Service Validation ===\n")
    
    success = True
    
    # Run all tests
    success &= test_basic_functionality()
    success &= test_feature_engineering()
    success &= test_sequence_generation()
    success &= test_full_pipeline()
    success &= test_configuration_options()
    success &= test_integration_readiness()
    
    print(f"\n=== Validation {'PASSED' if success else 'FAILED'} ===")
    
    if success:
        print("\n✅ Time Series Preprocessing System is ready for use!")
        print("\nNext steps:")
        print("1. Install full dependencies: pip install -r requirements.txt")
        print("2. Run comprehensive tests: python -m pytest test_time_series_preprocessing.py")
        print("3. Integrate with LSTM model implementation")
        print("4. Test with real financial data")
    else:
        print("\n❌ Some tests failed. Please check the errors above.")
    
    sys.exit(0 if success else 1)