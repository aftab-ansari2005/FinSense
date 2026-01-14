import os
import logging
import traceback
from datetime import datetime
from functools import wraps
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import pandas as pd
import numpy as np
from marshmallow import Schema, fields, ValidationError, validate

# Import our model storage services
from src.services.model_storage import ModelStorageService
from src.utils.model_versioning import ModelVersionManager
from src.services.user_feedback_learning import UserFeedbackLearningService, UserCorrection

# Import LSTM prediction services
try:
    from src.services.lstm_prediction_model import (
        LSTMPredictionModel, 
        LSTMConfig, 
        create_lstm_model_for_financial_prediction,
        train_financial_prediction_model
    )
    from src.services.time_series_preprocessing import TimeSeriesPreprocessor, TimeSeriesConfig
    LSTM_AVAILABLE = True
except ImportError as e:
    logger.warning(f"LSTM prediction model not available: {e}")
    LSTM_AVAILABLE = False

# Load environment variables
load_dotenv()

# Configure logging
os.makedirs('logs', exist_ok=True)
logging.basicConfig(
    level=getattr(logging, os.getenv('LOG_LEVEL', 'INFO')),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/ml-service.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://localhost:5000"])

# Initialize global services
model_storage_service = None
retraining_scheduler = None

def initialize_services():
    """Initialize global services"""
    global model_storage_service, retraining_scheduler
    
    try:
        # Initialize model storage
        model_storage_service = ModelStorageService()
        logger.info("Model storage service initialized")
        
        # Initialize retraining scheduler
        from src.services.automated_retraining_scheduler import AutomatedRetrainingScheduler
        retraining_scheduler = AutomatedRetrainingScheduler(model_storage_service)
        
        # Start the scheduler
        retraining_scheduler.start_scheduler()
        logger.info("Automated retraining scheduler started")
        
    except Exception as e:
        logger.error(f"Failed to initialize services: {str(e)}")

# Initialize services when app starts
initialize_services()

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['MODEL_VERSION'] = os.getenv('MODEL_VERSION', '1.0.0')
app.config['SERVICE_NAME'] = 'finsense-ml-service'

# Initialize model storage services
model_storage = ModelStorageService(
    models_dir=os.getenv('MODELS_DIR', 'models'),
    backend_url=os.getenv('BACKEND_URL', 'http://localhost:5000')
)
version_manager = ModelVersionManager(model_storage)

# Request/Response Schemas for API contract validation
class TransactionSchema(Schema):
    id = fields.Str(required=True)
    date = fields.DateTime(required=True)
    amount = fields.Float(required=True, validate=validate.Range(min=-1000000, max=1000000))
    description = fields.Str(required=True, validate=validate.Length(min=1, max=500))
    category = fields.Str(load_default=None)

class CategorizeRequestSchema(Schema):
    transactions = fields.List(fields.Nested(TransactionSchema), required=True, validate=validate.Length(min=1, max=1000))
    user_id = fields.Str(required=True)
    model_version = fields.Str(load_default=None)

class CategorizeResponseSchema(Schema):
    results = fields.List(fields.Dict(), required=True)
    model_version = fields.Str(required=True)
    processing_time = fields.Float(required=True)
    total_processed = fields.Int(required=True)

class PredictRequestSchema(Schema):
    user_id = fields.Str(required=True)
    balance_data = fields.List(fields.Dict(), required=True, validate=validate.Length(min=30))
    prediction_days = fields.Int(load_default=30, validate=validate.Range(min=1, max=365))
    model_version = fields.Str(load_default=None)
    include_confidence = fields.Bool(load_default=True)

class PredictResponseSchema(Schema):
    user_id = fields.Str(required=True)
    predictions = fields.List(fields.Dict(), required=True)
    confidence_intervals = fields.Dict(required=True)
    model_accuracy = fields.Float(required=True)
    model_version = fields.Str(required=True)
    prediction_dates = fields.List(fields.Date(), required=True)
    generated_at = fields.DateTime(required=True)
    preprocessing_stats = fields.Dict(required=True)

class TrainPredictionModelRequestSchema(Schema):
    user_id = fields.Str(required=True)
    balance_data = fields.List(fields.Dict(), required=True, validate=validate.Length(min=90))
    model_config = fields.Dict(load_default=None)
    test_split = fields.Float(load_default=0.2, validate=validate.Range(min=0.1, max=0.5))
    save_model = fields.Bool(load_default=True)

class TrainPredictionModelResponseSchema(Schema):
    user_id = fields.Str(required=True)
    model_version = fields.Str(required=True)
    training_stats = fields.Dict(required=True)
    test_metrics = fields.Dict(required=True)
    model_saved = fields.Bool(required=True)
    training_time = fields.Float(required=True)
    generated_at = fields.DateTime(required=True)

class StressScoreRequestSchema(Schema):
    user_id = fields.Str(required=True)
    current_balance = fields.Float(required=True)
    predictions = fields.List(fields.Dict(), required=True)
    transaction_history = fields.List(fields.Nested(TransactionSchema), required=True)

class StressScoreResponseSchema(Schema):
    user_id = fields.Str(required=True)
    stress_score = fields.Float(required=True, validate=validate.Range(min=0, max=100))
    risk_level = fields.Str(required=True, validate=validate.OneOf(['low', 'medium', 'high', 'critical']))
    factors = fields.List(fields.Dict(), required=True)
    recommendations = fields.List(fields.Str(), required=True)
    calculated_at = fields.DateTime(required=True)

class UserCorrectionSchema(Schema):
    transaction_id = fields.Str(required=True)
    user_id = fields.Str(required=True)
    original_category = fields.Str(required=True)
    corrected_category = fields.Str(required=True)
    confidence_score = fields.Float(required=True, validate=validate.Range(min=0, max=1))
    transaction_description = fields.Str(required=True)
    transaction_amount = fields.Float(required=True)
    transaction_date = fields.DateTime(required=True)
    feedback_type = fields.Str(load_default="manual_correction")

class SubmitCorrectionRequestSchema(Schema):
    corrections = fields.List(fields.Nested(UserCorrectionSchema), required=True, validate=validate.Length(min=1, max=100))

class LearningStatsResponseSchema(Schema):
    user_id = fields.Str(required=True)
    total_corrections = fields.Int(required=True)
    patterns_learned = fields.Int(required=True)
    effective_patterns = fields.Int(required=True)
    category_mappings = fields.Int(required=True)
    most_corrected_categories = fields.Dict(required=True)
    learning_effectiveness = fields.Float(required=True)
class RetrainRequestSchema(Schema):
    model_type = fields.Str(required=True, validate=validate.OneOf(['clustering', 'prediction', 'stress']))
    user_id = fields.Str(load_default=None)
    force_retrain = fields.Bool(load_default=False)

# Initialize global feedback learning service
global_feedback_service = UserFeedbackLearningService()

# Validation decorator
def validate_json(schema_class):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                schema = schema_class()
                data = schema.load(request.get_json() or {})
                request.validated_data = data
                return f(*args, **kwargs)
            except ValidationError as err:
                logger.warning(f"Validation error in {f.__name__}: {err.messages}")
                return jsonify({
                    'error': 'Validation failed',
                    'details': err.messages,
                    'timestamp': datetime.utcnow().isoformat()
                }), 400
            except Exception as e:
                logger.error(f"Unexpected validation error in {f.__name__}: {str(e)}")
                return jsonify({
                    'error': 'Request validation failed',
                    'timestamp': datetime.utcnow().isoformat()
                }), 400
        return decorated_function
    return decorator

# Response formatting decorator
def format_response(schema_class):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                result = f(*args, **kwargs)
                if isinstance(result, tuple):
                    data, status_code = result
                else:
                    data, status_code = result, 200
                
                # Validate response data
                schema = schema_class()
                validated_data = schema.dump(data)
                
                return jsonify(validated_data), status_code
            except ValidationError as err:
                logger.error(f"Response validation error in {f.__name__}: {err.messages}")
                return jsonify({
                    'error': 'Response formatting failed',
                    'details': err.messages,
                    'timestamp': datetime.utcnow().isoformat()
                }), 500
            except Exception as e:
                logger.error(f"Unexpected response error in {f.__name__}: {str(e)}")
                return jsonify({
                    'error': 'Internal server error',
                    'timestamp': datetime.utcnow().isoformat()
                }), 500
        return decorated_function
    return decorator

# Request logging decorator
def log_request(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        start_time = datetime.utcnow()
        request_id = f"{start_time.timestamp()}_{request.remote_addr}"
        
        logger.info(f"[{request_id}] {request.method} {request.path} - Started")
        
        try:
            result = f(*args, **kwargs)
            duration = (datetime.utcnow() - start_time).total_seconds()
            
            if isinstance(result, tuple):
                _, status_code = result
            else:
                status_code = 200
                
            logger.info(f"[{request_id}] Completed in {duration:.3f}s - Status: {status_code}")
            return result
            
        except Exception as e:
            duration = (datetime.utcnow() - start_time).total_seconds()
            logger.error(f"[{request_id}] Failed in {duration:.3f}s - Error: {str(e)}")
            raise
            
    return decorated_function

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        return jsonify({
            'status': 'healthy',
            'service': 'finsense-ml-service',
            'version': os.getenv('MODEL_VERSION', '1.0.0'),
            'timestamp': str(pd.Timestamp.now())
        }), 200
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 503

@app.route('/ml/learning/submit-correction', methods=['POST'])
@validate_json(SubmitCorrectionRequestSchema)
@log_request
def submit_user_corrections():
    """Submit user corrections to improve categorization"""
    try:
        data = request.validated_data
        corrections = data['corrections']
        
        learning_results = []
        
        for correction_data in corrections:
            # Create UserCorrection object
            correction = UserCorrection(
                transaction_id=correction_data['transaction_id'],
                user_id=correction_data['user_id'],
                original_category=correction_data['original_category'],
                corrected_category=correction_data['corrected_category'],
                confidence_score=correction_data['confidence_score'],
                transaction_description=correction_data['transaction_description'],
                transaction_amount=correction_data['transaction_amount'],
                transaction_date=correction_data['transaction_date'],
                correction_timestamp=datetime.utcnow(),
                feedback_type=correction_data.get('feedback_type', 'manual_correction')
            )
            
            # Add correction to global learning service
            result = global_feedback_service.add_user_correction(correction)
            learning_results.append({
                'transaction_id': correction.transaction_id,
                'learning_result': result
            })
        
        logger.info(f"Processed {len(corrections)} user corrections")
        
        return jsonify({
            'success': True,
            'corrections_processed': len(corrections),
            'learning_results': learning_results,
            'global_stats': global_feedback_service.get_global_learning_stats(),
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to submit user corrections: {str(e)}")
        return jsonify({
            'error': 'Failed to submit corrections',
            'details': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

@app.route('/ml/learning/stats/<user_id>', methods=['GET'])
@log_request
def get_user_learning_stats(user_id):
    """Get learning statistics for a specific user"""
    try:
        stats = global_feedback_service.get_user_learning_stats(user_id)
        
        return jsonify({
            'success': True,
            'user_stats': stats,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get user learning stats: {str(e)}")
        return jsonify({
            'error': 'Failed to get learning statistics',
            'details': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

@app.route('/ml/learning/stats/global', methods=['GET'])
@log_request
def get_global_learning_stats():
    """Get global learning statistics across all users"""
    try:
        stats = global_feedback_service.get_global_learning_stats()
        
        return jsonify({
            'success': True,
            'global_stats': stats,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get global learning stats: {str(e)}")
        return jsonify({
            'error': 'Failed to get global learning statistics',
            'details': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

@app.route('/ml/learning/patterns/export', methods=['GET'])
@log_request
def export_learned_patterns():
    """Export learned patterns for analysis or backup"""
    try:
        user_id = request.args.get('user_id')
        patterns_data = global_feedback_service.export_learned_patterns(user_id)
        
        return jsonify({
            'success': True,
            'patterns_data': patterns_data,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to export learned patterns: {str(e)}")
        return jsonify({
            'error': 'Failed to export patterns',
            'details': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

@app.route('/ml/learning/patterns/import', methods=['POST'])
@log_request
def import_learned_patterns():
    """Import learned patterns from exported data"""
    try:
        data = request.get_json() or {}
        patterns_data = data.get('patterns_data')
        
        if not patterns_data:
            return jsonify({
                'error': 'No patterns data provided',
                'required_fields': ['patterns_data']
            }), 400
        
        success = global_feedback_service.import_learned_patterns(patterns_data)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Patterns imported successfully',
                'timestamp': datetime.utcnow().isoformat()
            }), 200
        else:
            return jsonify({
                'error': 'Failed to import patterns',
                'timestamp': datetime.utcnow().isoformat()
            }), 500
        
    except Exception as e:
        logger.error(f"Failed to import learned patterns: {str(e)}")
        return jsonify({
            'error': 'Failed to import patterns',
            'details': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

@app.route('/ml/categorize', methods=['POST'])
@validate_json(CategorizeRequestSchema)
@log_request
def categorize_transactions():
    """Categorize transactions using feature extraction and clustering"""
    try:
        data = request.validated_data
        transactions = data['transactions']
        user_id = data['user_id']
        model_version = data.get('model_version')
        
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
        
        # Get clustering analysis
        cluster_analysis = clustering_engine.get_cluster_analysis()
        
        return jsonify({
            'results': results,
            'model_version': model_version or app.config['MODEL_VERSION'],
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

@app.route('/ml/predict', methods=['POST'])
@validate_json(PredictRequestSchema)
@log_request
def predict_financial_health():
    """Generate financial balance predictions using LSTM model"""
    if not LSTM_AVAILABLE:
        return jsonify({
            'error': 'LSTM prediction model not available',
            'details': 'TensorFlow or required dependencies not installed',
            'timestamp': datetime.utcnow().isoformat()
        }), 503
    
    try:
        data = request.validated_data
        user_id = data['user_id']
        balance_data = data['balance_data']
        prediction_days = data['prediction_days']
        model_version = data.get('model_version')
        include_confidence = data.get('include_confidence', True)
        
        logger.info(f"Generating predictions for user {user_id}, {len(balance_data)} data points, {prediction_days} days ahead")
        
        # Convert balance data to DataFrame
        balance_df = pd.DataFrame(balance_data)
        
        # Ensure required columns
        if 'date' not in balance_df.columns or 'balance' not in balance_df.columns:
            return jsonify({
                'error': 'Invalid balance data format',
                'details': 'Required columns: date, balance',
                'timestamp': datetime.utcnow().isoformat()
            }), 400
        
        # Convert date column
        balance_df['date'] = pd.to_datetime(balance_df['date'])
        balance_df = balance_df.sort_values('date')
        
        # Check if we have a trained model for this user
        model_path = f"models/lstm_prediction_{user_id}"
        model = None
        
        try:
            # Try to load existing model
            model = LSTMPredictionModel.load_model(model_path)
            logger.info(f"Loaded existing LSTM model for user {user_id}")
        except (FileNotFoundError, Exception) as e:
            logger.info(f"No existing model found for user {user_id}, training new model: {e}")
            
            # Train a new model
            try:
                model, training_results = train_financial_prediction_model(
                    balance_data=balance_df,
                    user_id=user_id,
                    test_split=0.2,
                    model_save_path=model_path
                )
                logger.info(f"Successfully trained new LSTM model for user {user_id}")
            except Exception as train_error:
                logger.error(f"Failed to train LSTM model: {train_error}")
                return jsonify({
                    'error': 'Failed to train prediction model',
                    'details': str(train_error),
                    'timestamp': datetime.utcnow().isoformat()
                }), 500
        
        # Prepare data for prediction
        try:
            # Use the model's preprocessor to prepare sequences
            X_sequences, _, preprocessing_report = model.preprocessor.transform(balance_df)
            
            if len(X_sequences) == 0:
                return jsonify({
                    'error': 'Insufficient data for prediction',
                    'details': 'Need at least sequence_length days of data',
                    'minimum_required': model.preprocessor.config.sequence_length,
                    'timestamp': datetime.utcnow().isoformat()
                }), 400
            
            # Make predictions using the most recent sequence
            recent_sequence = X_sequences[-1:]  # Use the most recent sequence
            prediction_result = model.predict(
                recent_sequence, 
                user_id=user_id,
                calculate_confidence=include_confidence
            )
            
            # Format predictions
            predictions = []
            for i, (date, pred_value) in enumerate(zip(prediction_result.prediction_dates, prediction_result.predictions[0])):
                pred_dict = {
                    'date': date.isoformat(),
                    'predicted_balance': float(pred_value),
                    'day_ahead': i + 1
                }
                
                # Add confidence intervals if available
                if include_confidence and prediction_result.confidence_intervals:
                    pred_dict.update({
                        'confidence_lower_95': float(prediction_result.confidence_intervals['lower_95'][0][i]),
                        'confidence_upper_95': float(prediction_result.confidence_intervals['upper_95'][0][i]),
                        'confidence_lower_80': float(prediction_result.confidence_intervals['lower_80'][0][i]),
                        'confidence_upper_80': float(prediction_result.confidence_intervals['upper_80'][0][i]),
                        'prediction_std': float(prediction_result.confidence_intervals['std'][0][i])
                    })
                
                predictions.append(pred_dict)
            
            # Format confidence intervals summary
            confidence_summary = {}
            if include_confidence and prediction_result.confidence_intervals:
                confidence_summary = {
                    'has_confidence_intervals': True,
                    'confidence_levels': ['80%', '95%'],
                    'mean_uncertainty': float(np.mean(prediction_result.confidence_intervals['std'])),
                    'max_uncertainty': float(np.max(prediction_result.confidence_intervals['std']))
                }
            else:
                confidence_summary = {
                    'has_confidence_intervals': False,
                    'reason': 'Confidence calculation disabled or failed'
                }
            
            response_data = {
                'user_id': user_id,
                'predictions': predictions,
                'confidence_intervals': confidence_summary,
                'model_accuracy': prediction_result.model_accuracy,
                'model_version': prediction_result.metadata.get('model_version', '1.0.0'),
                'prediction_dates': [date.isoformat() for date in prediction_result.prediction_dates],
                'generated_at': prediction_result.generated_at,
                'preprocessing_stats': {
                    'input_data_points': len(balance_df),
                    'sequences_generated': len(X_sequences),
                    'sequence_length': model.preprocessor.config.sequence_length,
                    'prediction_horizon': prediction_days,
                    'preprocessing_report': preprocessing_report
                }
            }
            
            logger.info(f"Successfully generated {len(predictions)} predictions for user {user_id}")
            return jsonify(response_data), 200
            
        except Exception as pred_error:
            logger.error(f"Prediction generation failed: {pred_error}")
            return jsonify({
                'error': 'Prediction generation failed',
                'details': str(pred_error),
                'timestamp': datetime.utcnow().isoformat()
            }), 500
        
    except Exception as e:
        logger.error(f"Financial prediction failed: {str(e)}")
        return jsonify({
            'error': 'Financial prediction failed',
            'details': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

@app.route('/ml/predict/train', methods=['POST'])
@validate_json(TrainPredictionModelRequestSchema)
@log_request
def train_prediction_model():
    """Train a new LSTM prediction model for a user"""
    if not LSTM_AVAILABLE:
        return jsonify({
            'error': 'LSTM prediction model not available',
            'details': 'TensorFlow or required dependencies not installed',
            'timestamp': datetime.utcnow().isoformat()
        }), 503
    
    try:
        data = request.validated_data
        user_id = data['user_id']
        balance_data = data['balance_data']
        model_config = data.get('model_config', {})
        test_split = data['test_split']
        save_model = data['save_model']
        
        logger.info(f"Training LSTM prediction model for user {user_id} with {len(balance_data)} data points")
        
        # Convert balance data to DataFrame
        balance_df = pd.DataFrame(balance_data)
        
        # Ensure required columns
        if 'date' not in balance_df.columns or 'balance' not in balance_df.columns:
            return jsonify({
                'error': 'Invalid balance data format',
                'details': 'Required columns: date, balance',
                'timestamp': datetime.utcnow().isoformat()
            }), 400
        
        # Convert date column and sort
        balance_df['date'] = pd.to_datetime(balance_df['date'])
        balance_df = balance_df.sort_values('date')
        
        # Validate data sufficiency
        if len(balance_df) < 90:
            return jsonify({
                'error': 'Insufficient data for training',
                'details': 'Need at least 90 days of balance data',
                'provided': len(balance_df),
                'timestamp': datetime.utcnow().isoformat()
            }), 400
        
        start_time = datetime.utcnow()
        
        # Prepare model save path
        model_path = f"models/lstm_prediction_{user_id}" if save_model else None
        
        try:
            # Train the model
            trained_model, training_results = train_financial_prediction_model(
                balance_data=balance_df,
                user_id=user_id,
                test_split=test_split,
                model_save_path=model_path
            )
            
            training_time = (datetime.utcnow() - start_time).total_seconds()
            
            # Generate model version
            model_version = f"lstm_v{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
            
            response_data = {
                'user_id': user_id,
                'model_version': model_version,
                'training_stats': training_results['training_stats'],
                'test_metrics': training_results['test_metrics'],
                'model_saved': save_model and model_path is not None,
                'training_time': training_time,
                'generated_at': datetime.utcnow()
            }
            
            logger.info(f"Successfully trained LSTM model for user {user_id} in {training_time:.2f}s")
            return jsonify(response_data), 200
            
        except Exception as train_error:
            logger.error(f"Model training failed: {train_error}")
            return jsonify({
                'error': 'Model training failed',
                'details': str(train_error),
                'timestamp': datetime.utcnow().isoformat()
            }), 500
        
    except Exception as e:
        logger.error(f"Training request failed: {str(e)}")
        return jsonify({
            'error': 'Training request failed',
            'details': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

@app.route('/ml/stress-score', methods=['POST'])
@validate_json(StressScoreRequestSchema)
@format_response(StressScoreResponseSchema)
@log_request
def calculate_stress_score():
    """Calculate financial stress score with enhanced alerts and recommendations"""
    try:
        data = request.validated_data
        user_id = data['user_id']
        current_balance = data['current_balance']
        predictions = data['predictions']
        transaction_history = data['transaction_history']
        
        logger.info(f"Calculating stress score for user {user_id}")
        
        # Import the enhanced alert and recommendation system
        from src.services.alert_recommendation_system import AlertRecommendationSystem
        
        # Initialize enhanced system
        alert_system = AlertRecommendationSystem()
        
        # Process comprehensive financial analysis
        analysis_result = alert_system.process_financial_analysis(
            user_id=user_id,
            current_balance=current_balance,
            predictions=predictions,
            transaction_history=transaction_history
        )
        
        # Extract stress result from analysis
        stress_result = analysis_result['stress_result']
        
        # Prepare enhanced response data
        response_data = {
            'user_id': stress_result['user_id'],
            'stress_score': stress_result['stress_score'],
            'risk_level': stress_result['risk_level'],
            'factors': stress_result['factors'],
            'recommendations': analysis_result['recommendations'],
            'calculated_at': stress_result['calculated_at'],
            'alerts': analysis_result['alerts'],
            'metrics': stress_result['metrics'],
            'alert_summary': analysis_result['alert_summary'],
            'recommendation_summary': analysis_result['recommendation_summary']
        }
        
        logger.info(f"Enhanced stress analysis completed: {stress_result['stress_score']:.1f} ({stress_result['risk_level']})")
        logger.info(f"Generated {len(analysis_result['alerts'])} alerts and {len(analysis_result['recommendations'])} recommendations")
        
        return response_data, 200
        
    except Exception as e:
        logger.error(f"Stress score calculation failed: {str(e)}")
        return jsonify({
            'error': 'Stress score calculation failed',
            'details': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

@app.route('/ml/retrain', methods=['POST'])
def retrain_models():
    """Model retraining endpoint"""
    try:
        # Validate request data
        schema = RetrainRequestSchema()
        data = schema.load(request.json or {})
        
        model_type = data['model_type']
        user_id = data.get('user_id')
        force_retrain = data.get('force_retrain', False)
        
        logger.info(f"Retraining request for {model_type} (force: {force_retrain})")
        
        # Get the retraining scheduler
        from src.services.automated_retraining_scheduler import AutomatedRetrainingScheduler
        from src.services.model_storage import ModelStorageService
        
        # Initialize services if not already done
        model_storage = ModelStorageService()
        scheduler = AutomatedRetrainingScheduler(model_storage)
        
        # Check if retraining is needed (unless forced)
        reasons = []
        if force_retrain:
            reasons = ["Manual retraining requested"]
        else:
            from src.utils.model_versioning import ModelVersionManager
            version_manager = ModelVersionManager(model_storage)
            
            should_retrain, reasons = version_manager.should_retrain_model(model_type)
            
            if not should_retrain:
                return jsonify({
                    'success': False,
                    'message': 'Retraining not needed based on current criteria',
                    'model_type': model_type,
                    'criteria_checked': True,
                    'reasons': reasons
                }), 200
        
        # Trigger retraining
        job_id = scheduler.trigger_retraining(
            model_type=model_type,
            trigger_type="manual",
            reasons=reasons,
            user_id=user_id
        )
        
        return jsonify({
            'success': True,
            'message': f'Retraining job triggered for {model_type}',
            'job_id': job_id,
            'model_type': model_type,
            'trigger_type': 'manual',
            'reasons': reasons
        }), 200
        
    except ValidationError as e:
        logger.error(f"Validation error in retrain endpoint: {e.messages}")
        return jsonify({
            'error': 'Validation failed',
            'details': e.messages
        }), 400
        
    except Exception as e:
        logger.error(f"Error in retrain endpoint: {str(e)}")
        return jsonify({
            'error': 'Retraining failed',
            'message': str(e)
        }), 500

@app.route('/ml/retrain/status/<job_id>', methods=['GET'])
def get_retraining_job_status(job_id):
    """Get status of a specific retraining job"""
    try:
        from src.services.automated_retraining_scheduler import AutomatedRetrainingScheduler
        from src.services.model_storage import ModelStorageService
        
        model_storage = ModelStorageService()
        scheduler = AutomatedRetrainingScheduler(model_storage)
        
        job_status = scheduler.get_job_status(job_id)
        
        if not job_status:
            return jsonify({
                'error': 'Job not found',
                'job_id': job_id
            }), 404
        
        return jsonify({
            'success': True,
            'job': job_status
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting job status: {str(e)}")
        return jsonify({
            'error': 'Failed to get job status',
            'message': str(e)
        }), 500

@app.route('/ml/retrain/jobs', methods=['GET'])
def get_retraining_jobs():
    """Get recent retraining jobs"""
    try:
        limit = request.args.get('limit', 10, type=int)
        
        from src.services.automated_retraining_scheduler import AutomatedRetrainingScheduler
        from src.services.model_storage import ModelStorageService
        
        model_storage = ModelStorageService()
        scheduler = AutomatedRetrainingScheduler(model_storage)
        
        jobs = scheduler.get_recent_jobs(limit)
        
        return jsonify({
            'success': True,
            'jobs': jobs,
            'total': len(jobs)
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting retraining jobs: {str(e)}")
        return jsonify({
            'error': 'Failed to get retraining jobs',
            'message': str(e)
        }), 500

@app.route('/ml/retrain/scheduler/status', methods=['GET'])
def get_scheduler_status():
    """Get retraining scheduler status"""
    try:
        from src.services.automated_retraining_scheduler import AutomatedRetrainingScheduler
        from src.services.model_storage import ModelStorageService
        
        model_storage = ModelStorageService()
        scheduler = AutomatedRetrainingScheduler(model_storage)
        
        status = scheduler.get_scheduler_status()
        
        return jsonify({
            'success': True,
            'scheduler': status
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting scheduler status: {str(e)}")
        return jsonify({
            'error': 'Failed to get scheduler status',
            'message': str(e)
        }), 500

@app.route('/ml/retrain/config', methods=['GET'])
def get_retraining_config():
    """Get retraining configuration"""
    try:
        model_type = request.args.get('model_type')
        
        from src.services.automated_retraining_scheduler import AutomatedRetrainingScheduler
        from src.services.model_storage import ModelStorageService
        
        model_storage = ModelStorageService()
        scheduler = AutomatedRetrainingScheduler(model_storage)
        
        config = scheduler.get_config(model_type)
        
        return jsonify({
            'success': True,
            'config': config
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting retraining config: {str(e)}")
        return jsonify({
            'error': 'Failed to get retraining config',
            'message': str(e)
        }), 500

@app.route('/ml/retrain/config/<model_type>', methods=['PUT'])
def update_retraining_config(model_type):
    """Update retraining configuration for a model type"""
    try:
        config_updates = request.json or {}
        
        from src.services.automated_retraining_scheduler import AutomatedRetrainingScheduler
        from src.services.model_storage import ModelStorageService
        
        model_storage = ModelStorageService()
        scheduler = AutomatedRetrainingScheduler(model_storage)
        
        scheduler.update_config(model_type, config_updates)
        
        return jsonify({
            'success': True,
            'message': f'Configuration updated for {model_type}',
            'model_type': model_type
        }), 200
        
    except Exception as e:
        logger.error(f"Error updating retraining config: {str(e)}")
        return jsonify({
            'error': 'Failed to update retraining config',
            'message': str(e)
        }), 500

# Alert and Recommendation Management Endpoints

@app.route('/ml/alerts/<user_id>', methods=['GET'])
@log_request
def get_user_alerts(user_id):
    """Get active alerts for a user"""
    try:
        from src.services.alert_recommendation_system import AlertRecommendationSystem
        
        alert_system = AlertRecommendationSystem()
        active_alerts = alert_system.get_active_alerts(user_id)
        
        return jsonify({
            'user_id': user_id,
            'active_alerts': active_alerts,
            'total_count': len(active_alerts),
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get user alerts: {str(e)}")
        return jsonify({
            'error': 'Failed to get user alerts',
            'details': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

@app.route('/ml/alerts/<user_id>/<alert_id>/acknowledge', methods=['POST'])
@log_request
def acknowledge_alert(user_id, alert_id):
    """Acknowledge a specific alert"""
    try:
        from src.services.alert_recommendation_system import AlertRecommendationSystem
        
        alert_system = AlertRecommendationSystem()
        success = alert_system.acknowledge_alert(user_id, alert_id)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Alert acknowledged successfully',
                'alert_id': alert_id,
                'timestamp': datetime.utcnow().isoformat()
            }), 200
        else:
            return jsonify({
                'error': 'Alert not found or already acknowledged',
                'alert_id': alert_id,
                'timestamp': datetime.utcnow().isoformat()
            }), 404
            
    except Exception as e:
        logger.error(f"Failed to acknowledge alert: {str(e)}")
        return jsonify({
            'error': 'Failed to acknowledge alert',
            'details': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

@app.route('/ml/recommendations/<user_id>', methods=['GET'])
@log_request
def get_user_recommendations(user_id):
    """Get recommendation status for a user"""
    try:
        from src.services.alert_recommendation_system import AlertRecommendationSystem
        
        alert_system = AlertRecommendationSystem()
        recommendations = alert_system.get_recommendation_status(user_id)
        
        return jsonify({
            'user_id': user_id,
            'recommendations': recommendations,
            'total_count': len(recommendations),
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get user recommendations: {str(e)}")
        return jsonify({
            'error': 'Failed to get user recommendations',
            'details': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

@app.route('/ml/recommendations/<user_id>/<recommendation_id>/status', methods=['PUT'])
@log_request
def update_recommendation_status(user_id, recommendation_id):
    """Update recommendation progress status"""
    try:
        data = request.get_json() or {}
        status = data.get('status')
        progress_note = data.get('progress_note')
        
        if not status:
            return jsonify({
                'error': 'Status is required',
                'valid_statuses': ['pending', 'in_progress', 'completed', 'dismissed']
            }), 400
        
        from src.services.alert_recommendation_system import AlertRecommendationSystem
        
        alert_system = AlertRecommendationSystem()
        success = alert_system.update_recommendation_status(
            user_id, recommendation_id, status, progress_note
        )
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Recommendation status updated successfully',
                'recommendation_id': recommendation_id,
                'new_status': status,
                'timestamp': datetime.utcnow().isoformat()
            }), 200
        else:
            return jsonify({
                'error': 'Recommendation not found',
                'recommendation_id': recommendation_id,
                'timestamp': datetime.utcnow().isoformat()
            }), 404
            
    except Exception as e:
        logger.error(f"Failed to update recommendation status: {str(e)}")
        return jsonify({
            'error': 'Failed to update recommendation status',
            'details': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

@app.route('/ml/alerts/<user_id>/preferences', methods=['GET', 'POST'])
@log_request
def manage_alert_preferences(user_id):
    """Get or set alert preferences for a user"""
    try:
        from src.services.alert_recommendation_system import (
            AlertRecommendationSystem, 
            UserAlertPreferences, 
            NotificationChannel
        )
        
        alert_system = AlertRecommendationSystem()
        
        if request.method == 'GET':
            # Get current preferences
            preferences = alert_system.get_user_preferences(user_id)
            return jsonify({
                'user_id': user_id,
                'preferences': preferences.to_dict(),
                'timestamp': datetime.utcnow().isoformat()
            }), 200
            
        elif request.method == 'POST':
            # Update preferences
            data = request.get_json() or {}
            
            # Parse notification channels
            enabled_channels = []
            for channel_name in data.get('enabled_channels', ['dashboard']):
                try:
                    enabled_channels.append(NotificationChannel(channel_name))
                except ValueError:
                    continue
            
            preferences = UserAlertPreferences(
                user_id=user_id,
                enabled_channels=enabled_channels,
                quiet_hours_start=data.get('quiet_hours_start', 22),
                quiet_hours_end=data.get('quiet_hours_end', 8),
                max_alerts_per_day=data.get('max_alerts_per_day', 5),
                custom_thresholds=data.get('custom_thresholds', {})
            )
            
            success = alert_system.set_user_preferences(preferences)
            
            if success:
                return jsonify({
                    'success': True,
                    'message': 'Alert preferences updated successfully',
                    'preferences': preferences.to_dict(),
                    'timestamp': datetime.utcnow().isoformat()
                }), 200
            else:
                return jsonify({
                    'error': 'Failed to update preferences',
                    'timestamp': datetime.utcnow().isoformat()
                }), 500
                
    except Exception as e:
        logger.error(f"Failed to manage alert preferences: {str(e)}")
        return jsonify({
            'error': 'Failed to manage alert preferences',
            'details': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

@app.route('/ml/alerts/<user_id>/statistics', methods=['GET'])
@log_request
def get_alert_statistics(user_id):
    """Get alert statistics for a user"""
    try:
        days = int(request.args.get('days', 30))
        
        from src.services.alert_recommendation_system import AlertRecommendationSystem
        
        alert_system = AlertRecommendationSystem()
        stats = alert_system.get_alert_statistics(user_id, days)
        
        return jsonify({
            'user_id': user_id,
            'period_days': days,
            'statistics': stats,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get alert statistics: {str(e)}")
        return jsonify({
            'error': 'Failed to get alert statistics',
            'details': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

# Model management endpoints
@app.route('/ml/models', methods=['GET'])
@log_request
def list_models():
    """List available models"""
    try:
        model_type = request.args.get('type')
        models = model_storage.list_models(model_type)
        
        return jsonify({
            'models': models,
            'total': len(models),
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to list models: {str(e)}")
        return jsonify({
            'error': 'Failed to list models',
            'details': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

@app.route('/ml/models/<model_type>/<version>', methods=['GET'])
@log_request
def get_model_info(model_type, version):
    """Get information about a specific model"""
    try:
        # Load model metadata
        _, _, _, metadata = model_storage.load_model(
            model_type, version, load_scaler=False, load_config=False
        )
        
        return jsonify({
            'model_info': metadata,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except FileNotFoundError:
        return jsonify({
            'error': 'Model not found',
            'model_type': model_type,
            'version': version
        }), 404
    except Exception as e:
        logger.error(f"Failed to get model info: {str(e)}")
        return jsonify({
            'error': 'Failed to get model information',
            'details': str(e)
        }), 500

@app.route('/ml/models/<model_type>/versions', methods=['GET'])
@log_request
def get_model_versions(model_type):
    """Get all versions of a specific model type"""
    try:
        models = model_storage.list_models(model_type)
        versions = [
            {
                'version': model['version'],
                'training_date': model['trainingDate'],
                'performance': model.get('performance', {}),
                'deployment_status': model.get('deployment', {}).get('status', 'unknown')
            }
            for model in models
        ]
        
        return jsonify({
            'model_type': model_type,
            'versions': versions,
            'total': len(versions),
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get model versions: {str(e)}")
        return jsonify({
            'error': 'Failed to get model versions',
            'details': str(e)
        }), 500

@app.route('/ml/models/<model_type>/rollback', methods=['POST'])
@log_request
def rollback_model(model_type):
    """Rollback to a previous model version"""
    try:
        data = request.get_json() or {}
        target_version = data.get('version')
        
        if not target_version:
            return jsonify({
                'error': 'Target version is required',
                'required_fields': ['version']
            }), 400
        
        # Perform rollback
        success = model_storage.rollback_model(model_type, target_version)
        
        if success:
            logger.info(f"Successfully rolled back {model_type} to version {target_version}")
            return jsonify({
                'message': f'Successfully rolled back to version {target_version}',
                'model_type': model_type,
                'target_version': target_version,
                'timestamp': datetime.utcnow().isoformat()
            }), 200
        else:
            return jsonify({
                'error': 'Rollback failed',
                'model_type': model_type,
                'target_version': target_version
            }), 500
            
    except ValueError as e:
        return jsonify({
            'error': 'Invalid rollback request',
            'details': str(e)
        }), 400
    except Exception as e:
        logger.error(f"Failed to rollback model: {str(e)}")
        return jsonify({
            'error': 'Rollback operation failed',
            'details': str(e)
        }), 500

@app.route('/ml/models/<model_type>/performance', methods=['GET'])
@log_request
def get_model_performance(model_type):
    """Get performance history for a model type"""
    try:
        limit = int(request.args.get('limit', 10))
        performance_history = model_storage.get_model_performance_history(model_type, limit)
        
        return jsonify({
            'model_type': model_type,
            'performance_history': performance_history,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get performance history: {str(e)}")
        return jsonify({
            'error': 'Failed to get performance history',
            'details': str(e)
        }), 500

@app.route('/ml/models/<model_type>/validate', methods=['POST'])
@log_request
def validate_model(model_type):
    """Validate a model before deployment"""
    try:
        data = request.get_json() or {}
        version = data.get('version')
        validation_criteria = data.get('criteria', {})
        
        if not version:
            return jsonify({
                'error': 'Model version is required',
                'required_fields': ['version']
            }), 400
        
        # Perform validation
        is_valid, messages = version_manager.validate_model_before_deployment(
            model_type, version, validation_criteria
        )
        
        return jsonify({
            'model_type': model_type,
            'version': version,
            'is_valid': is_valid,
            'validation_messages': messages,
            'criteria': validation_criteria,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to validate model: {str(e)}")
        return jsonify({
            'error': 'Model validation failed',
            'details': str(e)
        }), 500

@app.route('/ml/features/extract', methods=['POST'])
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

@app.route('/ml/clustering/analyze', methods=['POST'])
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

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({'error': 'Internal server error'}), 500

@app.errorhandler(413)
def too_large(error):
    return jsonify({'error': 'File too large'}), 413

if __name__ == '__main__':
    # Create necessary directories
    os.makedirs('logs', exist_ok=True)
    os.makedirs('models', exist_ok=True)
    
    # Import pandas here to avoid import issues in health check
    import pandas as pd
    
    port = int(os.getenv('PORT', 5001))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    
    logger.info(f"Starting FinSense ML Service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)