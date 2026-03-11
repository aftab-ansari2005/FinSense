"""
User feedback and learning routes for FinSense ML Service

Handles user corrections, learning statistics, and pattern management.
"""

import logging
from datetime import datetime
from flask import Blueprint, request, jsonify

from schemas import SubmitCorrectionRequestSchema
from src.utils.decorators import validate_json, log_request
from src.services.user_feedback_learning import UserFeedbackLearningService, UserCorrection


logger = logging.getLogger(__name__)

# Create blueprint
learning_bp = Blueprint('learning', __name__, url_prefix='/ml/learning')

# Initialize global feedback learning service
global_feedback_service = UserFeedbackLearningService()


@learning_bp.route('/submit-correction', methods=['POST'])
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


@learning_bp.route('/stats/<user_id>', methods=['GET'])
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


@learning_bp.route('/stats/global', methods=['GET'])
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


@learning_bp.route('/patterns/export', methods=['GET'])
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


@learning_bp.route('/patterns/import', methods=['POST'])
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


# Export the global feedback service for use in other routes
def get_global_feedback_service():
    """Get the global feedback learning service instance"""
    return global_feedback_service
