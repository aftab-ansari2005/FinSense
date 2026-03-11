"""
New Main Application File for FinSense ML Service

Refactored from monolithic 1705-line app.py to modular blueprint-based architecture.
This orchestrator registers all route blueprints and initializes global services.

Original app.py backed up as app.py.backup
"""

import os
import logging
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Import all route blueprints
from routes.health_routes import health_bp
from routes.learning_routes import learning_bp
from routes.categorization_routes import categorization_bp
from routes.prediction_routes import prediction_bp
from routes.stress_routes import stress_bp
from routes.model_retraining_routes import model_bp, retraining_bp

# Import service initialization
from src.services.model_storage import ModelStorageService


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

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['MODEL_VERSION'] = os.getenv('MODEL_VERSION', '1.0.0')
app.config['SERVICE_NAME'] = 'finsense-ml-service'

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


# Register all blueprints
app.register_blueprint(health_bp)
app.register_blueprint(learning_bp)
app.register_blueprint(categorization_bp)
app.register_blueprint(prediction_bp)
app.register_blueprint(stress_bp)
app.register_blueprint(model_bp)
app.register_blueprint(retraining_bp)

logger.info("All route blueprints registered successfully")


# Error handlers
@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({'error': 'Internal server error'}), 500


@app.errorhandler(413)
def too_large(error):
    """Handle payload too large errors"""
    return jsonify({'error': 'File too large'}), 413


# Main entry point
if __name__ == '__main__':
    # Create necessary directories
    os.makedirs('logs', exist_ok=True)
    os.makedirs('models', exist_ok=True)
    
    # Import pandas here to avoid import issues in health check
    import pandas as pd
    
    port = int(os.getenv('PORT', 5001))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    
    logger.info(f"Starting FinSense ML Service on port {port}")
    logger.info(f"Service refactored: monolithic app.py → modular blueprints")
    logger.info(f"Registered blueprints: health, learning, categorization, prediction, stress, model, retraining")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
