"""
Transaction Preprocessing Pipeline

This module provides a comprehensive preprocessing pipeline for transaction data,
including data cleaning, validation, feature extraction, and preparation for ML models.
"""

import logging
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional, Any, Union
from dataclasses import dataclass
import warnings

try:
    from ..services.feature_extraction import TransactionFeatureExtractor
except ImportError:
    # Fallback for direct execution
    from services.feature_extraction import TransactionFeatureExtractor

logger = logging.getLogger(__name__)

@dataclass
class PreprocessingConfig:
    """Configuration for preprocessing pipeline"""
    # Feature extraction parameters
    max_tfidf_features: int = 1000
    min_df: int = 2
    max_df: float = 0.95
    ngram_range: Tuple[int, int] = (1, 2)
    
    # Data cleaning parameters
    min_description_length: int = 3
    max_description_length: int = 500
    amount_outlier_threshold: float = 3.0  # Standard deviations
    
    # Date filtering parameters
    max_days_old: int = 1095  # 3 years
    min_days_old: int = 0
    
    # Validation parameters
    required_columns: List[str] = None
    
    def __post_init__(self):
        if self.required_columns is None:
            self.required_columns = ['date', 'amount', 'description']

class TransactionPreprocessingPipeline:
    """
    Complete preprocessing pipeline for transaction data
    """
    
    def __init__(self, config: PreprocessingConfig = None):
        """
        Initialize the preprocessing pipeline
        
        Args:
            config: Configuration for preprocessing
        """
        self.config = config or PreprocessingConfig()
        self.feature_extractor = TransactionFeatureExtractor(
            max_features=self.config.max_tfidf_features,
            min_df=self.config.min_df,
            max_df=self.config.max_df,
            ngram_range=self.config.ngram_range
        )
        
        self.is_fitted = False
        self.preprocessing_stats = {}
        
    def validate_data(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Validate input transaction data
        
        Args:
            df: Input DataFrame
            
        Returns:
            Tuple of (validated_df, validation_report)
        """
        validation_report = {
            'original_rows': len(df),
            'issues': [],
            'warnings': [],
            'final_rows': 0
        }
        
        # Check required columns
        missing_columns = set(self.config.required_columns) - set(df.columns)
        if missing_columns:
            raise ValueError(f"Missing required columns: {missing_columns}")
        
        # Create a copy for processing
        df_clean = df.copy()
        
        # Validate and clean date column
        if 'date' in df_clean.columns:
            original_count = len(df_clean)
            
            # Convert to datetime
            df_clean['date'] = pd.to_datetime(df_clean['date'], errors='coerce')
            
            # Remove rows with invalid dates
            invalid_dates = df_clean['date'].isna()
            if invalid_dates.sum() > 0:
                validation_report['issues'].append(f"Removed {invalid_dates.sum()} rows with invalid dates")
                df_clean = df_clean[~invalid_dates]
            
            # Filter by date range
            cutoff_date = datetime.now() - timedelta(days=self.config.max_days_old)
            min_date = datetime.now() - timedelta(days=self.config.min_days_old)
            
            old_transactions = df_clean['date'] < cutoff_date
            future_transactions = df_clean['date'] > min_date
            
            if old_transactions.sum() > 0:
                validation_report['warnings'].append(f"Removed {old_transactions.sum()} transactions older than {self.config.max_days_old} days")
                df_clean = df_clean[~old_transactions]
            
            if future_transactions.sum() > 0:
                validation_report['warnings'].append(f"Removed {future_transactions.sum()} future transactions")
                df_clean = df_clean[~future_transactions]
        
        # Validate and clean amount column
        if 'amount' in df_clean.columns:
            # Convert to numeric
            df_clean['amount'] = pd.to_numeric(df_clean['amount'], errors='coerce')
            
            # Remove rows with invalid amounts
            invalid_amounts = df_clean['amount'].isna()
            if invalid_amounts.sum() > 0:
                validation_report['issues'].append(f"Removed {invalid_amounts.sum()} rows with invalid amounts")
                df_clean = df_clean[~invalid_amounts]
            
            # Remove zero amounts (optional)
            zero_amounts = df_clean['amount'] == 0
            if zero_amounts.sum() > 0:
                validation_report['warnings'].append(f"Found {zero_amounts.sum()} zero-amount transactions")
            
            # Detect amount outliers
            if len(df_clean) > 0:
                amount_mean = df_clean['amount'].mean()
                amount_std = df_clean['amount'].std()
                
                if amount_std > 0:
                    outlier_threshold = self.config.amount_outlier_threshold
                    outliers = np.abs((df_clean['amount'] - amount_mean) / amount_std) > outlier_threshold
                    
                    if outliers.sum() > 0:
                        validation_report['warnings'].append(f"Found {outliers.sum()} potential amount outliers")
        
        # Validate and clean description column
        if 'description' in df_clean.columns:
            # Convert to string and handle missing values
            df_clean['description'] = df_clean['description'].astype(str).fillna('')
            
            # Remove very short descriptions
            short_descriptions = df_clean['description'].str.len() < self.config.min_description_length
            if short_descriptions.sum() > 0:
                validation_report['issues'].append(f"Removed {short_descriptions.sum()} rows with very short descriptions")
                df_clean = df_clean[~short_descriptions]
            
            # Truncate very long descriptions
            long_descriptions = df_clean['description'].str.len() > self.config.max_description_length
            if long_descriptions.sum() > 0:
                validation_report['warnings'].append(f"Truncated {long_descriptions.sum()} very long descriptions")
                df_clean.loc[long_descriptions, 'description'] = df_clean.loc[long_descriptions, 'description'].str[:self.config.max_description_length]
        
        # Remove duplicate transactions
        if len(df_clean) > 0:
            duplicates = df_clean.duplicated(subset=['date', 'amount', 'description'])
            if duplicates.sum() > 0:
                validation_report['warnings'].append(f"Removed {duplicates.sum()} duplicate transactions")
                df_clean = df_clean[~duplicates]
        
        validation_report['final_rows'] = len(df_clean)
        
        logger.info(f"Data validation complete: {validation_report['original_rows']} -> {validation_report['final_rows']} rows")
        
        return df_clean, validation_report
    
    def clean_and_normalize(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Clean and normalize transaction data
        
        Args:
            df: Input DataFrame
            
        Returns:
            Cleaned DataFrame
        """
        df_clean = df.copy()
        
        # Normalize description text
        if 'description' in df_clean.columns:
            # Remove extra whitespace
            df_clean['description'] = df_clean['description'].str.strip()
            df_clean['description'] = df_clean['description'].str.replace(r'\s+', ' ', regex=True)
            
            # Convert to title case for consistency
            df_clean['description'] = df_clean['description'].str.title()
        
        # Ensure proper data types
        if 'date' in df_clean.columns:
            df_clean['date'] = pd.to_datetime(df_clean['date'])
        
        if 'amount' in df_clean.columns:
            df_clean['amount'] = pd.to_numeric(df_clean['amount'])
        
        # Add derived columns
        if 'amount' in df_clean.columns:
            df_clean['amount_abs'] = df_clean['amount'].abs()
            df_clean['is_debit'] = df_clean['amount'] < 0
            df_clean['is_credit'] = df_clean['amount'] > 0
        
        if 'date' in df_clean.columns:
            df_clean['day_of_week'] = df_clean['date'].dt.dayofweek
            df_clean['month'] = df_clean['date'].dt.month
            df_clean['is_weekend'] = df_clean['day_of_week'].isin([5, 6])
        
        return df_clean
    
    def extract_features(self, df: pd.DataFrame, fit: bool = True) -> Tuple[np.ndarray, List[str]]:
        """
        Extract features from transaction data
        
        Args:
            df: Input DataFrame
            fit: Whether to fit the feature extractor
            
        Returns:
            Tuple of (feature_matrix, feature_names)
        """
        if fit:
            features = self.feature_extractor.fit_transform(df)
            self.is_fitted = True
        else:
            if not self.feature_extractor.is_fitted:
                raise ValueError("Feature extractor must be fitted before transform")
            features = self.feature_extractor.transform(df)
        
        feature_names = self.feature_extractor.get_feature_names()
        
        logger.info(f"Extracted {features.shape[1]} features from {len(df)} transactions")
        
        return features, feature_names
    
    def fit_transform(self, df: pd.DataFrame) -> Tuple[np.ndarray, pd.DataFrame, Dict[str, Any]]:
        """
        Complete preprocessing pipeline: validate, clean, and extract features
        
        Args:
            df: Input transaction DataFrame
            
        Returns:
            Tuple of (features, processed_df, processing_report)
        """
        processing_report = {
            'start_time': datetime.now(),
            'original_shape': df.shape,
            'validation_report': {},
            'final_shape': None,
            'feature_shape': None,
            'processing_time': None
        }
        
        try:
            # Step 1: Validate data
            logger.info("Starting data validation...")
            df_validated, validation_report = self.validate_data(df)
            processing_report['validation_report'] = validation_report
            
            if len(df_validated) == 0:
                raise ValueError("No valid transactions remaining after validation")
            
            # Step 2: Clean and normalize
            logger.info("Cleaning and normalizing data...")
            df_clean = self.clean_and_normalize(df_validated)
            
            # Step 3: Extract features
            logger.info("Extracting features...")
            features, feature_names = self.extract_features(df_clean, fit=True)
            
            # Update processing report
            processing_report['final_shape'] = df_clean.shape
            processing_report['feature_shape'] = features.shape
            processing_report['processing_time'] = (datetime.now() - processing_report['start_time']).total_seconds()
            
            # Store preprocessing stats
            self.preprocessing_stats = {
                'feature_names': feature_names,
                'n_features': len(feature_names),
                'processing_report': processing_report
            }
            
            logger.info(f"Preprocessing complete: {df.shape} -> {df_clean.shape}, {features.shape[1]} features")
            
            return features, df_clean, processing_report
            
        except Exception as e:
            logger.error(f"Preprocessing failed: {str(e)}")
            processing_report['error'] = str(e)
            processing_report['processing_time'] = (datetime.now() - processing_report['start_time']).total_seconds()
            raise
    
    def transform(self, df: pd.DataFrame) -> Tuple[np.ndarray, pd.DataFrame]:
        """
        Transform new data using fitted pipeline
        
        Args:
            df: Input transaction DataFrame
            
        Returns:
            Tuple of (features, processed_df)
        """
        if not self.is_fitted:
            raise ValueError("Pipeline must be fitted before transform")
        
        # Validate and clean
        df_validated, _ = self.validate_data(df)
        df_clean = self.clean_and_normalize(df_validated)
        
        # Extract features
        features, _ = self.extract_features(df_clean, fit=False)
        
        return features, df_clean
    
    def get_feature_analysis(self, features: np.ndarray) -> Dict[str, Any]:
        """
        Get analysis of extracted features
        
        Args:
            features: Feature matrix
            
        Returns:
            Feature analysis dictionary
        """
        if not self.is_fitted:
            raise ValueError("Pipeline must be fitted before analysis")
        
        return self.feature_extractor.get_feature_importance_analysis(features)
    
    def save_pipeline(self, filepath: str) -> None:
        """
        Save the fitted preprocessing pipeline
        
        Args:
            filepath: Path to save the pipeline
        """
        if not self.is_fitted:
            raise ValueError("Pipeline must be fitted before saving")
        
        # Save feature extractor
        extractor_path = filepath.replace('.joblib', '_extractor.joblib')
        self.feature_extractor.save(extractor_path)
        
        # Save pipeline configuration and stats
        import joblib
        pipeline_data = {
            'config': self.config,
            'preprocessing_stats': self.preprocessing_stats,
            'is_fitted': self.is_fitted,
            'extractor_path': extractor_path
        }
        
        joblib.dump(pipeline_data, filepath)
        logger.info(f"Preprocessing pipeline saved to {filepath}")
    
    @classmethod
    def load_pipeline(cls, filepath: str) -> 'TransactionPreprocessingPipeline':
        """
        Load a fitted preprocessing pipeline
        
        Args:
            filepath: Path to load the pipeline from
            
        Returns:
            Loaded preprocessing pipeline
        """
        import joblib
        
        pipeline_data = joblib.load(filepath)
        
        # Create new pipeline instance
        pipeline = cls(config=pipeline_data['config'])
        
        # Load feature extractor
        extractor_path = pipeline_data['extractor_path']
        pipeline.feature_extractor = TransactionFeatureExtractor.load(extractor_path)
        
        # Restore state
        pipeline.preprocessing_stats = pipeline_data['preprocessing_stats']
        pipeline.is_fitted = pipeline_data['is_fitted']
        
        logger.info(f"Preprocessing pipeline loaded from {filepath}")
        return pipeline

def create_sample_transactions(n_samples: int = 100) -> pd.DataFrame:
    """
    Create sample transaction data for testing
    
    Args:
        n_samples: Number of sample transactions to create
        
    Returns:
        DataFrame with sample transactions
    """
    np.random.seed(42)
    
    # Sample descriptions
    descriptions = [
        "Starbucks Coffee Shop", "Walmart Grocery Store", "Shell Gas Station",
        "Amazon Purchase", "McDonald's Restaurant", "Target Store",
        "Bank ATM Withdrawal", "Electric Bill Payment", "Rent Payment",
        "Salary Deposit", "Uber Ride", "Netflix Subscription",
        "Pharmacy CVS", "Doctor Visit", "Gym Membership",
        "Pizza Delivery", "Grocery Store", "Gas Station Fill Up",
        "Online Shopping", "Coffee Shop", "Restaurant Dinner"
    ]
    
    # Generate sample data
    data = []
    base_date = datetime.now() - timedelta(days=365)
    
    for i in range(n_samples):
        # Random date within last year
        days_offset = np.random.randint(0, 365)
        transaction_date = base_date + timedelta(days=days_offset)
        
        # Random description
        description = np.random.choice(descriptions)
        
        # Random amount (mix of debits and credits)
        if np.random.random() < 0.8:  # 80% debits
            amount = -np.random.exponential(50)  # Negative for expenses
        else:  # 20% credits
            amount = np.random.exponential(200)   # Positive for income
        
        data.append({
            'date': transaction_date,
            'amount': round(amount, 2),
            'description': description
        })
    
    return pd.DataFrame(data)

# Example usage and testing
if __name__ == "__main__":
    # Create sample data
    sample_df = create_sample_transactions(500)
    print(f"Created {len(sample_df)} sample transactions")
    
    # Initialize pipeline
    config = PreprocessingConfig(
        max_tfidf_features=100,  # Smaller for demo
        min_df=1,
        max_df=0.9
    )
    
    pipeline = TransactionPreprocessingPipeline(config)
    
    # Process data
    try:
        features, processed_df, report = pipeline.fit_transform(sample_df)
        
        print(f"\nProcessing Results:")
        print(f"Original shape: {report['original_shape']}")
        print(f"Final shape: {report['final_shape']}")
        print(f"Feature shape: {report['feature_shape']}")
        print(f"Processing time: {report['processing_time']:.2f} seconds")
        
        # Feature analysis
        analysis = pipeline.get_feature_analysis(features)
        print(f"\nFeature Analysis:")
        print(f"Total features: {analysis['n_features']}")
        print(f"Top TF-IDF features: {len(analysis['top_tfidf_features'])}")
        
    except Exception as e:
        print(f"Error during processing: {e}")