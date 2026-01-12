"""
Transaction Feature Extraction Service

This service handles feature extraction from transaction data for clustering and categorization.
It implements TF-IDF vectorization for transaction descriptions and various numerical features
for amount and date-based patterns.
"""

import re
import logging
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional, Any
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.decomposition import PCA
import joblib

logger = logging.getLogger(__name__)

class TransactionFeatureExtractor:
    """
    Extracts features from transaction data for ML processing
    """
    
    def __init__(self, 
                 max_features: int = 1000,
                 min_df: int = 2,
                 max_df: float = 0.95,
                 ngram_range: Tuple[int, int] = (1, 2)):
        """
        Initialize the feature extractor
        
        Args:
            max_features: Maximum number of TF-IDF features
            min_df: Minimum document frequency for TF-IDF
            max_df: Maximum document frequency for TF-IDF
            ngram_range: N-gram range for TF-IDF
        """
        self.max_features = max_features
        self.min_df = min_df
        self.max_df = max_df
        self.ngram_range = ngram_range
        
        # Initialize components
        self.tfidf_vectorizer = None
        self.amount_scaler = None
        self.date_scaler = None
        self.is_fitted = False
        
        # Feature names for interpretability
        self.feature_names = []
        
    def preprocess_description(self, description: str) -> str:
        """
        Preprocess transaction description for TF-IDF
        
        Args:
            description: Raw transaction description
            
        Returns:
            Cleaned description
        """
        if not isinstance(description, str):
            return ""
        
        # Convert to lowercase
        text = description.lower()
        
        # Remove common patterns that don't add value
        # Remove card numbers, reference numbers, etc.
        text = re.sub(r'\b\d{4,}\b', '', text)  # Remove long numbers
        text = re.sub(r'\b[a-z0-9]{8,}\b', '', text)  # Remove long alphanumeric codes
        
        # Remove special characters but keep spaces
        text = re.sub(r'[^\w\s]', ' ', text)
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Remove common stop words specific to transactions
        stop_words = {
            'transaction', 'payment', 'purchase', 'debit', 'credit',
            'card', 'pos', 'atm', 'withdrawal', 'deposit', 'transfer',
            'fee', 'charge', 'ref', 'reference', 'auth', 'authorization'
        }
        
        words = text.split()
        words = [word for word in words if word not in stop_words and len(word) > 2]
        
        return ' '.join(words)
    
    def extract_description_features(self, descriptions: List[str]) -> np.ndarray:
        """
        Extract TF-IDF features from transaction descriptions
        
        Args:
            descriptions: List of transaction descriptions
            
        Returns:
            TF-IDF feature matrix
        """
        # Preprocess descriptions
        cleaned_descriptions = [self.preprocess_description(desc) for desc in descriptions]
        
        # Filter out empty descriptions
        non_empty_descriptions = [desc for desc in cleaned_descriptions if desc.strip()]
        
        if not non_empty_descriptions:
            logger.warning("No valid descriptions found for TF-IDF extraction")
            return np.zeros((len(descriptions), self.max_features))
        
        if not self.is_fitted:
            # Initialize and fit TF-IDF vectorizer
            self.tfidf_vectorizer = TfidfVectorizer(
                max_features=self.max_features,
                min_df=self.min_df,
                max_df=self.max_df,
                ngram_range=self.ngram_range,
                stop_words='english'
            )
            
            # Fit on non-empty descriptions
            self.tfidf_vectorizer.fit(non_empty_descriptions)
            
            # Store feature names
            tfidf_features = [f"tfidf_{name}" for name in self.tfidf_vectorizer.get_feature_names_out()]
            self.feature_names.extend(tfidf_features)
        
        # Transform all descriptions (empty ones will be zero vectors)
        tfidf_matrix = self.tfidf_vectorizer.transform(cleaned_descriptions)
        
        return tfidf_matrix.toarray()
    
    def extract_amount_features(self, amounts: List[float]) -> np.ndarray:
        """
        Extract features from transaction amounts
        
        Args:
            amounts: List of transaction amounts
            
        Returns:
            Amount-based feature matrix
        """
        amounts_array = np.array(amounts).reshape(-1, 1)
        
        # Basic amount features
        features = []
        
        # 1. Raw amount (will be scaled)
        features.append(amounts_array.flatten())
        
        # 2. Absolute amount
        features.append(np.abs(amounts_array.flatten()))
        
        # 3. Log of absolute amount (to handle wide range)
        log_amounts = np.log1p(np.abs(amounts_array.flatten()))
        features.append(log_amounts)
        
        # 4. Amount bins (categorical encoding of amount ranges)
        amount_bins = self._create_amount_bins(amounts_array.flatten())
        features.append(amount_bins)
        
        # 5. Sign of amount (income vs expense)
        amount_signs = np.sign(amounts_array.flatten())
        features.append(amount_signs)
        
        # Stack features
        amount_features = np.column_stack(features)
        
        if not self.is_fitted:
            # Fit scaler on amount features
            self.amount_scaler = StandardScaler()
            self.amount_scaler.fit(amount_features)
            
            # Add feature names
            amount_feature_names = [
                'amount_raw', 'amount_abs', 'amount_log', 
                'amount_bin', 'amount_sign'
            ]
            self.feature_names.extend(amount_feature_names)
        
        # Scale features
        scaled_features = self.amount_scaler.transform(amount_features)
        
        return scaled_features
    
    def extract_date_features(self, dates: List[datetime]) -> np.ndarray:
        """
        Extract features from transaction dates
        
        Args:
            dates: List of transaction dates
            
        Returns:
            Date-based feature matrix
        """
        features = []
        
        for date in dates:
            if not isinstance(date, datetime):
                # Try to parse if it's a string
                if isinstance(date, str):
                    try:
                        date = pd.to_datetime(date)
                    except:
                        date = datetime.now()  # Fallback
                else:
                    date = datetime.now()  # Fallback
            
            # Extract various date features
            date_features = [
                date.weekday(),  # Day of week (0=Monday, 6=Sunday)
                date.day,        # Day of month
                date.month,      # Month
                date.hour if hasattr(date, 'hour') else 12,  # Hour of day
                1 if date.weekday() >= 5 else 0,  # Is weekend
                1 if date.month in [12, 1, 2] else 0,  # Is winter
                1 if date.month in [6, 7, 8] else 0,   # Is summer
                1 if date.day <= 7 else 0,  # Is beginning of month
                1 if date.day >= 25 else 0, # Is end of month
            ]
            
            features.append(date_features)
        
        date_features_array = np.array(features)
        
        if not self.is_fitted:
            # Fit scaler on date features
            self.date_scaler = StandardScaler()
            self.date_scaler.fit(date_features_array)
            
            # Add feature names
            date_feature_names = [
                'day_of_week', 'day_of_month', 'month', 'hour',
                'is_weekend', 'is_winter', 'is_summer', 
                'is_month_start', 'is_month_end'
            ]
            self.feature_names.extend(date_feature_names)
        
        # Scale features
        scaled_features = self.date_scaler.transform(date_features_array)
        
        return scaled_features
    
    def _create_amount_bins(self, amounts: np.ndarray) -> np.ndarray:
        """
        Create categorical bins for transaction amounts
        
        Args:
            amounts: Array of transaction amounts
            
        Returns:
            Array of bin indices
        """
        abs_amounts = np.abs(amounts)
        
        # Define amount bins (can be customized based on domain knowledge)
        bins = [0, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, np.inf]
        bin_indices = np.digitize(abs_amounts, bins) - 1
        
        return bin_indices
    
    def extract_merchant_features(self, descriptions: List[str]) -> np.ndarray:
        """
        Extract merchant-specific features from descriptions
        
        Args:
            descriptions: List of transaction descriptions
            
        Returns:
            Merchant-based feature matrix
        """
        features = []
        
        # Common merchant patterns
        merchant_patterns = {
            'grocery': r'\b(grocery|supermarket|market|food|kroger|walmart|target)\b',
            'gas': r'\b(gas|fuel|shell|exxon|bp|chevron|mobil)\b',
            'restaurant': r'\b(restaurant|cafe|coffee|starbucks|mcdonalds|pizza)\b',
            'retail': r'\b(store|shop|retail|amazon|ebay|mall)\b',
            'bank': r'\b(bank|atm|fee|interest|transfer)\b',
            'utility': r'\b(electric|water|gas|phone|internet|cable)\b',
            'transport': r'\b(uber|lyft|taxi|bus|train|airline|parking)\b',
            'entertainment': r'\b(movie|theater|netflix|spotify|game)\b',
            'health': r'\b(pharmacy|doctor|hospital|medical|health)\b',
            'subscription': r'\b(subscription|monthly|annual|recurring)\b'
        }
        
        for description in descriptions:
            desc_lower = description.lower() if isinstance(description, str) else ""
            
            merchant_features = []
            for category, pattern in merchant_patterns.items():
                match = 1 if re.search(pattern, desc_lower) else 0
                merchant_features.append(match)
            
            features.append(merchant_features)
        
        merchant_features_array = np.array(features)
        
        if not self.is_fitted:
            # Add feature names
            merchant_feature_names = [f"merchant_{cat}" for cat in merchant_patterns.keys()]
            self.feature_names.extend(merchant_feature_names)
        
        return merchant_features_array
    
    def fit_transform(self, transactions_df: pd.DataFrame) -> np.ndarray:
        """
        Fit the feature extractor and transform transaction data
        
        Args:
            transactions_df: DataFrame with transaction data
            
        Returns:
            Combined feature matrix
        """
        self.is_fitted = False  # Reset fitting status
        self.feature_names = []  # Reset feature names
        
        # Extract individual feature types
        tfidf_features = self.extract_description_features(
            transactions_df['description'].tolist()
        )
        
        amount_features = self.extract_amount_features(
            transactions_df['amount'].tolist()
        )
        
        date_features = self.extract_date_features(
            transactions_df['date'].tolist()
        )
        
        merchant_features = self.extract_merchant_features(
            transactions_df['description'].tolist()
        )
        
        # Combine all features
        combined_features = np.hstack([
            tfidf_features,
            amount_features,
            date_features,
            merchant_features
        ])
        
        self.is_fitted = True
        
        logger.info(f"Extracted {combined_features.shape[1]} features from {len(transactions_df)} transactions")
        
        return combined_features
    
    def transform(self, transactions_df: pd.DataFrame) -> np.ndarray:
        """
        Transform transaction data using fitted extractors
        
        Args:
            transactions_df: DataFrame with transaction data
            
        Returns:
            Combined feature matrix
        """
        if not self.is_fitted:
            raise ValueError("Feature extractor must be fitted before transform")
        
        # Extract individual feature types
        tfidf_features = self.extract_description_features(
            transactions_df['description'].tolist()
        )
        
        amount_features = self.extract_amount_features(
            transactions_df['amount'].tolist()
        )
        
        date_features = self.extract_date_features(
            transactions_df['date'].tolist()
        )
        
        merchant_features = self.extract_merchant_features(
            transactions_df['description'].tolist()
        )
        
        # Combine all features
        combined_features = np.hstack([
            tfidf_features,
            amount_features,
            date_features,
            merchant_features
        ])
        
        return combined_features
    
    def get_feature_names(self) -> List[str]:
        """
        Get names of all extracted features
        
        Returns:
            List of feature names
        """
        return self.feature_names.copy()
    
    def save(self, filepath: str) -> None:
        """
        Save the fitted feature extractor
        
        Args:
            filepath: Path to save the extractor
        """
        if not self.is_fitted:
            raise ValueError("Feature extractor must be fitted before saving")
        
        extractor_data = {
            'tfidf_vectorizer': self.tfidf_vectorizer,
            'amount_scaler': self.amount_scaler,
            'date_scaler': self.date_scaler,
            'feature_names': self.feature_names,
            'max_features': self.max_features,
            'min_df': self.min_df,
            'max_df': self.max_df,
            'ngram_range': self.ngram_range,
            'is_fitted': self.is_fitted
        }
        
        joblib.dump(extractor_data, filepath)
        logger.info(f"Feature extractor saved to {filepath}")
    
    @classmethod
    def load(cls, filepath: str) -> 'TransactionFeatureExtractor':
        """
        Load a fitted feature extractor
        
        Args:
            filepath: Path to load the extractor from
            
        Returns:
            Loaded feature extractor
        """
        extractor_data = joblib.load(filepath)
        
        # Create new instance
        extractor = cls(
            max_features=extractor_data['max_features'],
            min_df=extractor_data['min_df'],
            max_df=extractor_data['max_df'],
            ngram_range=extractor_data['ngram_range']
        )
        
        # Restore fitted components
        extractor.tfidf_vectorizer = extractor_data['tfidf_vectorizer']
        extractor.amount_scaler = extractor_data['amount_scaler']
        extractor.date_scaler = extractor_data['date_scaler']
        extractor.feature_names = extractor_data['feature_names']
        extractor.is_fitted = extractor_data['is_fitted']
        
        logger.info(f"Feature extractor loaded from {filepath}")
        return extractor
    
    def get_feature_importance_analysis(self, 
                                      features: np.ndarray, 
                                      labels: np.ndarray = None) -> Dict[str, Any]:
        """
        Analyze feature importance and provide insights
        
        Args:
            features: Feature matrix
            labels: Optional labels for supervised analysis
            
        Returns:
            Dictionary with feature analysis
        """
        analysis = {
            'n_features': features.shape[1],
            'n_samples': features.shape[0],
            'feature_stats': {},
            'top_tfidf_features': [],
            'feature_correlations': {}
        }
        
        # Basic feature statistics
        for i, name in enumerate(self.feature_names):
            if i < features.shape[1]:
                feature_col = features[:, i]
                analysis['feature_stats'][name] = {
                    'mean': float(np.mean(feature_col)),
                    'std': float(np.std(feature_col)),
                    'min': float(np.min(feature_col)),
                    'max': float(np.max(feature_col)),
                    'non_zero_ratio': float(np.count_nonzero(feature_col) / len(feature_col))
                }
        
        # TF-IDF feature analysis
        if self.tfidf_vectorizer:
            tfidf_feature_names = self.tfidf_vectorizer.get_feature_names_out()
            tfidf_scores = np.mean(features[:, :len(tfidf_feature_names)], axis=0)
            
            # Get top TF-IDF features
            top_indices = np.argsort(tfidf_scores)[-20:][::-1]
            analysis['top_tfidf_features'] = [
                {
                    'feature': tfidf_feature_names[i],
                    'score': float(tfidf_scores[i])
                }
                for i in top_indices
            ]
        
        return analysis