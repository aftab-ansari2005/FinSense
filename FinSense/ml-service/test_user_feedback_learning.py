"""
Tests for User Feedback Learning Service

This module contains comprehensive tests for the user feedback learning system,
including pattern learning, category mapping, and confidence adjustment.
"""

import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from unittest.mock import Mock, patch

from src.services.user_feedback_learning import (
    UserFeedbackLearningService, 
    UserCorrection, 
    LearningConfig
)

class TestUserFeedbackLearningService:
    """Test cases for UserFeedbackLearningService"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.config = LearningConfig(
            learning_rate=0.1,
            min_corrections_for_pattern=2,
            max_pattern_age_days=30,
            confidence_boost_factor=0.2
        )
        self.service = UserFeedbackLearningService(self.config)
        
        # Sample correction data
        self.sample_correction = UserCorrection(
            transaction_id="txn_001",
            user_id="user_123",
            original_category="Other",
            corrected_category="Groceries",
            confidence_score=0.4,
            transaction_description="WALMART SUPERCENTER #1234",
            transaction_amount=-85.67,
            transaction_date=datetime.now() - timedelta(days=1),
            correction_timestamp=datetime.now(),
            feedback_type="manual_correction"
        )
    
    def test_initialization(self):
        """Test service initialization"""
        assert self.service.config == self.config
        assert len(self.service.corrections_history) == 0
        assert len(self.service.user_patterns) == 0
        assert len(self.service.category_mappings) == 0
        assert not self.service.is_fitted
    
    def test_add_user_correction(self):
        """Test adding a user correction"""
        result = self.service.add_user_correction(self.sample_correction)
        
        assert result['correction_added'] is True
        assert result['patterns_updated'] is True
        assert len(self.service.corrections_history) == 1
        assert self.service.learning_stats['total_corrections'] == 1
        
        # Check that patterns were learned
        user_patterns = self.service.user_patterns['user_123']
        assert len(user_patterns) > 0
        
        # Check that category mapping was updated
        user_mappings = self.service.category_mappings['user_123']
        assert len(user_mappings) > 0
    
    def test_pattern_extraction(self):
        """Test pattern extraction from transaction descriptions"""
        patterns = self.service._extract_patterns_from_description("WALMART SUPERCENTER #1234")
        
        assert 'merchant_walmart' in patterns
        assert 'keyword_grocery' not in patterns  # Should not match without explicit keyword
        
        patterns2 = self.service._extract_patterns_from_description("STARBUCKS COFFEE #567")
        assert 'merchant_starbucks' in patterns2
        assert 'keyword_coffee' in patterns2
    
    def test_pattern_learning_consistency(self):
        """Test that consistent corrections strengthen patterns"""
        # Add multiple corrections for the same pattern
        corrections = [
            UserCorrection(
                transaction_id=f"txn_{i:03d}",
                user_id="user_123",
                original_category="Other",
                corrected_category="Groceries",
                confidence_score=0.4,
                transaction_description=f"WALMART SUPERCENTER #{1234 + i}",
                transaction_amount=-50.0 - i,
                transaction_date=datetime.now() - timedelta(days=i),
                correction_timestamp=datetime.now(),
                feedback_type="manual_correction"
            )
            for i in range(3)
        ]
        
        for correction in corrections:
            self.service.add_user_correction(correction)
        
        # Check that pattern confidence increased
        user_patterns = self.service.user_patterns['user_123']
        walmart_pattern = None
        for pattern, data in user_patterns.items():
            if 'walmart' in pattern:
                walmart_pattern = data
                break
        
        assert walmart_pattern is not None
        assert walmart_pattern['count'] == 3
        assert walmart_pattern['confidence'] > 0.5  # Should have increased
        assert walmart_pattern['category'] == 'Groceries'
    
    def test_category_mapping_tracking(self):
        """Test category mapping tracking"""
        self.service.add_user_correction(self.sample_correction)
        
        user_mappings = self.service.category_mappings['user_123']
        mapping_key = "Other->Groceries"
        
        assert mapping_key in user_mappings
        assert user_mappings[mapping_key]['count'] == 1
        assert user_mappings[mapping_key]['confidence'] == 0.5
    
    def test_transaction_similarity_calculation(self):
        """Test transaction similarity calculation"""
        correction1 = UserCorrection(
            transaction_id="txn_001",
            user_id="user_123",
            original_category="Other",
            corrected_category="Groceries",
            confidence_score=0.4,
            transaction_description="WALMART SUPERCENTER #1234",
            transaction_amount=-85.67,
            transaction_date=datetime.now(),
            correction_timestamp=datetime.now(),
            feedback_type="manual_correction"
        )
        
        correction2 = UserCorrection(
            transaction_id="txn_002",
            user_id="user_123",
            original_category="Other",
            corrected_category="Groceries",
            confidence_score=0.4,
            transaction_description="WALMART SUPERCENTER #5678",
            transaction_amount=-92.34,
            transaction_date=datetime.now(),
            correction_timestamp=datetime.now(),
            feedback_type="manual_correction"
        )
        
        similarity = self.service._calculate_transaction_similarity(correction1, correction2)
        assert similarity > 0.7  # Should be high similarity
        
        # Test with different transaction
        correction3 = UserCorrection(
            transaction_id="txn_003",
            user_id="user_123",
            original_category="Other",
            corrected_category="Gas",
            confidence_score=0.4,
            transaction_description="SHELL GAS STATION",
            transaction_amount=-45.00,
            transaction_date=datetime.now(),
            correction_timestamp=datetime.now(),
            feedback_type="manual_correction"
        )
        
        similarity2 = self.service._calculate_transaction_similarity(correction1, correction3)
        assert similarity2 < 0.3  # Should be low similarity
    
    def test_apply_learned_patterns(self):
        """Test applying learned patterns to new transactions"""
        # Add some corrections to build patterns
        corrections = [
            UserCorrection(
                transaction_id=f"txn_{i:03d}",
                user_id="user_123",
                original_category="Other",
                corrected_category="Groceries",
                confidence_score=0.4,
                transaction_description=f"WALMART SUPERCENTER #{1234 + i}",
                transaction_amount=-50.0 - i,
                transaction_date=datetime.now() - timedelta(days=i),
                correction_timestamp=datetime.now(),
                feedback_type="manual_correction"
            )
            for i in range(3)
        ]
        
        for correction in corrections:
            self.service.add_user_correction(correction)
        
        # Create new transactions to categorize
        new_transactions = pd.DataFrame([
            {
                'description': 'WALMART SUPERCENTER #9999',
                'amount': -75.50,
                'date': datetime.now()
            },
            {
                'description': 'SHELL GAS STATION',
                'amount': -45.00,
                'date': datetime.now()
            }
        ])
        
        # Original predictions (mock)
        original_predictions = [
            {'category': 'Other', 'confidence': 0.3},
            {'category': 'Other', 'confidence': 0.4}
        ]
        
        # Apply learned patterns
        improved_predictions = self.service.apply_learned_patterns(
            new_transactions, 'user_123', original_predictions
        )
        
        # First transaction should be improved (Walmart pattern learned)
        assert improved_predictions[0]['category'] == 'Groceries'
        assert improved_predictions[0]['learned_from_user'] is True
        assert improved_predictions[0]['confidence'] > original_predictions[0]['confidence']
        
        # Second transaction should remain unchanged (no pattern learned)
        assert improved_predictions[1]['learned_from_user'] is False
    
    def test_user_learning_stats(self):
        """Test user learning statistics"""
        # Add multiple corrections
        corrections = [
            UserCorrection(
                transaction_id=f"txn_{i:03d}",
                user_id="user_123",
                original_category="Other",
                corrected_category="Groceries" if i < 2 else "Gas",
                confidence_score=0.4,
                transaction_description=f"WALMART SUPERCENTER #{1234 + i}" if i < 2 else f"SHELL GAS #{i}",
                transaction_amount=-50.0 - i,
                transaction_date=datetime.now() - timedelta(days=i),
                correction_timestamp=datetime.now(),
                feedback_type="manual_correction"
            )
            for i in range(4)
        ]
        
        for correction in corrections:
            self.service.add_user_correction(correction)
        
        stats = self.service.get_user_learning_stats('user_123')
        
        assert stats['user_id'] == 'user_123'
        assert stats['total_corrections'] == 4
        assert stats['patterns_learned'] > 0
        assert 'Groceries' in stats['most_corrected_categories']
        assert stats['learning_effectiveness'] >= 0
    
    def test_global_learning_stats(self):
        """Test global learning statistics"""
        # Add corrections for multiple users
        users = ['user_123', 'user_456']
        for user_id in users:
            correction = UserCorrection(
                transaction_id=f"txn_{user_id}",
                user_id=user_id,
                original_category="Other",
                corrected_category="Groceries",
                confidence_score=0.4,
                transaction_description="WALMART SUPERCENTER #1234",
                transaction_amount=-50.0,
                transaction_date=datetime.now(),
                correction_timestamp=datetime.now(),
                feedback_type="manual_correction"
            )
            self.service.add_user_correction(correction)
        
        stats = self.service.get_global_learning_stats()
        
        assert stats['total_users_with_corrections'] == 2
        assert stats['total_corrections'] == 2
        assert stats['total_patterns_learned'] > 0
        assert stats['average_patterns_per_user'] > 0
    
    def test_pattern_cleanup(self):
        """Test cleanup of old patterns"""
        # Create service with short pattern age limit
        config = LearningConfig(max_pattern_age_days=1, max_corrections_stored=2)
        service = UserFeedbackLearningService(config)
        
        # Add old correction
        old_correction = UserCorrection(
            transaction_id="txn_old",
            user_id="user_123",
            original_category="Other",
            corrected_category="Groceries",
            confidence_score=0.4,
            transaction_description="WALMART SUPERCENTER #1234",
            transaction_amount=-50.0,
            transaction_date=datetime.now() - timedelta(days=5),
            correction_timestamp=datetime.now() - timedelta(days=5),
            feedback_type="manual_correction"
        )
        
        service.add_user_correction(old_correction)
        
        # Add more corrections to trigger cleanup
        for i in range(3):
            correction = UserCorrection(
                transaction_id=f"txn_{i}",
                user_id="user_123",
                original_category="Other",
                corrected_category="Gas",
                confidence_score=0.4,
                transaction_description=f"SHELL GAS #{i}",
                transaction_amount=-40.0,
                transaction_date=datetime.now(),
                correction_timestamp=datetime.now(),
                feedback_type="manual_correction"
            )
            service.add_user_correction(correction)
        
        # Check that corrections were limited
        assert len(service.corrections_history) <= config.max_corrections_stored
    
    def test_export_import_patterns(self):
        """Test exporting and importing learned patterns"""
        # Add some corrections
        self.service.add_user_correction(self.sample_correction)
        
        # Export patterns
        exported_data = self.service.export_learned_patterns('user_123')
        
        assert exported_data['user_id'] == 'user_123'
        assert 'patterns' in exported_data
        assert 'category_mappings' in exported_data
        assert 'export_timestamp' in exported_data
        
        # Create new service and import patterns
        new_service = UserFeedbackLearningService()
        success = new_service.import_learned_patterns(exported_data)
        
        assert success is True
        assert 'user_123' in new_service.user_patterns
        assert 'user_123' in new_service.category_mappings
    
    def test_save_load_learning_data(self, tmp_path):
        """Test saving and loading learning data"""
        # Add some corrections
        self.service.add_user_correction(self.sample_correction)
        
        # Save learning data
        filepath = tmp_path / "learning_data.pkl"
        self.service.save_learning_data(str(filepath))
        
        # Load learning data
        loaded_service = UserFeedbackLearningService.load_learning_data(str(filepath))
        
        assert len(loaded_service.corrections_history) == 1
        assert 'user_123' in loaded_service.user_patterns
        assert loaded_service.learning_stats['total_corrections'] == 1
    
    def test_edge_cases(self):
        """Test edge cases and error handling"""
        # Test with empty description
        patterns = self.service._extract_patterns_from_description("")
        assert len(patterns) == 0
        
        # Test with None description
        patterns = self.service._extract_patterns_from_description(None)
        assert len(patterns) == 0
        
        # Test applying patterns with no learned patterns
        transactions_df = pd.DataFrame([
            {'description': 'TEST', 'amount': -10.0, 'date': datetime.now()}
        ])
        original_predictions = [{'category': 'Other', 'confidence': 0.5}]
        
        improved_predictions = self.service.apply_learned_patterns(
            transactions_df, 'unknown_user', original_predictions
        )
        
        assert improved_predictions == original_predictions
    
    def test_confidence_adjustment(self):
        """Test confidence adjustment for similar transactions"""
        # Add initial correction
        result = self.service.add_user_correction(self.sample_correction)
        
        assert result['confidence_adjusted'] is True
        assert 'similar_transactions_found' in result
    
    def test_pattern_age_validation(self):
        """Test that old patterns are not applied"""
        # Create service with very short pattern age
        config = LearningConfig(max_pattern_age_days=0)  # Patterns expire immediately
        service = UserFeedbackLearningService(config)
        
        # Add correction
        service.add_user_correction(self.sample_correction)
        
        # Try to apply patterns (should not apply due to age)
        transactions_df = pd.DataFrame([
            {'description': 'WALMART SUPERCENTER #9999', 'amount': -75.50, 'date': datetime.now()}
        ])
        original_predictions = [{'category': 'Other', 'confidence': 0.3}]
        
        improved_predictions = service.apply_learned_patterns(
            transactions_df, 'user_123', original_predictions
        )
        
        # Should not be improved due to pattern age
        assert improved_predictions[0]['learned_from_user'] is False

class TestLearningConfig:
    """Test cases for LearningConfig"""
    
    def test_default_config(self):
        """Test default configuration values"""
        config = LearningConfig()
        
        assert config.learning_rate == 0.1
        assert config.min_corrections_for_pattern == 3
        assert config.max_pattern_age_days == 90
        assert config.confidence_boost_factor == 0.2
        assert config.similarity_threshold == 0.8
        assert config.enable_pattern_learning is True
        assert config.enable_category_mapping is True
        assert config.enable_confidence_adjustment is True
    
    def test_custom_config(self):
        """Test custom configuration values"""
        config = LearningConfig(
            learning_rate=0.2,
            min_corrections_for_pattern=5,
            max_pattern_age_days=60,
            confidence_boost_factor=0.3
        )
        
        assert config.learning_rate == 0.2
        assert config.min_corrections_for_pattern == 5
        assert config.max_pattern_age_days == 60
        assert config.confidence_boost_factor == 0.3

class TestUserCorrection:
    """Test cases for UserCorrection dataclass"""
    
    def test_user_correction_creation(self):
        """Test UserCorrection creation"""
        correction = UserCorrection(
            transaction_id="txn_001",
            user_id="user_123",
            original_category="Other",
            corrected_category="Groceries",
            confidence_score=0.4,
            transaction_description="WALMART SUPERCENTER #1234",
            transaction_amount=-85.67,
            transaction_date=datetime.now(),
            correction_timestamp=datetime.now(),
            feedback_type="manual_correction"
        )
        
        assert correction.transaction_id == "txn_001"
        assert correction.user_id == "user_123"
        assert correction.original_category == "Other"
        assert correction.corrected_category == "Groceries"
        assert correction.confidence_score == 0.4
        assert correction.feedback_type == "manual_correction"

if __name__ == '__main__':
    pytest.main([__file__])