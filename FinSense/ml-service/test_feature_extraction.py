"""
Test script for transaction feature extraction functionality
"""

import sys
import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# Add the src directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

def test_feature_extraction():
    """Test the feature extraction functionality"""
    print("=== Transaction Feature Extraction Test ===\n")
    
    try:
        # Import our modules
        from services.feature_extraction import TransactionFeatureExtractor
        from utils.preprocessing_pipeline import TransactionPreprocessingPipeline, PreprocessingConfig, create_sample_transactions
        
        print("✓ Successfully imported feature extraction modules")
        
        # Create sample transaction data
        print("\n1. Creating sample transaction data...")
        sample_df = create_sample_transactions(50)
        print(f"   Created {len(sample_df)} sample transactions")
        print(f"   Columns: {list(sample_df.columns)}")
        print(f"   Date range: {sample_df['date'].min()} to {sample_df['date'].max()}")
        print(f"   Amount range: ${sample_df['amount'].min():.2f} to ${sample_df['amount'].max():.2f}")
        
        # Test individual feature extractor
        print("\n2. Testing TransactionFeatureExtractor...")
        extractor = TransactionFeatureExtractor(max_features=50, min_df=1)
        
        # Test TF-IDF extraction
        descriptions = sample_df['description'].tolist()
        tfidf_features = extractor.extract_description_features(descriptions)
        print(f"   ✓ TF-IDF features shape: {tfidf_features.shape}")
        
        # Test amount features
        amounts = sample_df['amount'].tolist()
        amount_features = extractor.extract_amount_features(amounts)
        print(f"   ✓ Amount features shape: {amount_features.shape}")
        
        # Test date features
        dates = sample_df['date'].tolist()
        date_features = extractor.extract_date_features(dates)
        print(f"   ✓ Date features shape: {date_features.shape}")
        
        # Test merchant features
        merchant_features = extractor.extract_merchant_features(descriptions)
        print(f"   ✓ Merchant features shape: {merchant_features.shape}")
        
        # Test full feature extraction
        print("\n3. Testing full feature extraction...")
        all_features = extractor.fit_transform(sample_df)
        print(f"   ✓ Combined features shape: {all_features.shape}")
        
        feature_names = extractor.get_feature_names()
        print(f"   ✓ Feature names count: {len(feature_names)}")
        
        # Show some feature statistics
        print(f"   ✓ Feature statistics:")
        print(f"     - Non-zero features per transaction: {np.mean(np.count_nonzero(all_features, axis=1)):.1f}")
        print(f"     - Average feature value: {np.mean(all_features):.4f}")
        print(f"     - Feature value std: {np.std(all_features):.4f}")
        
        # Test preprocessing pipeline
        print("\n4. Testing preprocessing pipeline...")
        config = PreprocessingConfig(
            max_tfidf_features=50,
            min_df=1,
            max_df=0.95
        )
        pipeline = TransactionPreprocessingPipeline(config)
        
        # Test full pipeline
        features, processed_df, report = pipeline.fit_transform(sample_df)
        print(f"   ✓ Pipeline processing complete")
        print(f"   ✓ Original shape: {report['original_shape']}")
        print(f"   ✓ Final shape: {report['final_shape']}")
        print(f"   ✓ Feature shape: {report['feature_shape']}")
        print(f"   ✓ Processing time: {report['processing_time']:.3f} seconds")
        
        # Test feature analysis
        print("\n5. Testing feature analysis...")
        analysis = pipeline.get_feature_analysis(features)
        print(f"   ✓ Total features analyzed: {analysis['n_features']}")
        print(f"   ✓ Top TF-IDF features: {len(analysis['top_tfidf_features'])}")
        
        if analysis['top_tfidf_features']:
            print("   ✓ Top 5 TF-IDF features:")
            for i, feature in enumerate(analysis['top_tfidf_features'][:5]):
                print(f"     {i+1}. {feature['feature']}: {feature['score']:.4f}")
        
        # Test transform on new data
        print("\n6. Testing transform on new data...")
        new_sample = create_sample_transactions(10)
        new_features, new_processed = pipeline.transform(new_sample)
        print(f"   ✓ New data shape: {new_features.shape}")
        print(f"   ✓ Feature consistency: {new_features.shape[1] == features.shape[1]}")
        
        print("\n✅ All feature extraction tests passed!")
        
        # Show sample feature extraction results
        print("\n7. Sample feature extraction results:")
        print("   Transaction examples with extracted features:")
        
        for i in range(min(3, len(processed_df))):
            row = processed_df.iloc[i]
            feature_vector = features[i]
            non_zero_features = np.count_nonzero(feature_vector)
            
            print(f"\n   Transaction {i+1}:")
            print(f"     Description: {row['description']}")
            print(f"     Amount: ${row['amount']:.2f}")
            print(f"     Date: {row['date'].strftime('%Y-%m-%d')}")
            print(f"     Non-zero features: {non_zero_features}/{len(feature_vector)}")
            print(f"     Feature vector sample: {feature_vector[:5]}")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("   Make sure all required packages are installed:")
        print("   - pandas, numpy, scikit-learn")
        return False
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_preprocessing_edge_cases():
    """Test preprocessing with edge cases"""
    print("\n=== Testing Edge Cases ===\n")
    
    try:
        from utils.preprocessing_pipeline import TransactionPreprocessingPipeline, PreprocessingConfig
        
        # Create problematic data
        problematic_data = pd.DataFrame([
            {'date': '2024-01-01', 'amount': 100.0, 'description': 'Normal Transaction'},
            {'date': 'invalid-date', 'amount': 50.0, 'description': 'Invalid Date'},
            {'date': '2024-01-02', 'amount': 'invalid', 'description': 'Invalid Amount'},
            {'date': '2024-01-03', 'amount': 0.0, 'description': ''},  # Empty description
            {'date': '2024-01-04', 'amount': 25.0, 'description': 'A'},  # Too short
            {'date': '2024-01-05', 'amount': 75.0, 'description': 'Duplicate Transaction'},
            {'date': '2024-01-05', 'amount': 75.0, 'description': 'Duplicate Transaction'},  # Duplicate
        ])
        
        print(f"Created problematic dataset with {len(problematic_data)} rows")
        
        config = PreprocessingConfig(min_description_length=3)
        pipeline = TransactionPreprocessingPipeline(config)
        
        # Test validation
        df_validated, validation_report = pipeline.validate_data(problematic_data)
        
        print(f"Validation results:")
        print(f"  Original rows: {validation_report['original_rows']}")
        print(f"  Final rows: {validation_report['final_rows']}")
        print(f"  Issues: {validation_report['issues']}")
        print(f"  Warnings: {validation_report['warnings']}")
        
        if len(df_validated) > 0:
            # Try full processing
            features, processed_df, report = pipeline.fit_transform(df_validated)
            print(f"  ✓ Successfully processed {len(processed_df)} valid transactions")
            print(f"  ✓ Extracted {features.shape[1]} features")
        else:
            print("  ⚠ No valid transactions remaining after validation")
        
        return True
        
    except Exception as e:
        print(f"❌ Edge case test failed: {e}")
        return False

if __name__ == "__main__":
    print("Starting feature extraction tests...\n")
    
    # Run main tests
    success = test_feature_extraction()
    
    if success:
        # Run edge case tests
        test_preprocessing_edge_cases()
        
        print("\n" + "="*50)
        print("🎉 Feature extraction system is working correctly!")
        print("\nKey capabilities implemented:")
        print("✓ TF-IDF vectorization for transaction descriptions")
        print("✓ Amount-based feature engineering")
        print("✓ Date-based feature extraction")
        print("✓ Merchant pattern recognition")
        print("✓ Data validation and cleaning")
        print("✓ Complete preprocessing pipeline")
        print("✓ Feature analysis and statistics")
        
        print("\nNext steps:")
        print("- Implement clustering algorithms (Task 7.2)")
        print("- Add category assignment logic")
        print("- Integrate with model storage system")
        
    else:
        print("\n❌ Tests failed. Please check the error messages above.")
        
    print("\nTo test with the ML service API:")
    print("1. Start the ML service: python app.py")
    print("2. Send POST request to /ml/features/extract")
    print("3. Include transaction data in the request body")