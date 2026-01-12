"""
User Feedback Learning Service

This service implements incremental learning from user corrections to improve
transaction categorization accuracy over time. It uses various learning strategies
to adapt the clustering and categorization models based on user feedback.
"""

import logging
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional, Any, Set
from dataclasses import dataclass, field
from collections import defaultdict, Counter
import joblib
import re

logger = logging.getLogger(__name__)

@dataclass
class UserCorrection:
    """Represents a user correction for a transaction categorization"""
    transaction_id: str
    user_id: str
    original_category: str
    corrected_category: str
    confidence_score: float
    transaction_description: str
    transaction_amount: float
    transaction_date: datetime
    correction_timestamp: datetime
    feedback_type: str = "manual_correction"  # manual_correction, bulk_correction, etc.

@dataclass
class LearningConfig:
    """Configuration for the learning system"""
    # Learning parameters
    learning_rate: float = 0.1
    min_corrections_for_pattern: int = 3
    max_pattern_age_days: int = 90
    confidence_boost_factor: float = 0.2
    
    # Pattern matching parameters
    similarity_threshold: float = 0.8
    description_weight: float = 0.7
    amount_weight: float = 0.3
    
    # Incremental learning parameters
    enable_pattern_learning: bool = True
    enable_category_mapping: bool = True
    enable_confidence_adjustment: bool = True
    
    # Storage parameters
    max_corrections_stored: int = 10000
    cleanup_interval_days: int = 30

class UserFeedbackLearningService:
    """
    Service for learning from user corrections and improving categorization
    """
    
    def __init__(self, config: LearningConfig = None):
        """
        Initialize the learning service
        
        Args:
            config: Configuration for learning behavior
        """
        self.config = config or LearningConfig()
        
        # Storage for user corrections
        self.corrections_history: List[UserCorrection] = []
        self.user_patterns: Dict[str, Dict] = defaultdict(dict)  # user_id -> patterns
        self.category_mappings: Dict[str, Dict] = defaultdict(dict)  # user_id -> mappings
        self.learned_rules: Dict[str, List] = defaultdict(list)  # user_id -> rules
        
        # Learning statistics
        self.learning_stats = {
            'total_corrections': 0,
            'patterns_learned': 0,
            'accuracy_improvements': {},
            'last_update': None
        }
        
        self.is_fitted = False
    
    def add_user_correction(self, correction: UserCorrection) -> Dict[str, Any]:
        """
        Add a user correction and trigger learning
        
        Args:
            correction: User correction data
            
        Returns:
            Learning results and statistics
        """
        logger.info(f"Adding user correction: {correction.transaction_description} "
                   f"{correction.original_category} -> {correction.corrected_category}")
        
        # Add to corrections history
        self.corrections_history.append(correction)
        self.learning_stats['total_corrections'] += 1
        
        # Trigger learning processes
        learning_results = {
            'correction_added': True,
            'patterns_updated': False,
            'rules_created': False,
            'confidence_adjusted': False
        }
        
        # Learn patterns from this correction
        if self.config.enable_pattern_learning:
            pattern_result = self._learn_pattern_from_correction(correction)
            learning_results.update(pattern_result)
        
        # Update category mappings
        if self.config.enable_category_mapping:
            mapping_result = self._update_category_mappings(correction)
            learning_results.update(mapping_result)
        
        # Adjust confidence for similar transactions
        if self.config.enable_confidence_adjustment:
            confidence_result = self._adjust_confidence_for_similar(correction)
            learning_results.update(confidence_result)
        
        # Update learning statistics
        self.learning_stats['last_update'] = datetime.now()
        
        # Cleanup old corrections if needed
        self._cleanup_old_corrections()
        
        return learning_results
    
    def _learn_pattern_from_correction(self, correction: UserCorrection) -> Dict[str, Any]:
        """
        Learn patterns from a user correction
        
        Args:
            correction: User correction data
            
        Returns:
            Pattern learning results
        """
        user_id = correction.user_id
        
        # Extract patterns from the transaction description
        patterns = self._extract_patterns_from_description(correction.transaction_description)
        
        # Update user-specific patterns
        if user_id not in self.user_patterns:
            self.user_patterns[user_id] = {}
        
        for pattern in patterns:
            if pattern not in self.user_patterns[user_id]:
                self.user_patterns[user_id][pattern] = {
                    'category': correction.corrected_category,
                    'count': 1,
                    'confidence': 0.5,
                    'first_seen': correction.correction_timestamp,
                    'last_updated': correction.correction_timestamp,
                    'examples': []
                }
            else:
                # Update existing pattern
                pattern_data = self.user_patterns[user_id][pattern]
                pattern_data['count'] += 1
                pattern_data['last_updated'] = correction.correction_timestamp
                
                # Update category if it's different (user changed their mind)
                if pattern_data['category'] != correction.corrected_category:
                    pattern_data['category'] = correction.corrected_category
                    pattern_data['confidence'] = 0.6  # Reset confidence
                else:
                    # Increase confidence for consistent corrections
                    pattern_data['confidence'] = min(1.0, 
                        pattern_data['confidence'] + self.config.confidence_boost_factor)
            
            # Add example (keep only recent ones)
            pattern_data = self.user_patterns[user_id][pattern]
            pattern_data['examples'].append({
                'description': correction.transaction_description,
                'amount': correction.transaction_amount,
                'date': correction.transaction_date,
                'correction_date': correction.correction_timestamp
            })
            
            # Keep only recent examples
            pattern_data['examples'] = pattern_data['examples'][-10:]
        
        self.learning_stats['patterns_learned'] += len(patterns)
        
        return {
            'patterns_updated': True,
            'new_patterns_count': len(patterns),
            'patterns': patterns
        }
    
    def _extract_patterns_from_description(self, description: str) -> List[str]:
        """
        Extract learnable patterns from transaction description
        
        Args:
            description: Transaction description
            
        Returns:
            List of patterns
        """
        if not isinstance(description, str):
            return []
        
        patterns = []
        desc_lower = description.lower()
        
        # Extract merchant names (words before common suffixes)
        merchant_patterns = [
            r'(\w+)\s+(?:store|shop|market|center|station|restaurant|cafe|coffee)',
            r'(\w+)\s+(?:inc|llc|corp|company|co)',
            r'(\w{3,})\s+#?\d+',  # Merchant with location number
        ]
        
        for pattern in merchant_patterns:
            matches = re.findall(pattern, desc_lower)
            for match in matches:
                if len(match) >= 3:  # Minimum length for meaningful patterns
                    patterns.append(f"merchant_{match}")
        
        # Extract specific keywords that might be category indicators
        category_keywords = [
            'grocery', 'gas', 'fuel', 'restaurant', 'coffee', 'pharmacy',
            'doctor', 'medical', 'bank', 'atm', 'fee', 'subscription',
            'netflix', 'spotify', 'amazon', 'uber', 'lyft'
        ]
        
        for keyword in category_keywords:
            if keyword in desc_lower:
                patterns.append(f"keyword_{keyword}")
        
        # Extract amount-based patterns
        amount = abs(float(getattr(self, '_current_correction_amount', 0)))
        if amount > 0:
            if amount < 10:
                patterns.append("amount_small")
            elif amount < 50:
                patterns.append("amount_medium")
            elif amount < 200:
                patterns.append("amount_large")
            else:
                patterns.append("amount_very_large")
        
        return list(set(patterns))  # Remove duplicates
    
    def _update_category_mappings(self, correction: UserCorrection) -> Dict[str, Any]:
        """
        Update category mappings based on user corrections
        
        Args:
            correction: User correction data
            
        Returns:
            Mapping update results
        """
        user_id = correction.user_id
        
        if user_id not in self.category_mappings:
            self.category_mappings[user_id] = {}
        
        # Track category changes
        mapping_key = f"{correction.original_category}->{correction.corrected_category}"
        
        if mapping_key not in self.category_mappings[user_id]:
            self.category_mappings[user_id][mapping_key] = {
                'count': 1,
                'confidence': 0.5,
                'first_seen': correction.correction_timestamp,
                'last_updated': correction.correction_timestamp
            }
        else:
            mapping_data = self.category_mappings[user_id][mapping_key]
            mapping_data['count'] += 1
            mapping_data['last_updated'] = correction.correction_timestamp
            mapping_data['confidence'] = min(1.0, 
                mapping_data['confidence'] + self.config.confidence_boost_factor)
        
        return {
            'category_mapping_updated': True,
            'mapping_key': mapping_key
        }
    
    def _adjust_confidence_for_similar(self, correction: UserCorrection) -> Dict[str, Any]:
        """
        Adjust confidence for similar transactions based on correction
        
        Args:
            correction: User correction data
            
        Returns:
            Confidence adjustment results
        """
        # This would typically update a model or database
        # For now, we'll track the adjustment logic
        
        similar_count = 0
        
        # Find similar transactions in recent corrections
        for past_correction in self.corrections_history[-100:]:  # Check last 100
            if (past_correction.user_id == correction.user_id and 
                past_correction.transaction_id != correction.transaction_id):
                
                similarity = self._calculate_transaction_similarity(
                    correction, past_correction
                )
                
                if similarity > self.config.similarity_threshold:
                    similar_count += 1
        
        return {
            'confidence_adjusted': True,
            'similar_transactions_found': similar_count
        }
    
    def _calculate_transaction_similarity(self, 
                                       correction1: UserCorrection, 
                                       correction2: UserCorrection) -> float:
        """
        Calculate similarity between two transactions
        
        Args:
            correction1: First transaction correction
            correction2: Second transaction correction
            
        Returns:
            Similarity score (0-1)
        """
        # Description similarity (using simple word overlap)
        desc1_words = set(correction1.transaction_description.lower().split())
        desc2_words = set(correction2.transaction_description.lower().split())
        
        if len(desc1_words) == 0 and len(desc2_words) == 0:
            desc_similarity = 1.0
        elif len(desc1_words) == 0 or len(desc2_words) == 0:
            desc_similarity = 0.0
        else:
            intersection = len(desc1_words.intersection(desc2_words))
            union = len(desc1_words.union(desc2_words))
            desc_similarity = intersection / union if union > 0 else 0.0
        
        # Amount similarity (using relative difference)
        amount1 = abs(correction1.transaction_amount)
        amount2 = abs(correction2.transaction_amount)
        
        if amount1 == 0 and amount2 == 0:
            amount_similarity = 1.0
        elif amount1 == 0 or amount2 == 0:
            amount_similarity = 0.0
        else:
            amount_diff = abs(amount1 - amount2) / max(amount1, amount2)
            amount_similarity = max(0.0, 1.0 - amount_diff)
        
        # Weighted combination
        total_similarity = (
            self.config.description_weight * desc_similarity +
            self.config.amount_weight * amount_similarity
        )
        
        return total_similarity
    
    def apply_learned_patterns(self, 
                             transactions_df: pd.DataFrame, 
                             user_id: str,
                             original_predictions: List[Dict]) -> List[Dict]:
        """
        Apply learned patterns to improve categorization predictions
        
        Args:
            transactions_df: Transaction data
            user_id: User ID for personalized learning
            original_predictions: Original clustering predictions
            
        Returns:
            Improved predictions with learned patterns applied
        """
        if user_id not in self.user_patterns:
            logger.info(f"No learned patterns found for user {user_id}")
            return original_predictions
        
        improved_predictions = []
        user_patterns = self.user_patterns[user_id]
        
        for i, (_, transaction) in enumerate(transactions_df.iterrows()):
            if i >= len(original_predictions):
                break
                
            original_pred = original_predictions[i].copy()
            
            # Extract patterns from current transaction
            self._current_correction_amount = transaction['amount']  # Temporary storage
            transaction_patterns = self._extract_patterns_from_description(
                transaction['description']
            )
            
            # Check for matching learned patterns
            best_match = None
            best_confidence = 0.0
            
            for pattern in transaction_patterns:
                if pattern in user_patterns:
                    pattern_data = user_patterns[pattern]
                    
                    # Check if pattern is still valid (not too old)
                    pattern_age = (datetime.now() - pattern_data['last_updated']).days
                    if pattern_age <= self.config.max_pattern_age_days:
                        
                        # Check if pattern has enough support
                        if pattern_data['count'] >= self.config.min_corrections_for_pattern:
                            
                            if pattern_data['confidence'] > best_confidence:
                                best_match = pattern_data
                                best_confidence = pattern_data['confidence']
            
            # Apply best matching pattern
            if best_match and best_confidence > original_pred.get('confidence', 0):
                original_pred['category'] = best_match['category']
                original_pred['confidence'] = min(1.0, 
                    original_pred.get('confidence', 0.5) + best_confidence * self.config.learning_rate)
                original_pred['learned_from_user'] = True
                original_pred['learning_pattern'] = pattern
                original_pred['pattern_confidence'] = best_confidence
                
                logger.debug(f"Applied learned pattern '{pattern}' -> {best_match['category']} "
                           f"(confidence: {best_confidence:.3f})")
            else:
                original_pred['learned_from_user'] = False
            
            improved_predictions.append(original_pred)
        
        # Clean up temporary storage
        if hasattr(self, '_current_correction_amount'):
            delattr(self, '_current_correction_amount')
        
        return improved_predictions
    
    def get_user_learning_stats(self, user_id: str) -> Dict[str, Any]:
        """
        Get learning statistics for a specific user
        
        Args:
            user_id: User ID
            
        Returns:
            User-specific learning statistics
        """
        user_corrections = [c for c in self.corrections_history if c.user_id == user_id]
        user_patterns = self.user_patterns.get(user_id, {})
        user_mappings = self.category_mappings.get(user_id, {})
        
        # Calculate category distribution
        category_corrections = Counter(c.corrected_category for c in user_corrections)
        
        # Calculate pattern effectiveness
        effective_patterns = {
            pattern: data for pattern, data in user_patterns.items()
            if data['count'] >= self.config.min_corrections_for_pattern
        }
        
        return {
            'user_id': user_id,
            'total_corrections': len(user_corrections),
            'patterns_learned': len(user_patterns),
            'effective_patterns': len(effective_patterns),
            'category_mappings': len(user_mappings),
            'most_corrected_categories': dict(category_corrections.most_common(5)),
            'learning_effectiveness': len(effective_patterns) / max(1, len(user_patterns)),
            'recent_corrections': len([
                c for c in user_corrections 
                if (datetime.now() - c.correction_timestamp).days <= 7
            ])
        }
    
    def get_global_learning_stats(self) -> Dict[str, Any]:
        """
        Get global learning statistics across all users
        
        Returns:
            Global learning statistics
        """
        total_users = len(set(c.user_id for c in self.corrections_history))
        total_patterns = sum(len(patterns) for patterns in self.user_patterns.values())
        
        # Calculate most common corrections
        all_corrections = Counter(
            f"{c.original_category}->{c.corrected_category}" 
            for c in self.corrections_history
        )
        
        return {
            'total_users_with_corrections': total_users,
            'total_corrections': len(self.corrections_history),
            'total_patterns_learned': total_patterns,
            'average_patterns_per_user': total_patterns / max(1, total_users),
            'most_common_corrections': dict(all_corrections.most_common(10)),
            'learning_stats': self.learning_stats,
            'active_users_last_week': len(set(
                c.user_id for c in self.corrections_history
                if (datetime.now() - c.correction_timestamp).days <= 7
            ))
        }
    
    def _cleanup_old_corrections(self) -> None:
        """Clean up old corrections to manage memory usage"""
        if len(self.corrections_history) > self.config.max_corrections_stored:
            # Keep only the most recent corrections
            self.corrections_history = self.corrections_history[-self.config.max_corrections_stored:]
            logger.info(f"Cleaned up old corrections, kept {len(self.corrections_history)} recent ones")
        
        # Clean up old patterns
        cutoff_date = datetime.now() - timedelta(days=self.config.max_pattern_age_days)
        
        for user_id in list(self.user_patterns.keys()):
            patterns_to_remove = []
            for pattern, data in self.user_patterns[user_id].items():
                if data['last_updated'] < cutoff_date:
                    patterns_to_remove.append(pattern)
            
            for pattern in patterns_to_remove:
                del self.user_patterns[user_id][pattern]
            
            # Remove user entry if no patterns left
            if not self.user_patterns[user_id]:
                del self.user_patterns[user_id]
    
    def export_learned_patterns(self, user_id: str = None) -> Dict[str, Any]:
        """
        Export learned patterns for analysis or backup
        
        Args:
            user_id: Specific user ID, or None for all users
            
        Returns:
            Exported patterns data
        """
        if user_id:
            return {
                'user_id': user_id,
                'patterns': self.user_patterns.get(user_id, {}),
                'category_mappings': self.category_mappings.get(user_id, {}),
                'export_timestamp': datetime.now().isoformat()
            }
        else:
            return {
                'all_users': True,
                'user_patterns': dict(self.user_patterns),
                'category_mappings': dict(self.category_mappings),
                'learning_stats': self.learning_stats,
                'export_timestamp': datetime.now().isoformat()
            }
    
    def import_learned_patterns(self, patterns_data: Dict[str, Any]) -> bool:
        """
        Import learned patterns from exported data
        
        Args:
            patterns_data: Exported patterns data
            
        Returns:
            Success status
        """
        try:
            if patterns_data.get('all_users'):
                self.user_patterns.update(patterns_data['user_patterns'])
                self.category_mappings.update(patterns_data['category_mappings'])
                if 'learning_stats' in patterns_data:
                    self.learning_stats.update(patterns_data['learning_stats'])
            else:
                user_id = patterns_data['user_id']
                if 'patterns' in patterns_data:
                    self.user_patterns[user_id] = patterns_data['patterns']
                if 'category_mappings' in patterns_data:
                    self.category_mappings[user_id] = patterns_data['category_mappings']
            
            logger.info("Successfully imported learned patterns")
            return True
            
        except Exception as e:
            logger.error(f"Failed to import learned patterns: {str(e)}")
            return False
    
    def save_learning_data(self, filepath: str) -> None:
        """
        Save learning data to file
        
        Args:
            filepath: Path to save the learning data
        """
        learning_data = {
            'config': self.config,
            'corrections_history': self.corrections_history,
            'user_patterns': dict(self.user_patterns),
            'category_mappings': dict(self.category_mappings),
            'learned_rules': dict(self.learned_rules),
            'learning_stats': self.learning_stats,
            'is_fitted': self.is_fitted,
            'save_timestamp': datetime.now().isoformat()
        }
        
        joblib.dump(learning_data, filepath)
        logger.info(f"Learning data saved to {filepath}")
    
    @classmethod
    def load_learning_data(cls, filepath: str) -> 'UserFeedbackLearningService':
        """
        Load learning data from file
        
        Args:
            filepath: Path to load the learning data from
            
        Returns:
            Loaded learning service
        """
        learning_data = joblib.load(filepath)
        
        # Create new instance
        service = cls(config=learning_data['config'])
        
        # Restore data
        service.corrections_history = learning_data['corrections_history']
        service.user_patterns = defaultdict(dict, learning_data['user_patterns'])
        service.category_mappings = defaultdict(dict, learning_data['category_mappings'])
        service.learned_rules = defaultdict(list, learning_data['learned_rules'])
        service.learning_stats = learning_data['learning_stats']
        service.is_fitted = learning_data['is_fitted']
        
        logger.info(f"Learning data loaded from {filepath}")
        return service