"""
Health check routes for FinSense ML Service

Provides basic health check endpoint for monitoring service availability.
"""

import os
import logging
import pandas as pd
from datetime import datetime
from flask import Blueprint, jsonify


logger = logging.getLogger(__name__)

# Create blueprint
health_bp = Blueprint('health', __name__)


@health_bp.route('/health', methods=['GET'])
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
