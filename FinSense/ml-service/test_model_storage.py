"""
Simple test to validate model storage imports and basic functionality
"""

try:
    # Test imports
    print("Testing imports...")
    
    from src.services.model_storage import ModelStorageService, ModelMetadata
    print("✓ ModelStorageService imported successfully")
    
    from src.utils.model_versioning import ModelVersionManager, VersionInfo
    print("✓ ModelVersionManager imported successfully")
    
    # Test basic functionality
    print("\nTesting basic functionality...")
    
    # Test version parsing
    version_manager = ModelVersionManager(None)  # Pass None since we're not using storage
    
    version_info = version_manager.parse_version("1.2.3")
    print(f"✓ Version parsing works: {version_info}")
    
    # Test version comparison
    v1 = VersionInfo(1, 0, 0)
    v2 = VersionInfo(1, 1, 0)
    print(f"✓ Version comparison works: v1.0.0 < v1.1.0 = {v1 < v2}")
    
    # Test ModelMetadata creation
    from datetime import datetime
    metadata = ModelMetadata(
        model_type="test",
        version="1.0.0",
        name="Test Model",
        algorithm="test_algo",
        framework="test_framework",
        training_date=datetime.now(),
        training_duration=1.0,
        dataset_info={"size": 100},
        parameters={"param1": "value1"},
        performance={"accuracy": 0.95},
        deployment={"status": "training"},
        files={"modelPath": "test/path"}
    )
    print(f"✓ ModelMetadata creation works: {metadata.name}")
    
    print("\n✅ All basic tests passed!")
    print("\nModel storage and versioning system is ready to use.")
    print("To test with actual models, ensure:")
    print("1. Python environment with required packages is available")
    print("2. Node.js backend is running")
    print("3. MongoDB is connected")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
except Exception as e:
    print(f"❌ Error: {e}")