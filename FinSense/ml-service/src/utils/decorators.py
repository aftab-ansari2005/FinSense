"""
Utility decorators for FinSense ML Service

Shared decorators for request validation, response formatting, and logging.
Extracted from app.py for better code organization.
"""

import logging
from datetime import datetime
from functools import wraps
from flask import request, jsonify
from marshmallow import ValidationError


logger = logging.getLogger(__name__)


def validate_json(schema_class):
    """
    Decorator for validating JSON request data using Marshmallow schemas.
    
    Args:
        schema_class: Marshmallow Schema class for validation
        
    Returns:
        Decorated function that validates request data
    """
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


def format_response(schema_class):
    """
    Decorator for formatting and validating JSON response data using Marshmallow schemas.
    
    Args:
        schema_class: Marshmallow Schema class for response validation
        
    Returns:
        Decorated function that validates response data
    """
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


def log_request(f):
    """
    Decorator for logging HTTP requests with timing information.
    
    Args:
        f: Function to decorate
        
    Returns:
        Decorated function that logs request details
    """
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
