"""
Financial prediction routes for FinSense ML Service

Handles balance predictions using LSTM models and simple statistical fallback.
"""

import logging
import pandas as pd
import numpy as np
from datetime import datetime
from flask import Blueprint, request, jsonify

from schemas import PredictRequestSchema, TrainPredictionModelRequestSchema
from src.utils.decorators import validate_json, log_request


logger = logging.getLogger(__name__)

# Create blueprint
prediction_bp = Blueprint('prediction', __name__, url_prefix='/ml')

# Check for LSTM availability
try:
    from src.services.lstm_prediction_model import (
        LSTMPredictionModel,
        train_financial_prediction_model
    )
    LSTM_AVAILABLE = True
except ImportError as e:
    logger.warning(f"LSTM prediction model not available: {e}")
    LSTM_AVAILABLE = False

# Import simple prediction model as fallback
from src.services.simple_prediction_model import SimplePredictionModel, train_simple_prediction_model


@prediction_bp.route('/predict', methods=['POST'])
@validate_json(PredictRequestSchema)
@log_request
def predict_financial_health():
    """Generate financial balance predictions using LSTM model or simple fallback"""
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
        
        # Check if we have enough data
        if len(balance_df) < 7:
            return jsonify({
                'error': 'Insufficient data for prediction',
                'details': 'Need at least 7 days of balance data',
                'provided': len(balance_df),
                'timestamp': datetime.utcnow().isoformat()
            }), 400
        
        # Try LSTM first if available, fallback to simple model
        if LSTM_AVAILABLE:
            try:
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
                        raise train_error
                
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
                recent_sequence = X_sequences[-1:]
                prediction_result = model.predict(
                    recent_sequence,
                    user_id=user_id,
                    calculate_confidence=include_confidence
                )
                
                model_type = "LSTM"
                
            except Exception as lstm_error:
                logger.warning(f"LSTM prediction failed, falling back to simple model: {lstm_error}")
                # Fall back to simple model
                simple_model = SimplePredictionModel()
                prediction_result = simple_model.predict(
                    balance_df,
                    user_id=user_id,
                    prediction_days=prediction_days,
                    calculate_confidence=include_confidence
                )
                model_type = "Simple Statistical"
        else:
            # Use simple model directly
            logger.info(f"Using simple statistical model for user {user_id} (LSTM not available)")
            simple_model = SimplePredictionModel()
            prediction_result = simple_model.predict(
                balance_df,
                user_id=user_id,
                prediction_days=prediction_days,
                calculate_confidence=include_confidence
            )
            model_type = "Simple Statistical"
        
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
                'model_type': model_type,
                'prediction_horizon': prediction_days,
                'metadata': prediction_result.metadata
            }
        }
        
        logger.info(f"Successfully generated {len(predictions)} predictions for user {user_id} using {model_type} model")
        return jsonify(response_data), 200
        
    except Exception as e:
        logger.error(f"Financial prediction failed: {str(e)}")
        return jsonify({
            'error': 'Financial prediction failed',
            'details': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500


@prediction_bp.route('/predict/train', methods=['POST'])
@validate_json(TrainPredictionModelRequestSchema)
@log_request
def train_prediction_model():
    """Train a new prediction model for a user (LSTM or simple fallback)"""
    try:
        data = request.validated_data
        user_id = data['user_id']
        balance_data = data['balance_data']
        model_config = data.get('model_config', {})
        test_split = data['test_split']
        save_model = data['save_model']
        
        logger.info(f"Training prediction model for user {user_id} with {len(balance_data)} data points")
        
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
        min_required = 90 if LSTM_AVAILABLE else 7
        if len(balance_df) < min_required:
            return jsonify({
                'error': 'Insufficient data for training',
                'details': f'Need at least {min_required} days of balance data',
                'provided': len(balance_df),
                'timestamp': datetime.utcnow().isoformat()
            }), 400
        
        start_time = datetime.utcnow()
        
        # Prepare model save path
        model_path = f"models/prediction_{user_id}" if save_model else None
        
        try:
            # Try LSTM first if available and we have enough data
            if LSTM_AVAILABLE and len(balance_df) >= 90:
                try:
                    # Train LSTM model
                    trained_model, training_results = train_financial_prediction_model(
                        balance_data=balance_df,
                        user_id=user_id,
                        test_split=test_split,
                        model_save_path=f"models/lstm_prediction_{user_id}" if save_model else None
                    )
                    model_type = "LSTM"
                    logger.info(f"Successfully trained LSTM model for user {user_id}")
                except Exception as lstm_error:
                    logger.warning(f"LSTM training failed, falling back to simple model: {lstm_error}")
                    # Fall back to simple model
                    trained_model, training_results = train_simple_prediction_model(
                        balance_data=balance_df,
                        user_id=user_id,
                        test_split=test_split,
                        model_save_path=model_path
                    )
                    model_type = "Simple Statistical"
            else:
                # Use simple model
                trained_model, training_results = train_simple_prediction_model(
                    balance_data=balance_df,
                    user_id=user_id,
                    test_split=test_split,
                    model_save_path=model_path
                )
                model_type = "Simple Statistical"
                logger.info(f"Using simple statistical model for user {user_id}")
            
            training_time = (datetime.utcnow() - start_time).total_seconds()
            
            # Generate model version
            model_version = f"{model_type.lower().replace(' ', '_')}_v{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
            
            response_data = {
                'user_id': user_id,
                'model_version': model_version,
                'training_stats': training_results['training_stats'],
                'test_metrics': training_results['test_metrics'],
                'model_saved': save_model and model_path is not None,
                'training_time': training_time,
                'model_type': model_type,
                'generated_at': datetime.utcnow()
            }
            
            logger.info(f"Successfully trained {model_type} model for user {user_id} in {training_time:.2f}s")
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
