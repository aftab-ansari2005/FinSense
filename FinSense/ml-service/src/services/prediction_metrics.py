"""
Prediction Metrics Service

This service provides comprehensive confidence intervals and accuracy metrics
for financial predictions, with enhanced logging and performance tracking.
"""

import logging
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional, Any, Union
from dataclasses import dataclass, asdict
import json
import os
from pathlib import Path

logger = logging.getLogger(__name__)

@dataclass
class ConfidenceInterval:
    """Confidence interval data structure"""
    level: float  # e.g., 0.95 for 95% confidence
    lower_bound: float
    upper_bound: float
    width: float
    prediction_value: float
    
    def __post_init__(self):
        self.width = self.upper_bound - self.lower_bound

@dataclass
class AccuracyMetrics:
    """Comprehensive accuracy metrics"""
    mae: float  # Mean Absolute Error
    mse: float  # Mean Squared Error
    rmse: float  # Root Mean Squared Error
    mape: float  # Mean Absolute Percentage Error
    r2_score: float  # R-squared
    directional_accuracy: float  # Percentage of correct trend predictions
    prediction_bias: float  # Average prediction - actual
    
    def to_dict(self) -> Dict[str, float]:
        return asdict(self)

@dataclass
class PredictionMetrics:
    """Complete prediction metrics including confidence and accuracy"""
    user_id: str
    prediction_date: datetime
    prediction_horizon: int  # Days ahead
    
    # Predictions and actuals
    predictions: List[float]
    actual_values: Optional[List[float]] = None
    
    # Confidence intervals
    confidence_intervals_80: List[ConfidenceInterval] = None
    confidence_intervals_95: List[ConfidenceInterval] = None
    
    # Accuracy metrics (if actuals available)
    accuracy_metrics: Optional[AccuracyMetrics] = None
    
    # Model performance
    model_version: str = "1.0.0"
    model_accuracy_score: float = 0.0
    uncertainty_score: float = 0.0  # Average confidence interval width
    
    # Metadata
    generated_at: datetime = None
    
    def __post_init__(self):
        if self.generated_at is None:
            self.generated_at = datetime.now()
        
        # Calculate uncertainty score from confidence intervals
        if self.confidence_intervals_95:
            widths = [ci.width for ci in self.confidence_intervals_95]
            self.uncertainty_score = float(np.mean(widths))

class PredictionMetricsService:
    """
    Service for calculating and managing prediction confidence intervals and accuracy metrics
    """
    
    def __init__(self, metrics_dir: str = "logs/metrics"):
        """
        Initialize the prediction metrics service
        
        Args:
            metrics_dir: Directory to store metrics logs
        """
        self.metrics_dir = Path(metrics_dir)
        self.metrics_dir.mkdir(parents=True, exist_ok=True)
        
        # Performance tracking
        self.performance_history = []
        self.metrics_cache = {}
        
        logger.info(f"PredictionMetricsService initialized with metrics_dir: {metrics_dir}")
    
    def calculate_confidence_intervals(self, 
                                     predictions: np.ndarray,
                                     prediction_std: np.ndarray = None,
                                     monte_carlo_samples: np.ndarray = None,
                                     confidence_levels: List[float] = None) -> Dict[str, List[ConfidenceInterval]]:
        """
        Calculate confidence intervals for predictions
        
        Args:
            predictions: Array of prediction values
            prediction_std: Standard deviation of predictions (if available)
            monte_carlo_samples: Monte Carlo dropout samples (if available)
            confidence_levels: List of confidence levels (e.g., [0.8, 0.95])
            
        Returns:
            Dictionary mapping confidence levels to confidence intervals
        """
        if confidence_levels is None:
            confidence_levels = [0.8, 0.95]
        
        confidence_intervals = {}
        
        for level in confidence_levels:
            intervals = []
            
            for i, pred_value in enumerate(predictions):
                if monte_carlo_samples is not None:
                    # Use Monte Carlo samples for confidence intervals
                    samples = monte_carlo_samples[:, i] if monte_carlo_samples.ndim > 1 else monte_carlo_samples
                    lower_percentile = (1 - level) / 2 * 100
                    upper_percentile = (1 + level) / 2 * 100
                    
                    lower_bound = np.percentile(samples, lower_percentile)
                    upper_bound = np.percentile(samples, upper_percentile)
                    
                elif prediction_std is not None:
                    # Use standard deviation for confidence intervals (assuming normal distribution)
                    from scipy import stats
                    z_score = stats.norm.ppf((1 + level) / 2)
                    margin = z_score * prediction