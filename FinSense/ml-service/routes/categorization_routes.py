"""
Transaction categorization routes for FinSense ML Service

Handles transaction categorization, feature extraction, and clustering analysis.
"""

import logging
import os
import pandas as pd
from datetime import datetime
from flask import Blueprint, request, jsonify

from schemas import CategorizeRequestSchema
from src.utils.decorators import validate_json, log_request


logger = logging.getLogger(__name__)

# Create blueprint
categorization_bp = Blueprint('categorization', __name__, url_prefix='/ml')


@categorization_bp.route('/categorize', methods=['POST'])
@validate_json(CategorizeRequestSchema)
@log_request
def categorize_transactions():
    """Categorize transactions using feature extraction and clustering"""
    try:
        from routes.learning_routes import get_global_feedback_service
        
        data = request.validated_data
        transactions = data['transactions']
        user_id = data['user_id']
        model_version = data.get('model_version')
        
        # Get global feedback service
        global_feedback_service = get_global_feedback_service()
        
        # Convert transactions to DataFrame
        transactions_df = pd.DataFrame([
            {
                'date': pd.to_datetime(t['date']),
                'amount': t['amount'],
                'description': t['description']
            }
            for t in transactions
        ])
        
        logger.info(f"Processing {len(transactions_df)} transactions for user {user_id}")
        
        # Import required modules
        from src.utils.preprocessing_pipeline import TransactionPreprocessingPipeline, PreprocessingConfig
        from src.services.clustering_engine import TransactionClusteringEngine, ClusteringConfig
        
        # Initialize preprocessing pipeline
        preprocessing_config = PreprocessingConfig(
            max_tfidf_features=500,
            min_df=1,
            max_df=0.95
        )
        pipeline = TransactionPreprocessingPipeline(preprocessing_config)
        
        # Extract features
        features, processed_df, processing_report = pipeline.fit_transform(transactions_df)
        
        # Initialize clustering engine with global feedback service
        clustering_config = ClusteringConfig(
            kmeans_n_clusters=min(15, max(3, len(processed_df) // 3)),  # Adaptive cluster count
            confidence_threshold=0.6
        )
        clustering_engine = TransactionClusteringEngine(clustering_config)
        
        # Set the global feedback learning service
        clustering_engine.feedback_learning_service = global_feedback_service
        
        # Perform clustering
        clustering_results = clustering_engine.fit(features, processed_df, algorithm='kmeans')
        
        # Prepare results
        results = []
        for i, (_, row) in enumerate(processed_df.iterrows()):
            original_idx = i if i < len(transactions) else 0  # Safety check
            
            results.append({
                'transaction_id': transactions[original_idx]['id'],
                'category': clustering_results['categories'][i],
                'confidence': float(clustering_results['confidence_scores'][i]),
                'cluster_id': int(clustering_results['cluster_labels'][i]),
                'needs_review': clustering_results['confidence_scores'][i] < clustering_config.confidence_threshold,
                'description_processed': row['description']
            })
        
        # Apply learned patterns if available for this user
        if user_id:
            # Get predictions with learned patterns applied
            prediction_results = clustering_engine.predict(features, user_id, processed_df)
            
            # Update results with learned patterns
            for i in range(len(results)):
                if i < len(prediction_results['categories']):
                    results[i]['category'] = prediction_results['categories'][i]
                    results[i]['confidence'] = float(prediction_results['confidence_scores'][i])
                    results[i]['learned_from_user'] = prediction_results['learned_from_user'][i]
                    if prediction_results['learning_patterns'][i]:
                        results[i]['learning_pattern'] = prediction_results['learning_patterns'][i]
        
        # Get clustering analysis
        cluster_analysis = clustering_engine.get_cluster_analysis()
        
        return jsonify({
            'results': results,
            'model_version': model_version or os.getenv('MODEL_VERSION', '1.0.0'),
            'processing_time': processing_report['processing_time'],
            'total_processed': len(results),
            'clustering_stats': {
                'algorithm': 'kmeans',
                'n_clusters': clustering_results['training_stats']['metrics']['n_clusters'],
                'avg_confidence': clustering_results['training_stats']['avg_confidence'],
                'low_confidence_count': sum(1 for r in results if r['needs_review']),
                'categories_found': list(set(r['category'] for r in results))
            },
            'feature_extraction': {
                'features_count': features.shape[1],
                'processing_report': processing_report
            },
            'cluster_analysis': cluster_analysis
        }), 200
        
    except Exception as e:
        logger.error(f"Transaction categorization failed: {str(e)}")
        return jsonify({
            'error': 'Categorization failed',
            'details': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500


@categorization_bp.route('/features/extract', methods=['POST'])
@log_request
def extract_features():
    """Extract features from transaction data for analysis"""
    try:
        data = request.get_json() or {}
        transactions = data.get('transactions', [])
        
        if not transactions:
            return jsonify({
                'error': 'No transactions provided',
                'required_fields': ['transactions']
            }), 400
        
        # Convert to DataFrame
        transactions_df = pd.DataFrame([
            {
                'date': pd.to_datetime(t.get('date')),
                'amount': float(t.get('amount', 0)),
                'description': str(t.get('description', ''))
            }
            for t in transactions
        ])
        
        logger.info(f"Extracting features from {len(transactions_df)} transactions")
        
        # Import and use preprocessing pipeline
        from src.utils.preprocessing_pipeline import TransactionPreprocessingPipeline, PreprocessingConfig
        
        config = PreprocessingConfig(
            max_tfidf_features=200,  # Smaller for API response
            min_df=1,
            max_df=0.95
        )
        pipeline = TransactionPreprocessingPipeline(config)
        
        # Extract features
        features, processed_df, processing_report = pipeline.fit_transform(transactions_df)
        
        # Get feature analysis
        analysis = pipeline.get_feature_analysis(features)
        
        return jsonify({
            'success': True,
            'feature_extraction': {
                'n_transactions': len(processed_df),
                'n_features': features.shape[1],
                'processing_time': processing_report['processing_time'],
                'validation_report': processing_report['validation_report']
            },
            'feature_analysis': {
                'total_features': analysis['n_features'],
                'top_tfidf_features': analysis['top_tfidf_features'][:10],  # Top 10 only
                'feature_types': {
                    'tfidf_features': len([name for name in analysis.get('feature_stats', {}).keys() if name.startswith('tfidf_')]),
                    'amount_features': len([name for name in analysis.get('feature_stats', {}).keys() if name.startswith('amount_')]),
                    'date_features': len([name for name in analysis.get('feature_stats', {}).keys() if name.startswith('day_') or name.startswith('month') or name.startswith('is_')]),
                    'merchant_features': len([name for name in analysis.get('feature_stats', {}).keys() if name.startswith('merchant_')])
                }
            },
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Feature extraction failed: {str(e)}")
        return jsonify({
            'error': 'Feature extraction failed',
            'details': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500


@categorization_bp.route('/clustering/analyze', methods=['POST'])
@log_request
def analyze_clustering():
    """Analyze clustering performance and optimize parameters"""
    try:
        data = request.get_json() or {}
        transactions = data.get('transactions', [])
        algorithm = data.get('algorithm', 'kmeans').lower()
        optimize_params = data.get('optimize_parameters', False)
        
        if not transactions:
            return jsonify({
                'error': 'No transactions provided',
                'required_fields': ['transactions']
            }), 400
        
        # Convert to DataFrame
        transactions_df = pd.DataFrame([
            {
                'date': pd.to_datetime(t.get('date')),
                'amount': float(t.get('amount', 0)),
                'description': str(t.get('description', ''))
            }
            for t in transactions
        ])
        
        logger.info(f"Analyzing clustering for {len(transactions_df)} transactions")
        
        # Import required modules
        from src.utils.preprocessing_pipeline import TransactionPreprocessingPipeline, PreprocessingConfig
        from src.services.clustering_engine import TransactionClusteringEngine, ClusteringConfig, optimize_clustering_parameters
        
        # Extract features
        config = PreprocessingConfig(max_tfidf_features=300, min_df=1)
        pipeline = TransactionPreprocessingPipeline(config)
        features, processed_df, processing_report = pipeline.fit_transform(transactions_df)
        
        results = {
            'feature_extraction': {
                'n_features': features.shape[1],
                'processing_time': processing_report['processing_time']
            }
        }
        
        # Parameter optimization if requested
        if optimize_params and len(processed_df) >= 10:
            optimization_results = optimize_clustering_parameters(features, processed_df)
            results['parameter_optimization'] = optimization_results
            
            # Use optimized parameters
            if optimization_results['best_kmeans_params']:
                clustering_config = ClusteringConfig(**optimization_results['best_kmeans_params'])
            else:
                clustering_config = ClusteringConfig()
        else:
            clustering_config = ClusteringConfig(
                kmeans_n_clusters=min(15, max(3, len(processed_df) // 3))
            )
        
        # Perform clustering
        clustering_engine = TransactionClusteringEngine(clustering_config)
        clustering_results = clustering_engine.fit(features, processed_df, algorithm=algorithm)
        
        # Get detailed analysis
        cluster_analysis = clustering_engine.get_cluster_analysis()
        
        results.update({
            'clustering_results': {
                'algorithm': algorithm,
                'n_clusters': clustering_results['training_stats']['metrics']['n_clusters'],
                'avg_confidence': clustering_results['training_stats']['avg_confidence'],
                'low_confidence_ratio': clustering_results['training_stats']['low_confidence_ratio'],
                'cluster_distribution': clustering_results['training_stats']['cluster_distribution'],
                'category_distribution': clustering_results['training_stats']['category_distribution']
            },
            'cluster_analysis': cluster_analysis,
            'sample_results': [
                {
                    'description': processed_df.iloc[i]['description'],
                    'amount': processed_df.iloc[i]['amount'],
                    'category': clustering_results['categories'][i],
                    'confidence': float(clustering_results['confidence_scores'][i]),
                    'cluster_id': int(clustering_results['cluster_labels'][i])
                }
                for i in range(min(10, len(processed_df)))  # Show first 10 as samples
            ],
            'timestamp': datetime.utcnow().isoformat()
        })
        
        return jsonify(results), 200
        
    except Exception as e:
        logger.error(f"Clustering analysis failed: {str(e)}")
        return jsonify({
            'error': 'Clustering analysis failed',
            'details': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500
