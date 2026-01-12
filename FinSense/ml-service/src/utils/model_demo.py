"""
Model Storage Demo

This script demonstrates the model storage and versioning functionality
by creating a simple dummy model and showing how to save, load, and manage it.
"""

import os
import sys
import numpy as np
from datetime import datetime
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
from sklearn.datasets import make_regression

# Add the parent directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.model_storage import ModelStorageService, ModelMetadata
from utils.model_versioning import ModelVersionManager

def create_dummy_model():
    """Create a simple dummy model for demonstration"""
    # Generate some dummy data
    X, y = make_regression(n_samples=1000, n_features=5, noise=0.1, random_state=42)
    
    # Create and train a simple model
    model = LinearRegression()
    model.fit(X, y)
    
    # Create a scaler
    scaler = StandardScaler()
    scaler.fit(X)
    
    # Calculate some dummy performance metrics
    train_score = model.score(X, y)
    
    return model, scaler, X, y, train_score

def demo_model_storage():
    """Demonstrate model storage functionality"""
    print("=== Model Storage and Versioning Demo ===\n")
    
    # Initialize services
    storage = ModelStorageService(models_dir="demo_models", backend_url="http://localhost:5000")
    version_manager = ModelVersionManager(storage)
    
    print("1. Creating a dummy model...")
    model, scaler, X, y, train_score = create_dummy_model()
    print(f"   Model R² score: {train_score:.4f}")
    
    # Create model metadata
    print("\n2. Creating model metadata...")
    metadata = ModelMetadata(
        model_type="prediction",
        version="1.0.0",
        name="Demo Linear Regression Model",
        algorithm="linear_regression",
        framework="scikit-learn",
        training_date=datetime.now(),
        training_duration=1.5,
        dataset_info={
            "size": len(X),
            "features": X.shape[1],
            "timeRange": {
                "start": datetime.now().isoformat(),
                "end": datetime.now().isoformat()
            },
            "preprocessing": [
                {"step": "standardization", "parameters": {"with_mean": True, "with_std": True}}
            ]
        },
        parameters={
            "fit_intercept": True,
            "normalize": False,
            "copy_X": True
        },
        performance={
            "training": {
                "r2Score": train_score,
                "mae": 0.1,
                "rmse": 0.15
            },
            "validation": {
                "r2Score": train_score * 0.95,  # Slightly lower for validation
                "mae": 0.12,
                "rmse": 0.18
            }
        },
        deployment={
            "status": "training",
            "deployedAt": None
        },
        files={},
        tags=["demo", "linear_regression", "v1"]
    )
    
    print(f"   Model metadata created for {metadata.name}")
    
    # Save the model (this will fail if backend is not running, but we'll catch it)
    print("\n3. Attempting to save model...")
    try:
        model_id = storage.save_model(
            model=model,
            metadata=metadata,
            scaler=scaler,
            config={"demo": True, "created_by": "demo_script"}
        )
        print(f"   ✓ Model saved successfully with ID: {model_id}")
        
        # Try to load the model back
        print("\n4. Loading model back...")
        loaded_model, loaded_scaler, loaded_config, loaded_metadata = storage.load_model(
            "prediction", "1.0.0"
        )
        print(f"   ✓ Model loaded successfully")
        print(f"   ✓ Scaler loaded: {loaded_scaler is not None}")
        print(f"   ✓ Config loaded: {loaded_config is not None}")
        
        # Test the loaded model
        print("\n5. Testing loaded model...")
        test_X = X[:5]  # Use first 5 samples for testing
        original_pred = model.predict(test_X)
        loaded_pred = loaded_model.predict(test_X)
        
        print(f"   Original predictions: {original_pred[:3]}")
        print(f"   Loaded predictions:   {loaded_pred[:3]}")
        print(f"   ✓ Predictions match: {np.allclose(original_pred, loaded_pred)}")
        
        # Demonstrate versioning
        print("\n6. Demonstrating versioning...")
        next_version = version_manager.get_next_version("prediction", "minor")
        print(f"   Next version would be: {next_version}")
        
        # Check if model needs retraining
        should_retrain, reasons = version_manager.should_retrain_model(
            "prediction", max_age_days=1  # Very short for demo
        )
        print(f"   Should retrain: {should_retrain}")
        if reasons:
            print(f"   Reasons: {', '.join(reasons)}")
        
    except Exception as e:
        print(f"   ⚠ Model save/load failed (backend may not be running): {str(e)}")
        print("   This is expected if the Node.js backend is not running.")
        
        # Still demonstrate local file operations
        print("\n   Demonstrating local file operations...")
        
        # Create models directory
        os.makedirs("demo_models/prediction/v1.0.0", exist_ok=True)
        
        # Save model locally using joblib directly
        import joblib
        model_path = "demo_models/prediction/v1.0.0/model.joblib"
        scaler_path = "demo_models/prediction/v1.0.0/scaler.joblib"
        
        joblib.dump(model, model_path)
        joblib.dump(scaler, scaler_path)
        print(f"   ✓ Model saved locally to {model_path}")
        print(f"   ✓ Scaler saved locally to {scaler_path}")
        
        # Load back
        loaded_model = joblib.load(model_path)
        loaded_scaler = joblib.load(scaler_path)
        print(f"   ✓ Model and scaler loaded back successfully")
        
        # Test predictions
        test_X = X[:3]
        original_pred = model.predict(test_X)
        loaded_pred = loaded_model.predict(test_X)
        print(f"   ✓ Predictions match: {np.allclose(original_pred, loaded_pred)}")
    
    print("\n=== Demo completed ===")
    print("\nTo run this demo with full functionality:")
    print("1. Start the Node.js backend server (npm start in backend/)")
    print("2. Ensure MongoDB is running")
    print("3. Run this script again")

if __name__ == "__main__":
    demo_model_storage()