#!/usr/bin/env python3
"""
Test script for Financial Stress API endpoint

This script tests the /ml/stress-score API endpoint
"""

import requests
import json
from datetime import datetime, timedelta

def create_test_data():
    """Create test data for API call"""
    # Sample transaction history
    transactions = []
    base_date = datetime.now() - timedelta(days=60)
    
    for i in range(60):
        date = base_date + timedelta(days=i)
        
        # Monthly income
        if date.day == 1:
            transactions.append({
                'id': f'income_{i}',
                'date': date.isoformat(),
                'amount': 4000.0,
                'description': 'Salary Payment'
            })
        
        # Regular expenses
        if i % 7 == 0:
            transactions.append({
                'id': f'grocery_{i}',
                'date': date.isoformat(),
                'amount': -120.0,
                'description': 'Grocery Store'
            })
        
        if i % 30 == 15:
            transactions.append({
                'id': f'rent_{i}',
                'date': date.isoformat(),
                'amount': -1000.0,
                'description': 'Rent Payment'
            })
    
    # Sample predictions
    predictions = []
    base_date = datetime.now()
    current_balance = 1500.0
    
    for i in range(30):
        date = base_date + timedelta(days=i+1)
        predicted_balance = current_balance - (i * 30)  # Declining balance
        
        predictions.append({
            'date': date.isoformat(),
            'predicted_balance': predicted_balance,
            'day_ahead': i + 1
        })
    
    return {
        'user_id': 'test_api_user',
        'current_balance': current_balance,
        'predictions': predictions,
        'transaction_history': transactions
    }

def test_stress_score_api():
    """Test the stress score API endpoint"""
    print("Testing Financial Stress Score API...")
    print("=" * 50)
    
    # API endpoint
    url = "http://localhost:5001/ml/stress-score"
    
    # Create test data
    test_data = create_test_data()
    
    print(f"Test data prepared:")
    print(f"- User ID: {test_data['user_id']}")
    print(f"- Current Balance: ${test_data['current_balance']:,.2f}")
    print(f"- Transactions: {len(test_data['transaction_history'])}")
    print(f"- Predictions: {len(test_data['predictions'])} days")
    print()
    
    try:
        # Make API request
        print("Making API request...")
        response = requests.post(url, json=test_data, timeout=30)
        
        print(f"Response Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            
            print("\n✅ API REQUEST SUCCESSFUL!")
            print("=" * 30)
            print(f"User ID: {result['user_id']}")
            print(f"Stress Score: {result['stress_score']:.1f}/100")
            print(f"Risk Level: {result['risk_level'].upper()}")
            print(f"Factors Found: {len(result['factors'])}")
            print(f"Recommendations: {len(result['recommendations'])}")
            print(f"Alerts: {len(result.get('alerts', []))}")
            
            # Show top factors
            if result['factors']:
                print("\nTop Stress Factors:")
                for i, factor in enumerate(result['factors'][:3], 1):
                    print(f"{i}. {factor['category'].replace('_', ' ').title()}")
                    print(f"   Impact: {factor['impact']:.2f}")
                    print(f"   {factor['description']}")
            
            # Show top recommendations
            if result['recommendations']:
                print("\nTop Recommendations:")
                for i, rec in enumerate(result['recommendations'][:2], 1):
                    print(f"{i}. {rec['title']} ({rec['priority'].upper()})")
                    print(f"   {rec['description']}")
            
            return True
            
        else:
            print(f"❌ API request failed with status {response.status_code}")
            print("Response:", response.text)
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection failed. Make sure the ML service is running on localhost:5001")
        print("To start the service, run: python app.py")
        return False
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        return False

if __name__ == "__main__":
    print("Financial Stress Score API Test")
    print("=" * 40)
    
    success = test_stress_score_api()
    
    if success:
        print("\n🎉 API test completed successfully!")
    else:
        print("\n⚠️  API test failed. Check the ML service is running.")