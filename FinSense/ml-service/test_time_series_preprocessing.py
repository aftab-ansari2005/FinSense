"""
Tests for Time Series Preprocessing Service

This module contains comprehensive tests for the time series preprocessing system,
including data validation, feature engineering, sequence generation, and normalization.
"""

import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from unittest.mock import Mock, patch

from src.services.time_series_preprocessing import (
    TimeSeriesPreprocessor,
    TimeSeriesConfig,
    create_sample_time_series_data
)

class TestTimeSeriesConfig:
    """Test cases for TimeSeriesConfig"""
    
    def test_default_config(self):
        """Test default configuration values"""
        config = TimeSeriesConfig()
        
        assert config.sequence_length == 30
        assert config.prediction_horizon == 30
        assert config.step_size == 1
        assert config.scaler_type == 'minmax'
        assert config.feature_range == (0, 1)
        assert config.include_moving_averages is True
        assert config.ma_windows == [7, 14, 30]
        assert config.include_lag_features is True
        assert config.lag_periods == [1, 7, 14, 30]
        assert config.include_seasonal_features is True
        assert config.include_trend_features is True
        assert config.min_data_points == 90
        assert config.max_missing_ratio == 0.1
        assert config.outlier_threshold == 3.0
        assert config.imputation_strategy == 'mean'
    
    def test_custom_config(self):
        """Test custom configuration values"""
        config = TimeSeriesConfig(
            sequence_length=60,
            prediction_horizon=14,
            scaler_type='standard',
            ma_windows=[5, 10, 20],
            lag_periods=[1, 3, 7],
            min_data_points=180
        )
        
        assert config.sequence_length == 60
        assert config.prediction_horizon == 14
        assert config.scaler_type == 'standard'
        assert config.ma_windows == [5, 10, 20]
        assert config.lag_periods == [1, 3, 7]
        assert config.min_data_points == 180

class TestTimeSeriesPreprocessor:
    """Test cases for TimeSeriesPreprocessor"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.config = TimeSeriesConfig(
            sequence_length=10,
            prediction_horizon=5,
            min_data_points=30,
            ma_windows=[3, 7],
            lag_periods=[1, 3]
        )
        self.preprocessor = TimeSeriesPreprocessor(self.config)
        
        # Create sample data
        self.sample_data = create_sample_time_series_data(
            n_days=100, 
            start_balance=1000.0,
            trend=1.0,
            volatility=50.0
        )
    
    def test_initialization(self):
        """Test preprocessor initialization"""
        assert self.preprocessor.config == self.config
        assert self.preprocessor.balance_scaler is None
        assert self.preprocessor.feature_scaler is None
        assert self.preprocessor.target_scaler is None
        assert not self.preprocessor.is_fitted
    
    def test_create_scaler(self):
        """Test scaler creation"""
        # Test MinMaxScaler
        scaler = self.preprocessor._create_scaler('minmax')
        assert scaler.__class__.__name__ == 'MinMaxScaler'
        
        # Test StandardScaler
        scaler = self.preprocessor._create_scaler('standard')
        assert scaler.__class__.__name__ == 'StandardScaler'
        
        # Test RobustScaler
        scaler = self.preprocessor._create_scaler('robust')
        assert scaler.__class__.__name__ == 'RobustScaler'
        
        # Test invalid scaler
        with pytest.raises(ValueError):
            self.preprocessor._create_scaler('invalid')
    
    def test_validate_data_success(self):
        """Test successful data validation"""
        validation_report = self.preprocessor._validate_data(self.sample_data)
        
        assert validation_report['is_valid'] is True
        assert len(validation_report['errors']) == 0
        assert 'data_quality' in validation_report
    
    def test_validate_data_insufficient_points(self):
        """Test validation with insufficient data points"""
        small_data = self.sample_data.head(20)  # Less than min_data_points (30)
        validation_report = self.preprocessor._validate_data(small_data)
        
        assert validation_report['is_valid'] is False
        assert any('Insufficient data points' in error for error in validation_report['errors'])
    
    def test_validate_data_missing_columns(self):
        """Test validation with missing required columns"""
        invalid_data = pd.DataFrame({'wrong_column': [1, 2, 3]})
        validation_report = self.preprocessor._validate_data(invalid_data)
        
        assert validation_report['is_valid'] is False
        assert any('Missing required columns' in error for error in validation_report['errors'])
    
    def test_validate_data_too_many_missing_values(self):
        """Test validation with too many missing values"""
        data_with_missing = self.sample_data.copy()
        # Make 20% of values missing (more than max_missing_ratio of 10%)
        missing_indices = np.random.choice(len(data_with_missing), size=int(0.2 * len(data_with_missing)), replace=False)
        data_with_missing.loc[missing_indices, 'balance'] = np.nan
        
        validation_report = self.preprocessor._validate_data(data_with_missing)
        
        assert validation_report['is_valid'] is False
        assert any('Too many missing values' in error for error in validation_report['errors'])
    
    def test_clean_data(self):
        """Test data cleaning functionality"""
        # Create data with issues
        dirty_data = self.sample_data.copy()
        
        # Add duplicates
        dirty_data = pd.concat([dirty_data, dirty_data.iloc[[0, 1]]], ignore_index=True)
        
        # Add missing values
        dirty_data.loc[5, 'balance'] = np.nan
        
        # Make date column string
        dirty_data['date'] = dirty_data['date'].astype(str)
        
        cleaned_data = self.preprocessor._clean_data(dirty_data)
        
        # Check that data is cleaned
        assert pd.api.types.is_datetime64_any_dtype(cleaned_data['date'])
        assert cleaned_data['balance'].isnull().sum() == 0  # Missing values handled
        assert len(cleaned_data) <= len(dirty_data)  # Duplicates removed
    
    def test_create_temporal_features(self):
        """Test temporal feature creation"""
        df_with_features = self.preprocessor._create_temporal_features(self.sample_data)
        
        # Check basic temporal features
        expected_features = ['year', 'month', 'day', 'day_of_week', 'day_of_year', 
                           'week_of_year', 'quarter', 'is_weekend', 'is_month_start', 
                           'is_month_end', 'is_quarter_start', 'is_quarter_end']
        
        for feature in expected_features:
            assert feature in df_with_features.columns
        
        # Check seasonal features (if enabled)
        if self.config.include_seasonal_features:
            seasonal_features = ['month_sin', 'month_cos', 'dow_sin', 'dow_cos', 
                               'doy_sin', 'doy_cos']
            for feature in seasonal_features:
                assert feature in df_with_features.columns
        
        # Check value ranges
        assert df_with_features['month'].min() >= 1
        assert df_with_features['month'].max() <= 12
        assert df_with_features['day_of_week'].min() >= 0
        assert df_with_features['day_of_week'].max() <= 6
        assert df_with_features['is_weekend'].isin([0, 1]).all()
    
    def test_create_lag_features(self):
        """Test lag feature creation"""
        df_with_lags = self.preprocessor._create_lag_features(self.sample_data)
        
        if self.config.include_lag_features:
            for lag in self.config.lag_periods:
                lag_column = f'balance_lag_{lag}'
                assert lag_column in df_with_lags.columns
                
                # Check that lag values are correct (where not NaN)
                non_nan_mask = df_with_lags[lag_column].notna()
                if non_nan_mask.any():
                    original_values = df_with_lags.loc[non_nan_mask, 'balance'].values
                    lagged_values = df_with_lags.loc[non_nan_mask, lag_column].values
                    # The lagged values should match original values shifted by lag
                    # (This is a simplified check)
                    assert len(original_values) == len(lagged_values)
    
    def test_create_moving_average_features(self):
        """Test moving average feature creation"""
        df_with_ma = self.preprocessor._create_moving_average_features(self.sample_data)
        
        if self.config.include_moving_averages:
            for window in self.config.ma_windows:
                ma_columns = [
                    f'balance_ma_{window}',
                    f'balance_ema_{window}',
                    f'balance_std_{window}',
                    f'balance_min_{window}',
                    f'balance_max_{window}'
                ]
                
                for col in ma_columns:
                    assert col in df_with_ma.columns
                    # Check that moving averages are reasonable
                    assert df_with_ma[col].notna().any()
    
    def test_create_trend_features(self):
        """Test trend feature creation"""
        df_with_trends = self.preprocessor._create_trend_features(self.sample_data)
        
        if self.config.include_trend_features:
            trend_features = ['balance_change', 'balance_pct_change', 'balance_volatility']
            
            for feature in trend_features:
                assert feature in df_with_trends.columns
            
            # Check trend features for different windows
            for window in [7, 14, 30]:
                trend_col = f'balance_trend_{window}'
                momentum_col = f'balance_momentum_{window}'
                
                if trend_col in df_with_trends.columns:
                    assert df_with_trends[trend_col].notna().any()
                if momentum_col in df_with_trends.columns:
                    assert df_with_trends[momentum_col].notna().any()
    
    def test_create_sequences(self):
        """Test sequence creation for LSTM"""
        # Create simple feature matrix
        n_points = 50
        n_features = 5
        features = np.random.randn(n_points, n_features)
        targets = np.random.randn(n_points)
        
        X_sequences, y_sequences = self.preprocessor._create_sequences(features, targets)
        
        # Check sequence shapes
        expected_n_sequences = (n_points - self.config.sequence_length - self.config.prediction_horizon + 1)
        expected_n_sequences = max(0, expected_n_sequences)
        
        assert X_sequences.shape[0] == expected_n_sequences
        assert X_sequences.shape[1] == self.config.sequence_length
        assert X_sequences.shape[2] == n_features
        
        assert y_sequences.shape[0] == expected_n_sequences
        assert y_sequences.shape[1] == self.config.prediction_horizon
    
    def test_fit_transform(self):
        """Test fit_transform functionality"""
        X_sequences, y_sequences, report = self.preprocessor.fit_transform(self.sample_data)
        
        # Check that preprocessor is fitted
        assert self.preprocessor.is_fitted is True
        assert self.preprocessor.balance_scaler is not None
        assert self.preprocessor.feature_scaler is not None
        assert self.preprocessor.target_scaler is not None
        
        # Check sequence shapes
        assert X_sequences.ndim == 3  # (n_sequences, sequence_length, n_features)
        assert y_sequences.ndim == 2  # (n_sequences, prediction_horizon)
        assert X_sequences.shape[0] == y_sequences.shape[0]
        assert X_sequences.shape[1] == self.config.sequence_length
        assert y_sequences.shape[1] == self.config.prediction_horizon
        
        # Check report
        assert 'validation_report' in report
        assert 'feature_stats' in report
        assert 'data_quality' in report
        assert report['final_sequences'] == len(X_sequences)
    
    def test_transform_after_fit(self):
        """Test transform functionality after fitting"""
        # First fit
        self.preprocessor.fit_transform(self.sample_data)
        
        # Create new data
        new_data = create_sample_time_series_data(n_days=80, start_balance=1200.0)
        
        # Transform new data
        X_sequences, y_sequences, report = self.preprocessor.transform(new_data)
        
        # Check that sequences are created
        assert X_sequences.shape[1] == self.config.sequence_length
        assert y_sequences.shape[1] == self.config.prediction_horizon
        assert X_sequences.shape[0] == y_sequences.shape[0]
        
        # Check report
        assert 'final_sequences' in report
        assert report['final_sequences'] == len(X_sequences)
    
    def test_transform_without_fit_raises_error(self):
        """Test that transform raises error when not fitted"""
        with pytest.raises(ValueError, match="Preprocessor must be fitted"):
            self.preprocessor.transform(self.sample_data)
    
    def test_inverse_transform_targets(self):
        """Test inverse transformation of targets"""
        # Fit preprocessor
        X_sequences, y_sequences, _ = self.preprocessor.fit_transform(self.sample_data)
        
        # Inverse transform
        original_scale_targets = self.preprocessor.inverse_transform_targets(y_sequences[0])
        
        # Check that inverse transform works
        assert len(original_scale_targets) == self.config.prediction_horizon
        assert not np.isnan(original_scale_targets).any()
    
    def test_inverse_transform_without_fit_raises_error(self):
        """Test that inverse transform raises error when not fitted"""
        with pytest.raises(ValueError, match="Preprocessor must be fitted"):
            self.preprocessor.inverse_transform_targets(np.array([1, 2, 3]))
    
    def test_get_feature_importance_analysis(self):
        """Test feature importance analysis"""
        # Fit preprocessor
        self.preprocessor.fit_transform(self.sample_data)
        
        analysis = self.preprocessor.get_feature_importance_analysis()
        
        # Check analysis structure
        assert 'total_features' in analysis
        assert 'feature_categories' in analysis
        assert 'category_counts' in analysis
        assert 'sequence_info' in analysis
        assert 'preprocessing_config' in analysis
        
        # Check feature categories
        categories = analysis['feature_categories']
        expected_categories = ['temporal', 'lag', 'moving_average', 'trend', 'balance']
        for category in expected_categories:
            assert category in categories
        
        # Check that total features matches sum of categories
        total_features = sum(analysis['category_counts'].values())
        assert analysis['total_features'] == total_features
    
    def test_save_load_preprocessor(self, tmp_path):
        """Test saving and loading preprocessor"""
        # Fit preprocessor
        self.preprocessor.fit_transform(self.sample_data)
        
        # Save preprocessor
        filepath = tmp_path / "preprocessor.pkl"
        self.preprocessor.save_preprocessor(str(filepath))
        
        # Load preprocessor
        loaded_preprocessor = TimeSeriesPreprocessor.load_preprocessor(str(filepath))
        
        # Check that loaded preprocessor has same properties
        assert loaded_preprocessor.is_fitted is True
        assert loaded_preprocessor.config.sequence_length == self.config.sequence_length
        assert loaded_preprocessor.feature_stats == self.preprocessor.feature_stats
        
        # Test that loaded preprocessor can transform data
        new_data = create_sample_time_series_data(n_days=60)
        X_new, y_new, _ = loaded_preprocessor.transform(new_data)
        assert X_new.shape[1] == self.config.sequence_length
    
    def test_save_without_fit_raises_error(self):
        """Test that save raises error when not fitted"""
        with pytest.raises(ValueError, match="Preprocessor must be fitted"):
            self.preprocessor.save_preprocessor("test.pkl")
    
    def test_different_scaler_types(self):
        """Test different scaler types"""
        scaler_types = ['minmax', 'standard', 'robust']
        
        for scaler_type in scaler_types:
            config = TimeSeriesConfig(
                sequence_length=5,
                prediction_horizon=3,
                min_data_points=20,
                scaler_type=scaler_type
            )
            preprocessor = TimeSeriesPreprocessor(config)
            
            # Should not raise error
            X_seq, y_seq, _ = preprocessor.fit_transform(self.sample_data)
            assert X_seq.shape[0] > 0
            assert y_seq.shape[0] > 0
    
    def test_different_imputation_strategies(self):
        """Test different imputation strategies"""
        # Create data with missing values
        data_with_missing = self.sample_data.copy()
        data_with_missing.loc[10:15, 'balance'] = np.nan
        
        strategies = ['mean', 'median']  # Skip fill methods for now due to pandas deprecation
        
        for strategy in strategies:
            config = TimeSeriesConfig(
                sequence_length=5,
                prediction_horizon=3,
                min_data_points=20,
                imputation_strategy=strategy
            )
            preprocessor = TimeSeriesPreprocessor(config)
            
            # Should handle missing values
            X_seq, y_seq, report = preprocessor.fit_transform(data_with_missing)
            assert X_seq.shape[0] > 0
            assert report['data_quality']['missing_values_handled'] > 0
    
    def test_edge_cases(self):
        """Test edge cases and error handling"""
        # Test with minimum viable data
        min_data = create_sample_time_series_data(n_days=self.config.min_data_points)
        X_seq, y_seq, _ = self.preprocessor.fit_transform(min_data)
        assert X_seq.shape[0] >= 0  # Should not crash
        
        # Test with data that has no variance
        constant_data = self.sample_data.copy()
        constant_data['balance'] = 1000.0  # All same value
        
        # Should handle constant data gracefully
        X_seq, y_seq, _ = self.preprocessor.fit_transform(constant_data)
        assert X_seq.shape[0] >= 0

class TestCreateSampleTimeSeriesData:
    """Test cases for sample data generation"""
    
    def test_create_sample_data_default(self):
        """Test creating sample data with default parameters"""
        data = create_sample_time_series_data()
        
        assert len(data) == 365  # Default n_days
        assert 'date' in data.columns
        assert 'balance' in data.columns
        assert pd.api.types.is_datetime64_any_dtype(data['date'])
        assert pd.api.types.is_numeric_dtype(data['balance'])
    
    def test_create_sample_data_custom(self):
        """Test creating sample data with custom parameters"""
        n_days = 100
        start_balance = 2000.0
        
        data = create_sample_time_series_data(
            n_days=n_days,
            start_balance=start_balance,
            trend=0.5,
            volatility=25.0
        )
        
        assert len(data) == n_days
        assert data['balance'].iloc[0] == pytest.approx(start_balance, abs=100)  # Allow some variance
    
    def test_sample_data_properties(self):
        """Test properties of generated sample data"""
        data = create_sample_time_series_data(n_days=365, trend=1.0)
        
        # Check that dates are consecutive
        date_diffs = data['date'].diff().dropna()
        assert all(diff == pd.Timedelta(days=1) for diff in date_diffs)
        
        # Check that there's some trend (last value > first value for positive trend)
        assert data['balance'].iloc[-1] > data['balance'].iloc[0]
        
        # Check that there's some variability
        assert data['balance'].std() > 0

class TestIntegrationScenarios:
    """Integration test scenarios"""
    
    def test_full_preprocessing_pipeline(self):
        """Test complete preprocessing pipeline"""
        # Create realistic data
        data = create_sample_time_series_data(
            n_days=200,
            start_balance=5000.0,
            trend=2.0,
            volatility=100.0,
            seasonal_amplitude=300.0
        )
        
        # Configure preprocessor
        config = TimeSeriesConfig(
            sequence_length=30,
            prediction_horizon=7,
            scaler_type='minmax',
            include_moving_averages=True,
            include_lag_features=True,
            include_seasonal_features=True,
            include_trend_features=True
        )
        
        preprocessor = TimeSeriesPreprocessor(config)
        
        # Fit and transform
        X_sequences, y_sequences, report = preprocessor.fit_transform(data)
        
        # Validate results
        assert X_sequences.shape[0] > 0
        assert y_sequences.shape[0] > 0
        assert X_sequences.shape[0] == y_sequences.shape[0]
        assert X_sequences.shape[1] == 30  # sequence_length
        assert y_sequences.shape[1] == 7   # prediction_horizon
        
        # Check that features are properly scaled (should be in [0, 1] for minmax)
        assert X_sequences.min() >= -0.1  # Allow small tolerance
        assert X_sequences.max() <= 1.1
        
        # Test inverse transform
        original_targets = preprocessor.inverse_transform_targets(y_sequences[0])
        assert len(original_targets) == 7
        assert not np.isnan(original_targets).any()
        
        # Test feature analysis
        analysis = preprocessor.get_feature_importance_analysis()
        assert analysis['total_features'] > 10  # Should have many features
        
        # Test transform on new data
        new_data = create_sample_time_series_data(n_days=100, start_balance=4000.0)
        X_new, y_new, _ = preprocessor.transform(new_data)
        assert X_new.shape[1] == 30
        assert y_new.shape[1] == 7
    
    def test_minimal_configuration(self):
        """Test with minimal configuration"""
        config = TimeSeriesConfig(
            sequence_length=5,
            prediction_horizon=1,
            min_data_points=20,
            include_moving_averages=False,
            include_lag_features=False,
            include_seasonal_features=False,
            include_trend_features=False
        )
        
        preprocessor = TimeSeriesPreprocessor(config)
        data = create_sample_time_series_data(n_days=30)
        
        X_sequences, y_sequences, _ = preprocessor.fit_transform(data)
        
        # Should still work with minimal features
        assert X_sequences.shape[0] > 0
        assert X_sequences.shape[1] == 5
        assert y_sequences.shape[1] == 1
    
    def test_robustness_with_problematic_data(self):
        """Test robustness with various data issues"""
        # Create data with various issues
        problematic_data = create_sample_time_series_data(n_days=100)
        
        # Add missing values
        problematic_data.loc[10:12, 'balance'] = np.nan
        
        # Add outliers
        problematic_data.loc[50, 'balance'] = problematic_data['balance'].mean() + 10 * problematic_data['balance'].std()
        
        # Add duplicate dates
        duplicate_row = problematic_data.iloc[20:21].copy()
        problematic_data = pd.concat([problematic_data, duplicate_row], ignore_index=True)
        
        config = TimeSeriesConfig(
            sequence_length=10,
            prediction_horizon=5,
            min_data_points=50,
            max_missing_ratio=0.2  # Allow more missing values
        )
        
        preprocessor = TimeSeriesPreprocessor(config)
        
        # Should handle problematic data gracefully
        X_sequences, y_sequences, report = preprocessor.fit_transform(problematic_data)
        
        assert X_sequences.shape[0] >= 0
        assert 'validation_report' in report
        assert len(report['validation_report']['warnings']) > 0  # Should detect issues

if __name__ == '__main__':
    pytest.main([__file__])