#!/usr/bin/env python3
"""
Validation script for Financial Stress Calculator

This script validates the financial stress calculation functionality
by testing the service components directly.
"""

import sys
import os
import json
from datetime import datetime, timedelta

# Add the src directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

def test_stress_calculator_integration():
    """Test the integration between the calculator and the API schemas"""
    print("Testing Financial Stress Calculator Integration...")
    print("=" * 60)
    
    try:
        # Import required modules
        from services.financial_stress_calculator import (
            FinancialStressCalculator, 
            RiskLevel, 
            FactorCategory,
            RecommendationType
        )
        
        print("✅ Successfully imported FinancialStressCalculator")
        
        # Test calculator initialization
        calculator = FinancialStressCalculator()
        print("✅ Calculator initialized successfully")
        
        # Test with realistic data
        user_id = "validation_user"
        current_balance = 3000.0
        
        # Create transaction history
        transactions = []
        base_date = datetime.now() - timedelta(days=90)
        
        # Add monthly income
        for month in range(3):
            income_date = base_date + timedelta(days=month*30)
            transactions.append({
                'id': f'salary_{month}',
                'date': income_date.isoformat(),
                'amount': 4500.0,
                'description': 'Monthly Salary'
            })
        
        # Add regular expenses
        for day in range(90):
            date = base_date + timedelta(days=day)
            
            if day % 7 == 0:  # Weekly groceries
                transactions.append({
                    'id': f'grocery_{day}',
                    'date': date.isoformat(),
                    'amount': -150.0,
                    'description': 'Grocery Shopping'
                })
            
            if day % 30 == 1:  # Monthly rent
                transactions.append({
                    'id': f'rent_{day}',
                    'date': date.isoformat(),
                    'amount': -1200.0,
                    'description': 'Rent Payment'
                })
            
            if day % 5 == 0:  # Regular expenses
                transactions.append({
                    'id': f'misc_{day}',
                    'date': date.isoformat(),
                    'amount': -25.0,
                    'description': 'Coffee/Lunch'
                })
        
        # Create predictions showing declining balance
        predictions = []
        for i in range(30):
            date = datetime.now() + timedelta(days=i+1)
            predicted_balance = current_balance - (i * 40)  # Declining by $40/day
            
            predictions.append({
                'date': date.isoformat(),
                'predicted_balance': predicted_balance,
                'day_ahead': i + 1
            })
        
        print(f"✅ Test data created: {len(transactions)} transactions, {len(predictions)} predictions")
        
        # Calculate stress score
        result = calculator.calculate_stress_score(
            user_id=user_id,
            current_balance=current_balance,
            predictions=predictions,
            transaction_history=transactions
        )
        
        print("✅ Stress score calculation completed")
        
        # Validate result structure
        assert result.user_id == user_id
        assert 0 <= result.stress_score <= 100
        assert result.risk_level in [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL]
        assert isinstance(result.factors, list)
        assert isinstance(result.recommendations, list)
        assert isinstance(result.calculated_at, datetime)
        
        print("✅ Result structure validation passed")
        
        # Test result conversion to dict
        result_dict = result.to_dict()
        assert 'user_id' in result_dict
        assert 'stress_score' in result_dict
        assert 'risk_level' in result_dict
        assert 'factors' in result_dict
        assert 'recommendations' in result_dict
        
        print("✅ Result serialization validation passed")
        
        # Test alerts generation
        alerts = calculator.get_stress_threshold_alerts(result.stress_score, result.risk_level)
        assert isinstance(alerts, list)
        
        print("✅ Alerts generation validation passed")
        
        # Display results
        print("\nVALIDATION RESULTS:")
        print("-" * 30)
        print(f"Stress Score: {result.stress_score:.1f}/100")
        print(f"Risk Level: {result.risk_level.value}")
        print(f"Factors Identified: {len(result.factors)}")
        print(f"Recommendations Generated: {len(result.recommendations)}")
        print(f"Alerts Generated: {len(alerts)}")
        
        if result.factors:
            print("\nTop Stress Factors:")
            for factor in result.factors[:3]:
                print(f"- {factor.category.value.replace('_', ' ').title()}: {factor.impact:.2f} impact")
        
        if result.recommendations:
            print("\nTop Recommendations:")
            for rec in result.recommendations[:3]:
                print(f"- {rec.title} ({rec.priority})")
        
        print("\n✅ All validation tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Validation failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_api_schema_compatibility():
    """Test compatibility with API schemas"""
    print("\nTesting API Schema Compatibility...")
    print("=" * 40)
    
    try:
        # Test that we can import the schemas from app.py
        import sys
        sys.path.append('.')
        
        # Import the schemas (this will fail if there are syntax errors)
        from app import StressScoreRequestSchema, StressScoreResponseSchema
        
        print("✅ API schemas imported successfully")
        
        # Test request schema validation
        request_schema = StressScoreRequestSchema()
        sample_request = {
            'user_id': 'test_user',
            'current_balance': 1000.0,
            'predictions': [
                {
                    'date': datetime.now().isoformat(),
                    'predicted_balance': 900.0,
                    'day_ahead': 30
                }
            ],
            'transaction_history': [
                {
                    'id': 'test_transaction',
                    'date': datetime.now().isoformat(),
                    'amount': -50.0,
                    'description': 'Test expense'
                }
            ]
        }
        
        validated_request = request_schema.load(sample_request)
        print("✅ Request schema validation passed")
        
        # Test response schema validation
        response_schema = StressScoreResponseSchema()
        sample_response = {
            'user_id': 'test_user',
            'stress_score': 45.5,
            'risk_level': 'medium',
            'factors': [
                {
                    'category': 'balance_projection',
                    'impact': 0.3,
                    'description': 'Test factor',
                    'severity': 'medium'
                }
            ],
            'recommendations': [
                {
                    'type': 'reduce_spending',
                    'priority': 'medium',
                    'title': 'Test recommendation',
                    'description': 'Test description'
                }
            ],
            'calculated_at': datetime.now()
        }
        
        validated_response = response_schema.dump(sample_response)
        print("✅ Response schema validation passed")
        
        return True
        
    except Exception as e:
        print(f"❌ Schema compatibility test failed: {str(e)}")
        return False

if __name__ == "__main__":
    print("Financial Stress Calculator Validation Suite")
    print("=" * 70)
    
    success1 = test_stress_calculator_integration()
    success2 = test_api_schema_compatibility()
    
    if success1 and success2:
        print("\n🎉 All validation tests passed! The Financial Stress Calculator is ready.")
    else:
        print("\n⚠️  Some validation tests failed. Check the output above.")
        sys.exit(1)