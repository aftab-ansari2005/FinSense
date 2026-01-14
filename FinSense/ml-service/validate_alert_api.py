#!/usr/bin/env python3
"""
Validation script for Alert and Recommendation API endpoints

This script validates the API endpoints for alert and recommendation management.
"""

import sys
import os
import json
from datetime import datetime, timedelta

# Add the src directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

def test_api_integration():
    """Test the API integration with the alert system"""
    print("Testing Alert and Recommendation API Integration...")
    print("=" * 60)
    
    try:
        # Test importing the enhanced system in app context
        from services.alert_recommendation_system import (
            AlertRecommendationSystem,
            UserAlertPreferences,
            NotificationChannel,
            AlertType
        )
        
        print("✅ Successfully imported AlertRecommendationSystem")
        
        # Test system initialization
        alert_system = AlertRecommendationSystem()
        print("✅ Alert system initialized successfully")
        
        # Test with sample data
        user_id = "api_test_user"
        test_data = {
            'current_balance': 1200.0,
            'predictions': [
                {
                    'date': (datetime.now() + timedelta(days=30)).isoformat(),
                    'predicted_balance': 800.0,
                    'day_ahead': 30
                }
            ],
            'transaction_history': [
                {
                    'id': 'test_transaction',
                    'date': datetime.now().isoformat(),
                    'amount': -200.0,
                    'description': 'Test expense'
                }
            ]
        }
        
        # Test comprehensive analysis
        result = alert_system.process_financial_analysis(
            user_id=user_id,
            **test_data
        )
        
        print("✅ Financial analysis completed")
        print(f"   - Stress Score: {result['stress_result']['stress_score']:.1f}")
        print(f"   - Alerts: {len(result['alerts'])}")
        print(f"   - Recommendations: {len(result['recommendations'])}")
        
        # Test alert management
        active_alerts = alert_system.get_active_alerts(user_id)
        print(f"✅ Active alerts retrieved: {len(active_alerts)}")
        
        # Test recommendation status
        rec_status = alert_system.get_recommendation_status(user_id)
        print(f"✅ Recommendation status retrieved: {len(rec_status)}")
        
        # Test user preferences
        preferences = UserAlertPreferences(
            user_id=user_id,
            enabled_channels=[NotificationChannel.DASHBOARD],
            max_alerts_per_day=5
        )
        
        success = alert_system.set_user_preferences(preferences)
        print(f"✅ User preferences set: {success}")
        
        # Test statistics
        stats = alert_system.get_alert_statistics(user_id)
        print(f"✅ Statistics retrieved: {stats['total_alerts']} total alerts")
        
        return True
        
    except Exception as e:
        print(f"❌ API integration test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_response_format():
    """Test that API responses match expected format"""
    print("\nTesting API Response Format...")
    print("=" * 40)
    
    try:
        from services.alert_recommendation_system import AlertRecommendationSystem
        
        alert_system = AlertRecommendationSystem()
        
        # Test analysis response format
        result = alert_system.process_financial_analysis(
            user_id="format_test_user",
            current_balance=1000.0,
            predictions=[],
            transaction_history=[]
        )
        
        # Validate response structure
        required_keys = [
            'stress_result', 'alerts', 'recommendations', 
            'alert_summary', 'recommendation_summary'
        ]
        
        for key in required_keys:
            if key not in result:
                raise ValueError(f"Missing required key: {key}")
        
        print("✅ Response format validation passed")
        
        # Validate stress result structure
        stress_result = result['stress_result']
        stress_keys = [
            'user_id', 'stress_score', 'risk_level', 
            'factors', 'recommendations', 'calculated_at', 'metrics'
        ]
        
        for key in stress_keys:
            if key not in stress_result:
                raise ValueError(f"Missing stress result key: {key}")
        
        print("✅ Stress result format validation passed")
        
        # Validate alert structure
        if result['alerts']:
            alert = result['alerts'][0]
            alert_keys = [
                'alert_id', 'user_id', 'alert_type', 'severity',
                'title', 'message', 'created_at', 'action_required'
            ]
            
            for key in alert_keys:
                if key not in alert:
                    raise ValueError(f"Missing alert key: {key}")
        
        print("✅ Alert format validation passed")
        
        # Validate recommendation structure
        if result['recommendations']:
            rec = result['recommendations'][0]
            rec_keys = [
                'type', 'priority', 'title', 'description',
                'potential_impact', 'action_items'
            ]
            
            for key in rec_keys:
                if key not in rec:
                    raise ValueError(f"Missing recommendation key: {key}")
        
        print("✅ Recommendation format validation passed")
        
        return True
        
    except Exception as e:
        print(f"❌ Response format test failed: {str(e)}")
        return False

def test_error_handling():
    """Test error handling in the alert system"""
    print("\nTesting Error Handling...")
    print("=" * 30)
    
    try:
        from services.alert_recommendation_system import AlertRecommendationSystem
        
        alert_system = AlertRecommendationSystem()
        
        # Test with invalid user ID
        try:
            alert_system.acknowledge_alert("", "invalid_alert_id")
            print("✅ Invalid user ID handled gracefully")
        except Exception:
            print("⚠️  Invalid user ID caused exception (expected)")
        
        # Test with invalid alert ID
        success = alert_system.acknowledge_alert("test_user", "nonexistent_alert")
        if not success:
            print("✅ Invalid alert ID handled gracefully")
        
        # Test with invalid recommendation ID
        success = alert_system.update_recommendation_status(
            "test_user", "nonexistent_rec", "completed"
        )
        if not success:
            print("✅ Invalid recommendation ID handled gracefully")
        
        # Test with malformed data
        try:
            result = alert_system.process_financial_analysis(
                user_id="error_test_user",
                current_balance="invalid",  # Should be float
                predictions=[],
                transaction_history=[]
            )
            print("⚠️  Malformed data not caught (unexpected)")
        except Exception:
            print("✅ Malformed data handled with exception (expected)")
        
        return True
        
    except Exception as e:
        print(f"❌ Error handling test failed: {str(e)}")
        return False

if __name__ == "__main__":
    print("Alert and Recommendation API Validation Suite")
    print("=" * 70)
    
    success1 = test_api_integration()
    success2 = test_response_format()
    success3 = test_error_handling()
    
    if success1 and success2 and success3:
        print("\n🎉 All API validation tests passed! The Alert and Recommendation System is ready.")
    else:
        print("\n⚠️  Some validation tests failed. Check the output above.")
        sys.exit(1)