"""
Request and Response Schemas for FinSense ML Service

This module contains all Marshmallow schemas used for API contract validation.
Extracted from app.py for better organization.
"""

from marshmallow import Schema, fields, validate


# ============================================================================
# Transaction Schemas
# ============================================================================

class TransactionSchema(Schema):
    """Schema for individual transaction data"""
    id = fields.Str(required=True)
    date = fields.DateTime(required=True)
    amount = fields.Float(required=True, validate=validate.Range(min=-1000000, max=1000000))
    description = fields.Str(required=True, validate=validate.Length(min=1, max=500))
    category = fields.Str(load_default=None)


# ============================================================================
# Categorization Schemas
# ============================================================================

class CategorizeRequestSchema(Schema):
    """Request schema for transaction categorization"""
    transactions = fields.List(
        fields.Nested(TransactionSchema),
        required=True,
        validate=validate.Length(min=1, max=1000)
    )
    user_id = fields.Str(required=True)
    model_version = fields.Str(load_default=None)


class CategorizeResponseSchema(Schema):
    """Response schema for transaction categorization"""
    results = fields.List(fields.Dict(), required=True)
    model_version = fields.Str(required=True)
    processing_time = fields.Float(required=True)
    total_processed = fields.Int(required=True)


# ============================================================================
# Prediction Schemas
# ============================================================================

class PredictRequestSchema(Schema):
    """Request schema for financial predictions"""
    user_id = fields.Str(required=True)
    balance_data = fields.List(fields.Dict(), required=True, validate=validate.Length(min=30))
    prediction_days = fields.Int(load_default=30, validate=validate.Range(min=1, max=365))
    model_version = fields.Str(load_default=None)
    include_confidence = fields.Bool(load_default=True)


class PredictResponseSchema(Schema):
    """Response schema for financial predictions"""
    user_id = fields.Str(required=True)
    predictions = fields.List(fields.Dict(), required=True)
    confidence_intervals = fields.Dict(required=True)
    model_accuracy = fields.Float(required=True)
    model_version = fields.Str(required=True)
    prediction_dates = fields.List(fields.Date(), required=True)
    generated_at = fields.DateTime(required=True)
    preprocessing_stats = fields.Dict(required=True)


class TrainPredictionModelRequestSchema(Schema):
    """Request schema for training prediction models"""
    user_id = fields.Str(required=True)
    balance_data = fields.List(fields.Dict(), required=True, validate=validate.Length(min=90))
    model_config = fields.Dict(load_default=None)
    test_split = fields.Float(load_default=0.2, validate=validate.Range(min=0.1, max=0.5))
    save_model = fields.Bool(load_default=True)


class TrainPredictionModelResponseSchema(Schema):
    """Response schema for training prediction models"""
    user_id = fields.Str(required=True)
    model_version = fields.Str(required=True)
    training_stats = fields.Dict(required=True)
    test_metrics = fields.Dict(required=True)
    model_saved = fields.Bool(required=True)
    training_time = fields.Float(required=True)
    generated_at = fields.DateTime(required=True)


# ============================================================================
# Stress Score Schemas
# ============================================================================

class StressScoreRequestSchema(Schema):
    """Request schema for stress score calculation"""
    user_id = fields.Str(required=True)
    current_balance = fields.Float(required=True)
    predictions = fields.List(fields.Dict(), required=True)
    transaction_history = fields.List(fields.Nested(TransactionSchema), required=True)


class StressScoreResponseSchema(Schema):
    """Response schema for stress score calculation"""
    user_id = fields.Str(required=True)
    stress_score = fields.Float(required=True, validate=validate.Range(min=0, max=100))
    risk_level = fields.Str(
        required=True,
        validate=validate.OneOf(['low', 'medium', 'high', 'critical'])
    )
    factors = fields.List(fields.Dict(), required=True)
    recommendations = fields.List(fields.Str(), required=True)
    calculated_at = fields.DateTime(required=True)


# ============================================================================
# User Feedback/Learning Schemas
# ============================================================================

class UserCorrectionSchema(Schema):
    """Schema for user correction feedback"""
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
    """Request schema for submitting user corrections"""
    corrections = fields.List(
        fields.Nested(UserCorrectionSchema),
        required=True,
        validate=validate.Length(min=1, max=100)
    )


class LearningStatsResponseSchema(Schema):
    """Response schema for learning statistics"""
    user_id = fields.Str(required=True)
    total_corrections = fields.Int(required=True)
    patterns_learned = fields.Int(required=True)
    effective_patterns = fields.Int(required=True)
    category_mappings = fields.Int(required=True)
    most_corrected_categories = fields.Dict(required=True)
    learning_effectiveness = fields.Float(required=True)


# ============================================================================
# Model Retraining Schemas
# ============================================================================

class RetrainRequestSchema(Schema):
    """Request schema for model retraining"""
    model_type = fields.Str(
        required=True,
        validate=validate.OneOf(['clustering', 'prediction', 'stress'])
    )
    user_id = fields.Str(load_default=None)
    force_retrain = fields.Bool(load_default=False)
