#!/usr/bin/env python3
"""
Test script for Financial Stress Calculator

This script tests the financial stress calculation functionality
with sample data to ensure it works correctly.
"""

import sys
import os
import json
from datetime import datetime, timedelta

# Add the src directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from services.financial_stress_calculator import FinancialStressCalculator, RiskLevel

def create_sample_transaction_history():
    """Create sample transaction history for testing"""
    transactions = []
    base_date = datetime.now() - timedelta(days=90)
    
    # Generate 3 months of sample transactions
    for i in range(90):
        date = base_date + timedelta(days=i)
        
        # Add some income transactions (monthly salary)
        if date.day == 1:
            transactions.append({
                'id': f'income_{i}',
                'date': date.isoformat(),
                'amount': 5000.0,  # Monthly salary
                'description': 'Salary Payment'
            })
        
        # Add regular expenses
        if i % 7 == 0:  # Weekly groceries
            transactions.append({
                'id': f'grocery_{i}',
                'date': date.isoformat(),
                'amount': -150.0,
                'description': 'Grocery Store'
            })
        
        if i % 30 == 15:  # Monthly rent
            transactions.append({
                'id': f'rent_{i}',
                'date': date.isoformat(),
                'amount': -1200.0,
                'description': 'Rent Payment'
            })
        
        # Add some random expenses
        if i % 3 == 0:
            transactions.append({
                'id': f'misc_{i}',
                'date': date.isoformat(),
                'amount': -50.0,
                'description': 'Coffee Shop'
            })
    
    return transactions

def create_sample_predictions():
    """Create sample balance predictions"""
    predictions = []
    base_date = datetime.now()
    current_balance = 2500.0
    
    for i in range(30):
        date = base_date + timedelta(days=i+1)
        # Simulate declining balance
        predicted_balance = current_balance - (i * 50)  # Declining by $50/day
        
        predictions.append({
            'date': date.isoformat(),
            'predicted_balance': predicted_balance,
            'day_ahead': i + 1
        })
    
    return predictions

def test_financial_stress_calculator():
    """Test the financial stress calculator with sample data"""
    print("Testing Financial Stress Calculator...")
    print("=" * 50)
    
    # Initialize calculator
    calculator = FinancialStressCalculator()
    
    # Create sample data
    user_id = "test_user_123"
    current_balance = 2500.0
    transaction_history = create_sample_transaction_history()
    predictions = create_sample_predictions()
    
    print(f"Sample data created:")
    print(f"- User ID: {user_id}")
    print(f"- Current Balance: ${current_balance:,.2f}")
    print(f"- Transaction History: {len(transaction_history)} transactions")
    print(f"- Predictions: {len(predictions)} days ahead")
    print()
    
    try:
        # Calculate stress score
        result = calculator.calculate_stress_score(
            user_id=user_id,
            current_balance=current_balance,
            predictions=predictions,
            transaction_history=transaction_history
        )
        
        print("STRESS SCORE CALCULATION RESULTS:")
        print("=" * 40)
        print(f"User ID: {result.user_id}")
        print(f"Stress Score: {result.stress_score:.1f}/100")
        print(f"Risk Level: {result.risk_level.value.upper()}")
        print(f"Calculated At: {result.calculated_at}")
        print()
        
        print("FINANCIAL METRICS:")
        print("-" * 20)
        print(f"Current Balance: ${result.current_balance:,.2f}")
        print(f"Predicted Balance (30d): ${result.predicted_balance_30d:,.2f}")
        print(f"Monthly Spending Avg: ${result.monthly_spending_avg:,.2f}")
        print(f"Monthly Income Avg: ${result.monthly_income_avg:,.2f}")
        print(f"Spending Volatility: {result.spending_volatility:.2%}")
        print(f"Savings Rate: {result.savings_rate:.2%}")
        print()
        
        print("STRESS FACTORS:")
        print("-" * 15)
        if result.factors:
            for i, factor in enumerate(result.factors, 1):
                print(f"{i}. {factor.category.value.replace('_', ' ').title()}")
                print(f"   Impact: {factor.impact:.2f}")
                print(f"   Severity: {factor.severity}")
                print(f"   Description: {factor.description}")
                print()
        else:
            print("No significant stress factors detected.")
        
        print("RECOMMENDATIONS:")
        print("-" * 16)
        if result.recommendations:
            for i, rec in enumerate(result.recommendations, 1):
                print(f"{i}. {rec.title} ({rec.priority.upper()})")
                print(f"   Type: {rec.type.value.replace('_', ' ').title()}")
                print(f"   Description: {rec.description}")
                print(f"   Potential Impact: {rec.potential_impact:.2f}")
                if rec.action_items:
                    print("   Action Items:")
                    for item in rec.action_items:
                        print(f"   - {item}")
                print()
        else:
            print("No specific recommendations at this time.")
        
        # Test alerts
        alerts = calculator.get_stress_threshold_alerts(result.stress_score, result.risk_level)
        if alerts:
            print("ALERTS:")
            print("-" * 7)
            for alert in alerts:
                print(f"- {alert['severity'].upper()}: {alert['message']}")
                print(f"  Action Required: {alert['action_required']}")
            print()
        
        print("✅ Financial Stress Calculator test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_edge_cases():
    """Test edge cases for the financial stress calculator"""
    print("\nTesting Edge Cases...")
    print("=" * 30)
    
    calculator = FinancialStressCalculator()
    
    # Test with minimal data
    try:
        result = calculator.calculate_stress_score(
            user_id="edge_case_user",
            current_balance=100.0,
            predictions=[],
            transaction_history=[]
        )
        print(f"✅ Empty data test passed - Stress Score: {result.stress_score:.1f}")
    except Exception as e:
        print(f"❌ Empty data test failed: {str(e)}")
    
    # Test with negative balance
    try:
        result = calculator.calculate_stress_score(
            user_id="negative_balance_user",
            current_balance=-500.0,
            predictions=[{
                'date': datetime.now().isoformat(),
                'predicted_balance': -1000.0,
                'day_ahead': 30
            }],
            transaction_history=[{
                'id': 'test',
                'date': datetime.now().isoformat(),
                'amount': -100.0,
                'description': 'Test expense'
            }]
        )
        print(f"✅ Negative balance test passed - Stress Score: {result.stress_score:.1f}")
    except Exception as e:
        print(f"❌ Negative balance test failed: {str(e)}")

if __name__ == "__main__":
    print("Financial Stress Calculator Test Suite")
    print("=" * 60)
    
    success = test_financial_stress_calculator()
    test_edge_cases()
    
    if success:
        print("\n🎉 All tests completed!")
    else:
        print("\n⚠️  Some tests failed. Check the output above.")
        sys.exit(1)