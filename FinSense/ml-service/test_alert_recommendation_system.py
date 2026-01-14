#!/usr/bin/env python3
"""
Test script for Alert and Recommendation System

This script tests the enhanced alert and recommendation functionality
with various scenarios and user preferences.
"""

import sys
import os
import json
from datetime import datetime, timedelta

# Add the src directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from services.alert_recommendation_system import (
    AlertRecommendationSystem,
    UserAlertPreferences,
    NotificationChannel,
    AlertType,
    AlertSeverity
)

def create_test_data():
    """Create comprehensive test data"""
    # High-stress scenario data
    transactions = []
    base_date = datetime.now() - timedelta(days=90)
    
    # Generate transactions showing financial stress
    for i in range(90):
        date = base_date + timedelta(days=i)
        
        # Irregular income
        if i % 45 == 0:  # Income every 45 days (irregular)
            transactions.append({
                'id': f'income_{i}',
                'date': date.isoformat(),
                'amount': 3000.0,  # Lower income
                'description': 'Freelance Payment'
            })
        
        # High expenses
        if i % 3 == 0:  # Frequent expenses
            transactions.append({
                'id': f'expense_{i}',
                'date': date.isoformat(),
                'amount': -80.0,  # High daily expenses
                'description': 'Daily Expenses'
            })
        
        # Large recurring expenses
        if i % 30 == 15:
            transactions.append({
                'id': f'rent_{i}',
                'date': date.isoformat(),
                'amount': -1500.0,  # High rent
                'description': 'Rent Payment'
            })
    
    # Declining balance predictions
    predictions = []
    current_balance = 800.0  # Low starting balance
    
    for i in range(30):
        date = datetime.now() + timedelta(days=i+1)
        predicted_balance = current_balance - (i * 60)  # Rapid decline
        
        predictions.append({
            'date': date.isoformat(),
            'predicted_balance': max(0, predicted_balance),  # Don't go below 0
            'day_ahead': i + 1
        })
    
    return {
        'user_id': 'test_alert_user',
        'current_balance': current_balance,
        'predictions': predictions,
        'transaction_history': transactions
    }

def test_alert_recommendation_system():
    """Test the comprehensive alert and recommendation system"""
    print("Testing Alert and Recommendation System...")
    print("=" * 60)
    
    # Initialize system
    alert_system = AlertRecommendationSystem()
    
    # Create test data
    test_data = create_test_data()
    user_id = test_data['user_id']
    
    print(f"Test scenario:")
    print(f"- User ID: {user_id}")
    print(f"- Current Balance: ${test_data['current_balance']:,.2f}")
    print(f"- Transactions: {len(test_data['transaction_history'])}")
    print(f"- Predictions: {len(test_data['predictions'])} days")
    print()
    
    try:
        # Test 1: Process financial analysis
        print("1. Processing Financial Analysis...")
        analysis_result = alert_system.process_financial_analysis(
            user_id=user_id,
            current_balance=test_data['current_balance'],
            predictions=test_data['predictions'],
            transaction_history=test_data['transaction_history']
        )
        
        stress_result = analysis_result['stress_result']
        alerts = analysis_result['alerts']
        recommendations = analysis_result['recommendations']
        
        print(f"✅ Analysis completed:")
        print(f"   - Stress Score: {stress_result['stress_score']:.1f}")
        print(f"   - Risk Level: {stress_result['risk_level']}")
        print(f"   - Alerts Generated: {len(alerts)}")
        print(f"   - Recommendations: {len(recommendations)}")
        print()
        
        # Test 2: Display alerts
        print("2. Generated Alerts:")
        for i, alert in enumerate(alerts, 1):
            print(f"   {i}. {alert['title']} ({alert['severity'].upper()})")
            print(f"      {alert['message']}")
            print(f"      Action Required: {alert['action_required']}")
        print()
        
        # Test 3: Display recommendations
        print("3. Generated Recommendations:")
        for i, rec in enumerate(recommendations, 1):
            print(f"   {i}. {rec['title']} ({rec['priority'].upper()})")
            print(f"      {rec['description']}")
            print(f"      Potential Impact: {rec['potential_impact']:.2f}")
            if rec['action_items']:
                print(f"      Action Items:")
                for item in rec['action_items'][:2]:  # Show first 2
                    print(f"      - {item}")
        print()
        
        # Test 4: User preferences
        print("4. Testing User Preferences...")
        preferences = UserAlertPreferences(
            user_id=user_id,
            enabled_channels=[NotificationChannel.DASHBOARD, NotificationChannel.EMAIL],
            quiet_hours_start=23,
            quiet_hours_end=7,
            max_alerts_per_day=3,
            custom_thresholds={
                AlertType.STRESS_THRESHOLD.value: 40.0,  # Lower threshold
                AlertType.BALANCE_DECLINE.value: 0.15    # More sensitive
            }
        )
        
        success = alert_system.set_user_preferences(preferences)
        print(f"✅ User preferences set: {success}")
        
        # Test with new preferences
        analysis_result_2 = alert_system.process_financial_analysis(
            user_id=user_id,
            current_balance=test_data['current_balance'],
            predictions=test_data['predictions'],
            transaction_history=test_data['transaction_history']
        )
        
        print(f"   - Alerts with custom preferences: {len(analysis_result_2['alerts'])}")
        print()
        
        # Test 5: Alert management
        print("5. Testing Alert Management...")
        active_alerts = alert_system.get_active_alerts(user_id)
        print(f"✅ Active alerts retrieved: {len(active_alerts)}")
        
        if active_alerts:
            # Acknowledge first alert
            first_alert_id = active_alerts[0]['alert_id']
            ack_success = alert_system.acknowledge_alert(user_id, first_alert_id)
            print(f"✅ Alert acknowledged: {ack_success}")
            
            # Check active alerts again
            remaining_alerts = alert_system.get_active_alerts(user_id)
            print(f"   - Remaining active alerts: {len(remaining_alerts)}")
        print()
        
        # Test 6: Recommendation progress
        print("6. Testing Recommendation Progress...")
        rec_status = alert_system.get_recommendation_status(user_id)
        print(f"✅ Recommendation status retrieved: {len(rec_status)} items")
        
        if rec_status:
            # Update first recommendation
            first_rec_id = rec_status[0]['recommendation_id']
            update_success = alert_system.update_recommendation_status(
                user_id, first_rec_id, 'in_progress', 'Started working on this recommendation'
            )
            print(f"✅ Recommendation status updated: {update_success}")
        print()
        
        # Test 7: Statistics
        print("7. Testing Statistics...")
        stats = alert_system.get_alert_statistics(user_id, days=30)
        print(f"✅ Alert statistics:")
        print(f"   - Total alerts (30 days): {stats['total_alerts']}")
        print(f"   - Acknowledgment rate: {stats['acknowledgment_rate']:.2%}")
        print(f"   - By severity: {stats['by_severity']}")
        print()
        
        # Test 8: Cleanup
        print("8. Testing Cleanup...")
        cleaned = alert_system.cleanup_expired_alerts(user_id)
        print(f"✅ Expired alerts cleaned: {cleaned}")
        print()
        
        print("🎉 All alert and recommendation system tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_edge_cases():
    """Test edge cases for the alert system"""
    print("\nTesting Edge Cases...")
    print("=" * 30)
    
    alert_system = AlertRecommendationSystem()
    
    # Test with minimal data
    try:
        result = alert_system.process_financial_analysis(
            user_id="edge_case_user",
            current_balance=0.0,
            predictions=[],
            transaction_history=[]
        )
        print(f"✅ Empty data test passed - Generated {len(result['alerts'])} alerts")
    except Exception as e:
        print(f"❌ Empty data test failed: {str(e)}")
    
    # Test with extreme values
    try:
        extreme_data = {
            'user_id': 'extreme_user',
            'current_balance': -1000.0,  # Negative balance
            'predictions': [{
                'date': datetime.now().isoformat(),
                'predicted_balance': -2000.0,
                'day_ahead': 30
            }],
            'transaction_history': [{
                'id': 'extreme_expense',
                'date': datetime.now().isoformat(),
                'amount': -5000.0,  # Large expense
                'description': 'Emergency expense'
            }]
        }
        
        result = alert_system.process_financial_analysis(**extreme_data)
        print(f"✅ Extreme values test passed - Stress Score: {result['stress_result']['stress_score']:.1f}")
    except Exception as e:
        print(f"❌ Extreme values test failed: {str(e)}")
    
    # Test alert cooldowns
    try:
        # Generate multiple alerts for same user
        user_id = "cooldown_test_user"
        for i in range(3):
            alert_system.process_financial_analysis(
                user_id=user_id,
                current_balance=500.0,
                predictions=[],
                transaction_history=[]
            )
        
        active_alerts = alert_system.get_active_alerts(user_id)
        print(f"✅ Cooldown test passed - Active alerts after 3 calls: {len(active_alerts)}")
    except Exception as e:
        print(f"❌ Cooldown test failed: {str(e)}")

if __name__ == "__main__":
    print("Alert and Recommendation System Test Suite")
    print("=" * 70)
    
    success = test_alert_recommendation_system()
    test_edge_cases()
    
    if success:
        print("\n🎉 All tests completed successfully!")
    else:
        print("\n⚠️  Some tests failed. Check the output above.")
        sys.exit(1)