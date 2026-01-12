"""
Time Series Preprocessing Service

This service implements data preprocessing for time-series financial prediction,
including data normalization, sequence generation for LSTM input, and feature
engineering for temporal patterns.
"""

import logging
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional, Any, Union
from dataclasses import dataclass
from sklearn.preprocessing import MinMaxScaler, StandardScaler, RobustScaler
from sklearn.impute import SimpleImputer
import joblib

logger = logging.getLogger(__name__)

@dataclass
class TimeSeriesConfig:
    """Configuration for time series preprocessing"""
    # Sequence parameters
    sequence_length: int = 30  # Number of days to look back
    prediction_horizon: int = 30  # Number of days to predict ahead
    step_size: int = 1  # Step size for sequence generation
    
    # Normalization parameters
    scaler_type: str = 'minmax'  # 'minmax', 'standard', 'robust'
    feature_range: Tuple[float, float] = (0, 1)  # For MinMaxScaler
    
    # Feature engineering parameters
    include_moving_averages: bool = True
    ma_windows: List[int] = None  # Moving average windows
    include_lag_features: bool = True
    lag_periods: List[int] = None  # Lag periods
    include_seasonal_features: bool = True
    include_trend_features: bool = True
    
    # Data validation parameters
    min_data_points: int = 90  # Minimum data points required
    max_missing_ratio: float = 0.1  # Maximum ratio of missing values
    outlier_threshold: float = 3.0  # Z-score threshold for outliers
    
    # Imputation parameters
    imputation_strategy: str = 'mean'  # 'mean', 'median', 'forward_fill', 'backward_fill'
    
    def __post_init__(self):
        if self.ma_windows is None:
            self.ma_windows = [7, 14, 30]  # Weekly, bi-weekly, monthly
        if self.lag_periods is None:
            self.lag_periods = [1, 7, 14, 30]  # 1 day, 1 week, 2 weeks, 1 month

class TimeSeriesPreprocessor:
    """
    Main preprocessing service for time series financial data
    """
    
    def __init__(self, config: TimeSeriesConfig = None):
        """
        Initialize the time series preprocessor
        
        Args:
            config: Configuration for preprocessing
        """
        self.config = config or TimeSeriesConfig()
        
        # Scalers for different features
        self.balance_scaler = None
        self.feature_scaler = None
        self.target_scaler = None
        
        # Imputers
        self.imputer = None
        
        # Feature statistics
        self.feature_stats = {}
        self.preprocessing_stats = {}
        
        self.is_fitted = False
    
    def _create_scaler(self, scaler_type: str) -> Union[MinMaxScaler, StandardScaler, RobustScaler]:
        """
        Create a scaler based on configuration
        
        Args:
            scaler_type: Type of scaler to create
            
        Returns:
            Configured scaler
        """
        if scaler_type.lower() == 'minmax':
            return MinMaxScaler(feature_range=self.config.feature_range)
        elif scaler_type.lower() == 'standard':
            return StandardScaler()
        elif scaler_type.lower() == 'robust':
            return RobustScaler()
        else:
            raise ValueError(f"Unsupported scaler type: {scaler_type}")
    
    def _validate_data(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Validate input data quality and completeness
        
        Args:
            df: Input DataFrame
            
        Returns:
            Validation report
        """
        validation_report = {
            'is_valid': True,
            'warnings': [],
            'errors': [],
            'data_quality': {}
        }
        
        # Check minimum data points
        if len(df) < self.config.min_data_points:
            validation_report['errors'].append(
                f"Insufficient data points: {len(df)} < {self.config.min_data_points}"
            )
            validation_report['is_valid'] = False
        
        # Check for required columns
        required_columns = ['date', 'balance']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            validation_report['errors'].append(
                f"Missing required columns: {missing_columns}"
            )
            validation_report['is_valid'] = False
        
        if not validation_report['is_valid']:
            return validation_report
        
        # Check data types
        if not pd.api.types.is_datetime64_any_dtype(df['date']):
            validation_report['warnings'].append("Date column is not datetime type")
        
        if not pd.api.types.is_numeric_dtype(df['balance']):
            validation_report['warnings'].append("Balance column is not numeric type")
        
        # Check for missing values
        missing_ratio = df['balance'].isnull().sum() / len(df)
        validation_report['data_quality']['missing_ratio'] = missing_ratio
        
        if missing_ratio > self.config.max_missing_ratio:
            validation_report['errors'].append(
                f"Too many missing values: {missing_ratio:.2%} > {self.config.max_missing_ratio:.2%}"
            )
            validation_report['is_valid'] = False
        elif missing_ratio > 0:
            validation_report['warnings'].append(
                f"Missing values detected: {missing_ratio:.2%}"
            )
        
        # Check for duplicates
        duplicate_dates = df['date'].duplicated().sum()
        validation_report['data_quality']['duplicate_dates'] = duplicate_dates
        
        if duplicate_dates > 0:
            validation_report['warnings'].append(
                f"Duplicate dates found: {duplicate_dates}"
            )
        
        # Check for outliers
        if df['balance'].notna().sum() > 0:
            z_scores = np.abs((df['balance'] - df['balance'].mean()) / df['balance'].std())
            outliers = (z_scores > self.config.outlier_threshold).sum()
            validation_report['data_quality']['outliers'] = outliers
            
            if outliers > 0:
                validation_report['warnings'].append(
                    f"Outliers detected: {outliers} values with z-score > {self.config.outlier_threshold}"
                )
        
        # Check date continuity
        df_sorted = df.sort_values('date')
        date_gaps = (df_sorted['date'].diff() > pd.Timedelta(days=2)).sum()
        validation_report['data_quality']['date_gaps'] = date_gaps
        
        if date_gaps > 0:
            validation_report['warnings'].append(
                f"Date gaps detected: {date_gaps} gaps > 1 day"
            )
        
        return validation_report
    
    def _clean_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Clean and prepare the data
        
        Args:
            df: Input DataFrame
            
        Returns:
            Cleaned DataFrame
        """
        df_clean = df.copy()
        
        # Ensure date column is datetime
        if not pd.api.types.is_datetime64_any_dtype(df_clean['date']):
            df_clean['date'] = pd.to_datetime(df_clean['date'])
        
        # Sort by date
        df_clean = df_clean.sort_values('date').reset_index(drop=True)
        
        # Remove duplicates (keep last)
        df_clean = df_clean.drop_duplicates(subset=['date'], keep='last')
        
        # Ensure numeric balance
        df_clean['balance'] = pd.to_numeric(df_clean['balance'], errors='coerce')
        
        # Handle missing values
        if df_clean['balance'].isnull().any():
            if self.config.imputation_strategy == 'forward_fill':
                df_clean['balance'] = df_clean['balance'].fillna(method='ffill')
            elif self.config.imputation_strategy == 'backward_fill':
                df_clean['balance'] = df_clean['balance'].fillna(method='bfill')
            else:
                # Use sklearn imputer for mean/median
                if not self.is_fitted:
                    self.imputer = SimpleImputer(strategy=self.config.imputation_strategy)
                    df_clean['balance'] = self.imputer.fit_transform(
                        df_clean[['balance']]
                    ).flatten()
                else:
                    df_clean['balance'] = self.imputer.transform(
                        df_clean[['balance']]
                    ).flatten()
        
        return df_clean
    
    def _create_temporal_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Create temporal features from date column
        
        Args:
            df: Input DataFrame with date column
            
        Returns:
            DataFrame with additional temporal features
        """
        df_features = df.copy()
        
        # Basic date features
        df_features['year'] = df_features['date'].dt.year
        df_features['month'] = df_features['date'].dt.month
        df_features['day'] = df_features['date'].dt.day
        df_features['day_of_week'] = df_features['date'].dt.dayofweek
        df_features['day_of_year'] = df_features['date'].dt.dayofyear
        df_features['week_of_year'] = df_features['date'].dt.isocalendar().week
        df_features['quarter'] = df_features['date'].dt.quarter
        
        # Cyclical features (sine/cosine encoding)
        if self.config.include_seasonal_features:
            # Month cyclical
            df_features['month_sin'] = np.sin(2 * np.pi * df_features['month'] / 12)
            df_features['month_cos'] = np.cos(2 * np.pi * df_features['month'] / 12)
            
            # Day of week cyclical
            df_features['dow_sin'] = np.sin(2 * np.pi * df_features['day_of_week'] / 7)
            df_features['dow_cos'] = np.cos(2 * np.pi * df_features['day_of_week'] / 7)
            
            # Day of year cyclical
            df_features['doy_sin'] = np.sin(2 * np.pi * df_features['day_of_year'] / 365.25)
            df_features['doy_cos'] = np.cos(2 * np.pi * df_features['day_of_year'] / 365.25)
        
        # Binary features
        df_features['is_weekend'] = (df_features['day_of_week'] >= 5).astype(int)
        df_features['is_month_start'] = df_features['date'].dt.is_month_start.astype(int)
        df_features['is_month_end'] = df_features['date'].dt.is_month_end.astype(int)
        df_features['is_quarter_start'] = df_features['date'].dt.is_quarter_start.astype(int)
        df_features['is_quarter_end'] = df_features['date'].dt.is_quarter_end.astype(int)
        
        return df_features
    
    def _create_lag_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Create lag features for balance
        
        Args:
            df: Input DataFrame
            
        Returns:
            DataFrame with lag features
        """
        if not self.config.include_lag_features:
            return df
        
        df_lag = df.copy()
        
        for lag in self.config.lag_periods:
            df_lag[f'balance_lag_{lag}'] = df_lag['balance'].shift(lag)
        
        return df_lag
    
    def _create_moving_average_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Create moving average features
        
        Args:
            df: Input DataFrame
            
        Returns:
            DataFrame with moving average features
        """
        if not self.config.include_moving_averages:
            return df
        
        df_ma = df.copy()
        
        for window in self.config.ma_windows:
            # Simple moving average
            df_ma[f'balance_ma_{window}'] = df_ma['balance'].rolling(
                window=window, min_periods=1
            ).mean()
            
            # Exponential moving average
            df_ma[f'balance_ema_{window}'] = df_ma['balance'].ewm(
                span=window, adjust=False
            ).mean()
            
            # Moving standard deviation
            df_ma[f'balance_std_{window}'] = df_ma['balance'].rolling(
                window=window, min_periods=1
            ).std()
            
            # Moving min/max
            df_ma[f'balance_min_{window}'] = df_ma['balance'].rolling(
                window=window, min_periods=1
            ).min()
            df_ma[f'balance_max_{window}'] = df_ma['balance'].rolling(
                window=window, min_periods=1
            ).max()
        
        return df_ma
    
    def _create_trend_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Create trend-based features
        
        Args:
            df: Input DataFrame
            
        Returns:
            DataFrame with trend features
        """
        if not self.config.include_trend_features:
            return df
        
        df_trend = df.copy()
        
        # Balance changes
        df_trend['balance_change'] = df_trend['balance'].diff()
        df_trend['balance_pct_change'] = df_trend['balance'].pct_change()
        
        # Rolling trends
        for window in [7, 14, 30]:
            # Linear trend (slope)
            df_trend[f'balance_trend_{window}'] = df_trend['balance'].rolling(
                window=window, min_periods=2
            ).apply(lambda x: np.polyfit(range(len(x)), x, 1)[0] if len(x) >= 2 else 0)
            
            # Momentum (rate of change)
            df_trend[f'balance_momentum_{window}'] = (
                df_trend['balance'] - df_trend['balance'].shift(window)
            ) / window
        
        # Volatility (rolling standard deviation)
        df_trend['balance_volatility'] = df_trend['balance'].rolling(
            window=30, min_periods=1
        ).std()
        
        return df_trend
    
    def _create_sequences(self, 
                         features: np.ndarray, 
                         targets: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Create sequences for LSTM input
        
        Args:
            features: Feature matrix
            targets: Target values
            
        Returns:
            Tuple of (X_sequences, y_sequences)
        """
        X_sequences = []
        y_sequences = []
        
        for i in range(self.config.sequence_length, 
                      len(features) - self.config.prediction_horizon + 1, 
                      self.config.step_size):
            
            # Input sequence
            X_seq = features[i - self.config.sequence_length:i]
            X_sequences.append(X_seq)
            
            # Target sequence (next prediction_horizon days)
            y_seq = targets[i:i + self.config.prediction_horizon]
            y_sequences.append(y_seq)
        
        return np.array(X_sequences), np.array(y_sequences)
    
    def fit_transform(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray, Dict[str, Any]]:
        """
        Fit the preprocessor and transform the data
        
        Args:
            df: Input DataFrame with date and balance columns
            
        Returns:
            Tuple of (X_sequences, y_sequences, preprocessing_report)
        """
        logger.info(f"Fitting time series preprocessor on {len(df)} data points")
        
        # Validate data
        validation_report = self._validate_data(df)
        if not validation_report['is_valid']:
            raise ValueError(f"Data validation failed: {validation_report['errors']}")
        
        # Clean data
        df_clean = self._clean_data(df)
        
        # Create features
        df_features = self._create_temporal_features(df_clean)
        df_features = self._create_lag_features(df_features)
        df_features = self._create_moving_average_features(df_features)
        df_features = self._create_trend_features(df_features)
        
        # Remove rows with NaN values (from lag features)
        df_features = df_features.dropna()
        
        if len(df_features) < self.config.sequence_length + self.config.prediction_horizon:
            raise ValueError(
                f"Insufficient data after feature engineering: {len(df_features)} < "
                f"{self.config.sequence_length + self.config.prediction_horizon}"
            )
        
        # Separate features and targets
        feature_columns = [col for col in df_features.columns if col not in ['date']]
        features = df_features[feature_columns].values
        targets = df_features['balance'].values
        
        # Fit scalers
        self.balance_scaler = self._create_scaler(self.config.scaler_type)
        self.feature_scaler = self._create_scaler(self.config.scaler_type)
        self.target_scaler = self._create_scaler(self.config.scaler_type)
        
        # Scale features and targets
        features_scaled = self.feature_scaler.fit_transform(features)
        targets_scaled = self.target_scaler.fit_transform(targets.reshape(-1, 1)).flatten()
        
        # Create sequences
        X_sequences, y_sequences = self._create_sequences(features_scaled, targets_scaled)
        
        # Store feature statistics
        self.feature_stats = {
            'n_features': features.shape[1],
            'feature_names': feature_columns,
            'n_sequences': len(X_sequences),
            'sequence_shape': X_sequences.shape,
            'target_shape': y_sequences.shape
        }
        
        # Create preprocessing report
        preprocessing_report = {
            'validation_report': validation_report,
            'original_data_points': len(df),
            'cleaned_data_points': len(df_clean),
            'feature_data_points': len(df_features),
            'final_sequences': len(X_sequences),
            'feature_stats': self.feature_stats,
            'data_quality': {
                'missing_values_handled': df['balance'].isnull().sum(),
                'outliers_detected': validation_report['data_quality'].get('outliers', 0),
                'date_range': {
                    'start': df_clean['date'].min().isoformat(),
                    'end': df_clean['date'].max().isoformat(),
                    'days': (df_clean['date'].max() - df_clean['date'].min()).days
                }
            }
        }
        
        self.preprocessing_stats = preprocessing_report
        self.is_fitted = True
        
        logger.info(f"Preprocessing complete: {len(X_sequences)} sequences created")
        
        return X_sequences, y_sequences, preprocessing_report
    
    def transform(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray, Dict[str, Any]]:
        """
        Transform new data using fitted preprocessor
        
        Args:
            df: Input DataFrame
            
        Returns:
            Tuple of (X_sequences, y_sequences, transform_report)
        """
        if not self.is_fitted:
            raise ValueError("Preprocessor must be fitted before transform")
        
        logger.info(f"Transforming {len(df)} data points")
        
        # Clean data
        df_clean = self._clean_data(df)
        
        # Create features (same as fit)
        df_features = self._create_temporal_features(df_clean)
        df_features = self._create_lag_features(df_features)
        df_features = self._create_moving_average_features(df_features)
        df_features = self._create_trend_features(df_features)
        
        # Remove rows with NaN values
        df_features = df_features.dropna()
        
        # Separate features and targets
        feature_columns = self.feature_stats['feature_names']
        features = df_features[feature_columns].values
        targets = df_features['balance'].values
        
        # Scale using fitted scalers
        features_scaled = self.feature_scaler.transform(features)
        targets_scaled = self.target_scaler.transform(targets.reshape(-1, 1)).flatten()
        
        # Create sequences
        X_sequences, y_sequences = self._create_sequences(features_scaled, targets_scaled)
        
        # Create transform report
        transform_report = {
            'original_data_points': len(df),
            'cleaned_data_points': len(df_clean),
            'feature_data_points': len(df_features),
            'final_sequences': len(X_sequences),
            'sequence_shape': X_sequences.shape,
            'target_shape': y_sequences.shape
        }
        
        logger.info(f"Transform complete: {len(X_sequences)} sequences created")
        
        return X_sequences, y_sequences, transform_report
    
    def inverse_transform_targets(self, scaled_targets: np.ndarray) -> np.ndarray:
        """
        Inverse transform scaled target values back to original scale
        
        Args:
            scaled_targets: Scaled target values
            
        Returns:
            Original scale target values
        """
        if not self.is_fitted:
            raise ValueError("Preprocessor must be fitted before inverse transform")
        
        if scaled_targets.ndim == 1:
            scaled_targets = scaled_targets.reshape(-1, 1)
        
        return self.target_scaler.inverse_transform(scaled_targets).flatten()
    
    def get_feature_importance_analysis(self) -> Dict[str, Any]:
        """
        Get analysis of feature importance and statistics
        
        Returns:
            Feature analysis dictionary
        """
        if not self.is_fitted:
            raise ValueError("Preprocessor must be fitted before analysis")
        
        feature_names = self.feature_stats['feature_names']
        
        # Categorize features
        feature_categories = {
            'temporal': [name for name in feature_names if any(
                keyword in name for keyword in ['year', 'month', 'day', 'week', 'quarter', 'sin', 'cos', 'is_']
            )],
            'lag': [name for name in feature_names if 'lag' in name],
            'moving_average': [name for name in feature_names if any(
                keyword in name for keyword in ['ma_', 'ema_', 'std_', 'min_', 'max_']
            )],
            'trend': [name for name in feature_names if any(
                keyword in name for keyword in ['change', 'trend', 'momentum', 'volatility']
            )],
            'balance': [name for name in feature_names if name == 'balance']
        }
        
        return {
            'total_features': len(feature_names),
            'feature_categories': feature_categories,
            'category_counts': {cat: len(features) for cat, features in feature_categories.items()},
            'sequence_info': {
                'sequence_length': self.config.sequence_length,
                'prediction_horizon': self.config.prediction_horizon,
                'total_sequences': self.feature_stats['n_sequences']
            },
            'preprocessing_config': {
                'scaler_type': self.config.scaler_type,
                'imputation_strategy': self.config.imputation_strategy,
                'include_moving_averages': self.config.include_moving_averages,
                'include_lag_features': self.config.include_lag_features,
                'include_seasonal_features': self.config.include_seasonal_features,
                'include_trend_features': self.config.include_trend_features
            }
        }
    
    def save_preprocessor(self, filepath: str) -> None:
        """
        Save the fitted preprocessor
        
        Args:
            filepath: Path to save the preprocessor
        """
        if not self.is_fitted:
            raise ValueError("Preprocessor must be fitted before saving")
        
        preprocessor_data = {
            'config': self.config,
            'balance_scaler': self.balance_scaler,
            'feature_scaler': self.feature_scaler,
            'target_scaler': self.target_scaler,
            'imputer': self.imputer,
            'feature_stats': self.feature_stats,
            'preprocessing_stats': self.preprocessing_stats,
            'is_fitted': self.is_fitted
        }
        
        joblib.dump(preprocessor_data, filepath)
        logger.info(f"Time series preprocessor saved to {filepath}")
    
    @classmethod
    def load_preprocessor(cls, filepath: str) -> 'TimeSeriesPreprocessor':
        """
        Load a fitted preprocessor
        
        Args:
            filepath: Path to load the preprocessor from
            
        Returns:
            Loaded preprocessor
        """
        preprocessor_data = joblib.load(filepath)
        
        # Create new instance
        preprocessor = cls(config=preprocessor_data['config'])
        
        # Restore fitted components
        preprocessor.balance_scaler = preprocessor_data['balance_scaler']
        preprocessor.feature_scaler = preprocessor_data['feature_scaler']
        preprocessor.target_scaler = preprocessor_data['target_scaler']
        preprocessor.imputer = preprocessor_data['imputer']
        preprocessor.feature_stats = preprocessor_data['feature_stats']
        preprocessor.preprocessing_stats = preprocessor_data['preprocessing_stats']
        preprocessor.is_fitted = preprocessor_data['is_fitted']
        
        logger.info(f"Time series preprocessor loaded from {filepath}")
        return preprocessor

def create_sample_time_series_data(n_days: int = 365, 
                                 start_balance: float = 5000.0,
                                 trend: float = 0.1,
                                 volatility: float = 100.0,
                                 seasonal_amplitude: float = 200.0) -> pd.DataFrame:
    """
    Create sample time series data for testing
    
    Args:
        n_days: Number of days to generate
        start_balance: Starting balance
        trend: Daily trend (positive for growth)
        volatility: Daily volatility (standard deviation)
        seasonal_amplitude: Amplitude of seasonal variation
        
    Returns:
        DataFrame with date and balance columns
    """
    dates = pd.date_range(start='2023-01-01', periods=n_days, freq='D')
    
    # Generate synthetic balance data
    np.random.seed(42)  # For reproducibility
    
    balances = []
    current_balance = start_balance
    
    for i, date in enumerate(dates):
        # Add trend
        current_balance += trend
        
        # Add seasonal pattern (yearly cycle)
        seasonal_effect = seasonal_amplitude * np.sin(2 * np.pi * i / 365.25)
        
        # Add random volatility
        random_change = np.random.normal(0, volatility)
        
        # Add weekly pattern (lower on weekends)
        if date.weekday() >= 5:  # Weekend
            random_change *= 0.7
        
        current_balance += seasonal_effect + random_change
        balances.append(current_balance)
    
    return pd.DataFrame({
        'date': dates,
        'balance': balances
    })