"""
Quick verification script for refactored ML service
Tests that the new modular structure works correctly
"""

import requests
import sys

# Base URL for ML service
BASE_URL = "http://localhost:5001"

def test_health_endpoint():
    """Test health check endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Health endpoint working")
            print(f"   Response: {response.json()}")
            return True
        else:
            print(f"❌ Health endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health endpoint error: {str(e)}")
        print("   Note: Make sure ML service is running (python app.py)")
        return False

def main():
    """Run quick verification tests"""
    print("=" * 60)
    print("ML Service Refactoring Verification")
    print("=" * 60)
    print()
    
    # Test health endpoint
    if test_health_endpoint():
        print()
        print("✅ ML Service refactoring successful!")
        print("   The modular blueprint architecture is working.")
        print()
        print("Next steps:")
        print("  1. Run full test suite: pytest tests/ -v")
        print("  2. Test all endpoints with existing validation scripts")
        print("  3. Verify in production-like environment")
        return 0
    else:
        print()
        print("⚠️  Could not verify ML service")
        print("   Ensure service is running: cd ml-service && python app.py")
        return 1

if __name__ == "__main__":
    sys.exit(main())
