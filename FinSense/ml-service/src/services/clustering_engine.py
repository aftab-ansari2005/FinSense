"""
Transaction Clustering Engine

This service implements clustering algorithms for automatic transaction categorization.
It uses KMeans and DBSCAN algorithms to group similar transactions and assigns
meaningful category labels with confidence scores.
"""

import logging
import numpy as np
import pandas as pd
from datetime import datetime
from typing import List, Dict, Tuple, Optional, Any, Union
from dataclasses import dataclass
from sklearn.cluster import KMeans, DBSCAN
from sklearn.metrics import silhouette_score, calinski_harabasz_score
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from collections import Counter
import joblib
import re

try:
    from .feature_extraction import TransactionFeatureExtractor
    from ..utils.preprocessing_pipeline import TransactionPreprocessingPipeline
    from .user_feedback_learning import UserFeedbackLearningService, UserCorrection
except ImportError:
    # Fallback for direct execution
    try:
        from services.feature_extraction import TransactionFeatureExtractor
        from utils.preprocessing_pipeline import TransactionPreprocessingPipeline
        from services.user_feedback_learning import UserFeedbackLearningService, UserCorrection
    except ImportError:
        # If preprocessing pipeline is not available, we'll handle it later
        from services.feature_extraction import TransactionFeatureExtractor
        from services.user_feedback_learning import UserFeedbackLearningService, UserCorrection
        TransactionPreprocessingPipeline = None

logger = logging.getLogger(__name__)

@dataclass
class ClusteringConfig:
    """Configuration for clustering algorithms"""
    # KMeans parameters
    kmeans_n_clusters: int = 15
    kmeans_random_state: int = 42
    kmeans_max_iter: int = 300
    kmeans_n_init: int = 10
    
    # DBSCAN parameters
    dbscan_eps: float = 0.5
    dbscan_min_samples: int = 5
    dbscan_metric: str = 'euclidean'
    
    # General parameters
    use_pca: bool = True
    pca_components: int = 50
    confidence_threshold: float = 0.6
    min_cluster_size: int = 3
    
    # Category assignment
    default_categories: List[str] = None
    
    def __post_init__(self):
        if self.default_categories is None:
            self.default_categories = [
                'Groceries', 'Gas & Fuel', 'Restaurants', 'Retail Shopping',
                'Banking & Finance', 'Utilities', 'Transportation', 'Entertainment',
                'Healthcare', 'Subscriptions', 'Income', 'Transfers', 'Other'
            ]

class TransactionClusteringEngine:
    """
    Main clustering engine for transaction categorization
    """
    
    def __init__(self, config: ClusteringConfig = None):
        """
        Initialize the clustering engine
        
        Args:
            config: Configuration for clustering
        """
        self.config = config or ClusteringConfig()
        
        # Clustering models
        self.kmeans_model = None
        self.dbscan_model = None
        self.pca_model = None
        self.scaler = None
        
        # Category mapping
        self.cluster_categories = {}
        self.category_confidence = {}
        
        # Training data statistics
        self.training_stats = {}
        self.is_fitted = False
        
        # User feedback learning
        self.feedback_learning_service = UserFeedbackLearningService()
        
    def _prepare_features(self, features: np.ndarray) -> np.ndarray:
        """
        Prepare features for clustering (scaling and dimensionality reduction)
        
        Args:
            features: Input feature matrix
            
        Returns:
            Prepared feature matrix
        """
        # Scale features
        if not self.is_fitted:
            self.scaler = StandardScaler()
            scaled_features = self.scaler.fit_transform(features)
        else:
            scaled_features = self.scaler.transform(features)
        
        # Apply PCA if configured
        if self.config.use_pca:
            n_components = min(self.config.pca_components, scaled_features.shape[1], scaled_features.shape[0])
            
            if not self.is_fitted:
                self.pca_model = PCA(n_components=n_components, random_state=self.config.kmeans_random_state)
                prepared_features = self.pca_model.fit_transform(scaled_features)
            else:
                prepared_features = self.pca_model.transform(scaled_features)
        else:
            prepared_features = scaled_features
        
        return prepared_features
    
    def _fit_kmeans(self, features: np.ndarray) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Fit KMeans clustering model
        
        Args:
            features: Prepared feature matrix
            
        Returns:
            Tuple of (cluster_labels, metrics)
        """
        # Determine optimal number of clusters if not specified
        n_clusters = min(self.config.kmeans_n_clusters, len(features) // 2)
        n_clusters = max(2, n_clusters)  # At least 2 clusters
        
        # Fit KMeans
        self.kmeans_model = KMeans(
            n_clusters=n_clusters,
            random_state=self.config.kmeans_random_state,
            max_iter=self.config.kmeans_max_iter,
            n_init=self.config.kmeans_n_init
        )
        
        kmeans_labels = self.kmeans_model.fit_predict(features)
        
        # Calculate metrics
        metrics = {}
        if len(np.unique(kmeans_labels)) > 1:
            metrics['silhouette_score'] = silhouette_score(features, kmeans_labels)
            metrics['calinski_harabasz_score'] = calinski_harabasz_score(features, kmeans_labels)
        
        metrics['n_clusters'] = len(np.unique(kmeans_labels))
        metrics['inertia'] = self.kmeans_model.inertia_
        
        logger.info(f"KMeans clustering: {metrics['n_clusters']} clusters, "
                   f"silhouette score: {metrics.get('silhouette_score', 'N/A')}")
        
        return kmeans_labels, metrics
    
    def _fit_dbscan(self, features: np.ndarray) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Fit DBSCAN clustering model
        
        Args:
            features: Prepared feature matrix
            
        Returns:
            Tuple of (cluster_labels, metrics)
        """
        self.dbscan_model = DBSCAN(
            eps=self.config.dbscan_eps,
            min_samples=self.config.dbscan_min_samples,
            metric=self.config.dbscan_metric
        )
        
        dbscan_labels = self.dbscan_model.fit_predict(features)
        
        # Calculate metrics
        n_clusters = len(set(dbscan_labels)) - (1 if -1 in dbscan_labels else 0)
        n_noise = list(dbscan_labels).count(-1)
        
        metrics = {
            'n_clusters': n_clusters,
            'n_noise': n_noise,
            'noise_ratio': n_noise / len(dbscan_labels) if len(dbscan_labels) > 0 else 0
        }
        
        if n_clusters > 1:
            # Only calculate silhouette score for non-noise points
            non_noise_mask = dbscan_labels != -1
            if np.sum(non_noise_mask) > 1:
                metrics['silhouette_score'] = silhouette_score(
                    features[non_noise_mask], 
                    dbscan_labels[non_noise_mask]
                )
        
        logger.info(f"DBSCAN clustering: {n_clusters} clusters, "
                   f"{n_noise} noise points ({metrics['noise_ratio']:.2%})")
        
        return dbscan_labels, metrics
    
    def _assign_categories_to_clusters(self, 
                                     cluster_labels: np.ndarray, 
                                     transactions_df: pd.DataFrame) -> Dict[int, str]:
        """
        Assign meaningful category names to clusters based on transaction patterns
        
        Args:
            cluster_labels: Cluster assignments
            transactions_df: Original transaction data
            
        Returns:
            Dictionary mapping cluster IDs to category names
        """
        cluster_categories = {}
        
        # Analyze each cluster
        for cluster_id in np.unique(cluster_labels):
            if cluster_id == -1:  # DBSCAN noise
                cluster_categories[cluster_id] = 'Uncategorized'
                continue
            
            # Get transactions in this cluster
            cluster_mask = cluster_labels == cluster_id
            cluster_transactions = transactions_df[cluster_mask]
            
            if len(cluster_transactions) == 0:
                cluster_categories[cluster_id] = 'Other'
                continue
            
            # Analyze cluster characteristics
            category = self._determine_cluster_category(cluster_transactions)
            cluster_categories[cluster_id] = category
        
        return cluster_categories
    
    def _determine_cluster_category(self, cluster_transactions: pd.DataFrame) -> str:
        """
        Determine the most appropriate category for a cluster based on transaction patterns
        
        Args:
            cluster_transactions: Transactions in the cluster
            
        Returns:
            Category name
        """
        descriptions = cluster_transactions['description'].str.lower()
        amounts = cluster_transactions['amount']
        
        # Count occurrences of category keywords
        category_scores = {}
        
        # Define category patterns (more comprehensive than merchant features)
        category_patterns = {
            'Groceries': [
                r'\b(grocery|supermarket|market|food|kroger|walmart|target|costco|safeway)\b',
                r'\b(whole foods|trader joe|publix|aldi|wegmans)\b'
            ],
            'Gas & Fuel': [
                r'\b(gas|fuel|shell|exxon|bp|chevron|mobil|texaco|arco)\b',
                r'\b(station|petroleum|gasoline)\b'
            ],
            'Restaurants': [
                r'\b(restaurant|cafe|coffee|starbucks|mcdonalds|pizza|burger)\b',
                r'\b(dining|food|eat|kitchen|grill|bar|pub)\b'
            ],
            'Retail Shopping': [
                r'\b(store|shop|retail|amazon|ebay|mall|outlet)\b',
                r'\b(clothing|apparel|shoes|electronics|home depot|lowes)\b'
            ],
            'Banking & Finance': [
                r'\b(bank|atm|fee|interest|transfer|deposit|withdrawal)\b',
                r'\b(credit|debit|loan|mortgage|investment)\b'
            ],
            'Utilities': [
                r'\b(electric|electricity|water|gas|phone|internet|cable|utility)\b',
                r'\b(power|energy|telecom|wireless|broadband)\b'
            ],
            'Transportation': [
                r'\b(uber|lyft|taxi|bus|train|airline|flight|parking)\b',
                r'\b(transport|metro|subway|toll|car|auto)\b'
            ],
            'Entertainment': [
                r'\b(movie|theater|netflix|spotify|game|entertainment)\b',
                r'\b(music|video|streaming|concert|show|event)\b'
            ],
            'Healthcare': [
                r'\b(pharmacy|doctor|hospital|medical|health|dental)\b',
                r'\b(clinic|medicine|prescription|insurance|cvs|walgreens)\b'
            ],
            'Subscriptions': [
                r'\b(subscription|monthly|annual|recurring|membership)\b',
                r'\b(netflix|spotify|amazon prime|gym|magazine)\b'
            ],
            'Income': [
                r'\b(salary|payroll|wage|income|deposit|payment)\b',
                r'\b(direct deposit|paycheck|bonus|refund)\b'
            ],
            'Transfers': [
                r'\b(transfer|venmo|paypal|zelle|cashapp)\b',
                r'\b(p2p|peer|send|receive)\b'
            ]
        }
        
        # Score each category
        for category, patterns in category_patterns.items():
            score = 0
            for pattern in patterns:
                matches = descriptions.str.contains(pattern, regex=True, na=False).sum()
                score += matches
            
            if score > 0:
                category_scores[category] = score / len(cluster_transactions)
        
        # Consider amount patterns
        avg_amount = amounts.mean()
        amount_std = amounts.std()
        
        # Income typically has positive amounts
        if avg_amount > 0 and avg_amount > 500:
            category_scores['Income'] = category_scores.get('Income', 0) + 0.3
        
        # Small amounts might be subscriptions or fees
        if avg_amount < 0 and abs(avg_amount) < 50 and amount_std < 20:
            category_scores['Subscriptions'] = category_scores.get('Subscriptions', 0) + 0.2
            category_scores['Banking & Finance'] = category_scores.get('Banking & Finance', 0) + 0.1
        
        # Large negative amounts might be rent, utilities, or major purchases
        if avg_amount < -200:
            category_scores['Utilities'] = category_scores.get('Utilities', 0) + 0.1
            category_scores['Retail Shopping'] = category_scores.get('Retail Shopping', 0) + 0.1
        
        # Return category with highest score
        if category_scores:
            best_category = max(category_scores.items(), key=lambda x: x[1])[0]
            return best_category
        
        return 'Other'
    
    def _calculate_confidence_scores(self, 
                                   cluster_labels: np.ndarray, 
                                   features: np.ndarray,
                                   transactions_df: pd.DataFrame) -> np.ndarray:
        """
        Calculate confidence scores for cluster assignments
        
        Args:
            cluster_labels: Cluster assignments
            features: Feature matrix
            transactions_df: Original transaction data
            
        Returns:
            Array of confidence scores
        """
        confidence_scores = np.zeros(len(cluster_labels))
        
        for cluster_id in np.unique(cluster_labels):
            cluster_mask = cluster_labels == cluster_id
            cluster_features = features[cluster_mask]
            
            if len(cluster_features) < 2:
                # Single transaction clusters get low confidence
                confidence_scores[cluster_mask] = 0.3
                continue
            
            # Calculate intra-cluster distances
            cluster_center = np.mean(cluster_features, axis=0)
            distances = np.linalg.norm(cluster_features - cluster_center, axis=1)
            
            # Normalize distances to confidence scores (closer = higher confidence)
            max_distance = np.max(distances) if np.max(distances) > 0 else 1
            cluster_confidences = 1 - (distances / max_distance)
            
            # Adjust confidence based on cluster size
            cluster_size = len(cluster_features)
            size_bonus = min(0.2, cluster_size / 50)  # Larger clusters get slight bonus
            cluster_confidences += size_bonus
            
            # Adjust confidence based on category clarity
            if cluster_id in self.cluster_categories:
                category = self.cluster_categories[cluster_id]
                if category not in ['Other', 'Uncategorized']:
                    cluster_confidences += 0.1  # Clear categories get bonus
            
            # Ensure confidence is in [0, 1] range
            cluster_confidences = np.clip(cluster_confidences, 0, 1)
            
            confidence_scores[cluster_mask] = cluster_confidences
        
        return confidence_scores
    
    def fit(self, 
            features: np.ndarray, 
            transactions_df: pd.DataFrame,
            algorithm: str = 'kmeans') -> Dict[str, Any]:
        """
        Fit the clustering model on transaction data
        
        Args:
            features: Feature matrix from feature extraction
            transactions_df: Original transaction data
            algorithm: Clustering algorithm ('kmeans' or 'dbscan')
            
        Returns:
            Training results and metrics
        """
        logger.info(f"Training clustering model with {algorithm} on {len(features)} transactions")
        
        # Prepare features
        prepared_features = self._prepare_features(features)
        
        # Fit clustering algorithm
        if algorithm.lower() == 'kmeans':
            cluster_labels, metrics = self._fit_kmeans(prepared_features)
        elif algorithm.lower() == 'dbscan':
            cluster_labels, metrics = self._fit_dbscan(prepared_features)
        else:
            raise ValueError(f"Unsupported algorithm: {algorithm}")
        
        # Assign categories to clusters
        self.cluster_categories = self._assign_categories_to_clusters(cluster_labels, transactions_df)
        
        # Calculate confidence scores
        confidence_scores = self._calculate_confidence_scores(
            cluster_labels, prepared_features, transactions_df
        )
        
        # Store training statistics
        self.training_stats = {
            'algorithm': algorithm,
            'n_transactions': len(features),
            'n_features': features.shape[1],
            'n_prepared_features': prepared_features.shape[1],
            'metrics': metrics,
            'cluster_distribution': dict(Counter(cluster_labels)),
            'category_distribution': dict(Counter(self.cluster_categories.values())),
            'avg_confidence': float(np.mean(confidence_scores)),
            'low_confidence_ratio': float(np.mean(confidence_scores < self.config.confidence_threshold))
        }
        
        self.is_fitted = True
        
        logger.info(f"Clustering complete: {metrics.get('n_clusters', 'N/A')} clusters, "
                   f"avg confidence: {self.training_stats['avg_confidence']:.3f}")
        
        return {
            'cluster_labels': cluster_labels,
            'confidence_scores': confidence_scores,
            'categories': [self.cluster_categories.get(label, 'Other') for label in cluster_labels],
            'training_stats': self.training_stats
        }
    
    def predict(self, features: np.ndarray, user_id: str = None, transactions_df: pd.DataFrame = None) -> Dict[str, Any]:
        """
        Predict clusters and categories for new transactions
        
        Args:
            features: Feature matrix for new transactions
            user_id: User ID for personalized learning (optional)
            transactions_df: Original transaction data for learning (optional)
            
        Returns:
            Prediction results
        """
        if not self.is_fitted:
            raise ValueError("Clustering model must be fitted before prediction")
        
        # Prepare features
        prepared_features = self._prepare_features(features)
        
        # Predict clusters
        if self.kmeans_model is not None:
            cluster_labels = self.kmeans_model.predict(prepared_features)
        elif self.dbscan_model is not None:
            # DBSCAN doesn't have predict method, use fit_predict on combined data
            # For now, assign to nearest cluster center (simplified approach)
            cluster_labels = np.full(len(prepared_features), -1)  # Default to noise
            logger.warning("DBSCAN prediction not fully implemented, using default assignments")
        else:
            raise ValueError("No fitted clustering model found")
        
        # Assign categories
        categories = [self.cluster_categories.get(label, 'Other') for label in cluster_labels]
        
        # Calculate confidence scores
        confidence_scores = self._calculate_confidence_scores(
            cluster_labels, prepared_features, None
        )
        
        # Prepare initial predictions
        initial_predictions = [
            {
                'category': categories[i],
                'confidence': float(confidence_scores[i]),
                'cluster_id': int(cluster_labels[i])
            }
            for i in range(len(cluster_labels))
        ]
        
        # Apply learned patterns if user_id and transactions_df are provided
        if user_id and transactions_df is not None:
            improved_predictions = self.feedback_learning_service.apply_learned_patterns(
                transactions_df, user_id, initial_predictions
            )
        else:
            improved_predictions = initial_predictions
        
        return {
            'cluster_labels': cluster_labels,
            'categories': [pred['category'] for pred in improved_predictions],
            'confidence_scores': np.array([pred['confidence'] for pred in improved_predictions]),
            'flags': [
                'low_confidence' if pred['confidence'] < self.config.confidence_threshold else 'confident'
                for pred in improved_predictions
            ],
            'learned_from_user': [pred.get('learned_from_user', False) for pred in improved_predictions],
            'learning_patterns': [pred.get('learning_pattern') for pred in improved_predictions]
        }
    
    def add_user_correction(self, correction: UserCorrection) -> Dict[str, Any]:
        """
        Add a user correction to improve future categorization
        
        Args:
            correction: User correction data
            
        Returns:
            Learning results
        """
        return self.feedback_learning_service.add_user_correction(correction)
    
    def get_user_learning_stats(self, user_id: str) -> Dict[str, Any]:
        """
        Get learning statistics for a specific user
        
        Args:
            user_id: User ID
            
        Returns:
            User-specific learning statistics
        """
        return self.feedback_learning_service.get_user_learning_stats(user_id)
    
    def get_global_learning_stats(self) -> Dict[str, Any]:
        """
        Get global learning statistics across all users
        
        Returns:
            Global learning statistics
        """
        return self.feedback_learning_service.get_global_learning_stats()
    
    def export_learned_patterns(self, user_id: str = None) -> Dict[str, Any]:
        """
        Export learned patterns for analysis or backup
        
        Args:
            user_id: Specific user ID, or None for all users
            
        Returns:
            Exported patterns data
        """
        return self.feedback_learning_service.export_learned_patterns(user_id)
    
    def import_learned_patterns(self, patterns_data: Dict[str, Any]) -> bool:
        """
        Import learned patterns from exported data
        
        Args:
            patterns_data: Exported patterns data
            
        Returns:
            Success status
        """
        return self.feedback_learning_service.import_learned_patterns(patterns_data)
    
    def get_cluster_analysis(self) -> Dict[str, Any]:
        """
        Get detailed analysis of the clustering results
        
        Returns:
            Cluster analysis dictionary
        """
        if not self.is_fitted:
            raise ValueError("Model must be fitted before analysis")
        
        analysis = {
            'training_stats': self.training_stats,
            'cluster_categories': self.cluster_categories,
            'category_summary': {},
            'recommendations': []
        }
        
        # Analyze category distribution
        category_counts = Counter(self.cluster_categories.values())
        total_clusters = len(self.cluster_categories)
        
        for category, count in category_counts.items():
            analysis['category_summary'][category] = {
                'cluster_count': count,
                'percentage': count / total_clusters * 100 if total_clusters > 0 else 0
            }
        
        # Generate recommendations
        if self.training_stats['low_confidence_ratio'] > 0.3:
            analysis['recommendations'].append(
                "High ratio of low-confidence predictions. Consider adjusting clustering parameters."
            )
        
        if len(category_counts) < 5:
            analysis['recommendations'].append(
                "Few categories detected. Consider increasing number of clusters or improving feature extraction."
            )
        
        if category_counts.get('Other', 0) > total_clusters * 0.3:
            analysis['recommendations'].append(
                "Many transactions categorized as 'Other'. Consider adding more category patterns."
            )
        
        return analysis
    
    def save_model(self, filepath: str) -> None:
        """
        Save the fitted clustering model
        
        Args:
            filepath: Path to save the model
        """
        if not self.is_fitted:
            raise ValueError("Model must be fitted before saving")
        
        model_data = {
            'config': self.config,
            'kmeans_model': self.kmeans_model,
            'dbscan_model': self.dbscan_model,
            'pca_model': self.pca_model,
            'scaler': self.scaler,
            'cluster_categories': self.cluster_categories,
            'training_stats': self.training_stats,
            'is_fitted': self.is_fitted,
            'feedback_learning_service': self.feedback_learning_service
        }
        
        joblib.dump(model_data, filepath)
        logger.info(f"Clustering model saved to {filepath}")
    
    @classmethod
    def load_model(cls, filepath: str) -> 'TransactionClusteringEngine':
        """
        Load a fitted clustering model
        
        Args:
            filepath: Path to load the model from
            
        Returns:
            Loaded clustering engine
        """
        model_data = joblib.load(filepath)
        
        # Create new instance
        engine = cls(config=model_data['config'])
        
        # Restore fitted components
        engine.kmeans_model = model_data['kmeans_model']
        engine.dbscan_model = model_data['dbscan_model']
        engine.pca_model = model_data['pca_model']
        engine.scaler = model_data['scaler']
        engine.cluster_categories = model_data['cluster_categories']
        engine.training_stats = model_data['training_stats']
        engine.is_fitted = model_data['is_fitted']
        
        # Restore feedback learning service if available
        if 'feedback_learning_service' in model_data:
            engine.feedback_learning_service = model_data['feedback_learning_service']
        else:
            engine.feedback_learning_service = UserFeedbackLearningService()
        
        logger.info(f"Clustering model loaded from {filepath}")
        return engine

def optimize_clustering_parameters(features: np.ndarray, 
                                 transactions_df: pd.DataFrame,
                                 n_clusters_range: Tuple[int, int] = (5, 20)) -> Dict[str, Any]:
    """
    Optimize clustering parameters using various metrics
    
    Args:
        features: Feature matrix
        transactions_df: Transaction data
        n_clusters_range: Range of cluster numbers to test
        
    Returns:
        Optimization results
    """
    logger.info("Optimizing clustering parameters...")
    
    results = {
        'kmeans_scores': [],
        'best_kmeans_params': None,
        'best_kmeans_score': -1
    }
    
    # Test different numbers of clusters for KMeans
    for n_clusters in range(n_clusters_range[0], min(n_clusters_range[1] + 1, len(features) // 2)):
        try:
            config = ClusteringConfig(kmeans_n_clusters=n_clusters)
            engine = TransactionClusteringEngine(config)
            
            # Prepare features
            prepared_features = engine._prepare_features(features)
            
            # Fit KMeans
            cluster_labels, metrics = engine._fit_kmeans(prepared_features)
            
            # Store results
            score_data = {
                'n_clusters': n_clusters,
                'silhouette_score': metrics.get('silhouette_score', 0),
                'calinski_harabasz_score': metrics.get('calinski_harabasz_score', 0),
                'inertia': metrics.get('inertia', float('inf'))
            }
            
            results['kmeans_scores'].append(score_data)
            
            # Update best parameters (using silhouette score as primary metric)
            if score_data['silhouette_score'] > results['best_kmeans_score']:
                results['best_kmeans_score'] = score_data['silhouette_score']
                results['best_kmeans_params'] = {'n_clusters': n_clusters}
            
        except Exception as e:
            logger.warning(f"Failed to test n_clusters={n_clusters}: {str(e)}")
    
    logger.info(f"Parameter optimization complete. Best KMeans: {results['best_kmeans_params']}")
    
    return results