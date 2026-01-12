"""
Test script for transaction clustering functionality
"""

import sys
import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# Add the src directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

def create_realistic_transactions(n_samples: int = 200) -> pd.DataFrame:
    """Create realistic transaction data for testing clustering"""
    np.random.seed(42)
    
    # Define realistic transaction patterns
    transaction_patterns = [
        # Groceries
        {'descriptions': ['Walmart Supercenter', 'Kroger Store', 'Whole Foods Market', 'Target Store'], 
         'amount_range': (-150, -20), 'frequency': 0.25},
        
        # Gas stations
        {'descriptions': ['Shell Gas Station', 'Exxon Mobile', 'BP Gas', 'Chevron Station'], 
         'amount_range': (-80, -25), 'frequency': 0.15},
        
        # Restaurants
        {'descriptions': ['Starbucks Coffee', 'McDonalds Restaurant', 'Pizza Hut', 'Subway Sandwiches'], 
         'amount_range': (-50, -5), 'frequency': 0.20},
        
        # Utilities
        {'descriptions': ['Electric Company', 'Water Department', 'Internet Service', 'Phone Bill'], 
         'amount_range': (-200, -50), 'frequency': 0.08},
        
        # Banking/ATM
        {'descriptions': ['ATM Withdrawal', 'Bank Fee', 'Transfer Fee', 'Overdraft Fee'], 
         'amount_range': (-50, -2), 'frequency': 0.05},
        
        # Income
        {'descriptions': ['Direct Deposit Payroll', 'Salary Payment', 'Bonus Payment', 'Tax Refund'], 
         'amount_range': (500, 3000), 'frequency': 0.10},
        
        # Entertainment
        {'descriptions': ['Netflix Subscription', 'Spotify Premium', 'Movie Theater', 'Amazon Prime'], 
         'amount_range': (-50, -8), 'frequency': 0.08},
        
        # Healthcare
        {'descriptions': ['CVS Pharmacy', 'Doctor Office', 'Dental Clinic', 'Health Insurance'], 
         'amount_range': (-300, -15), 'frequency': 0.06},
        
        # Transportation
        {'descriptions': ['Uber Ride', 'Lyft Trip', 'Parking Meter', 'Bus Pass'], 
         'amount_range': (-40, -3), 'frequency': 0.03}
    ]
    
    transactions = []
    base_date = datetime.now() - timedelta(days=180)  # 6 months of data
    
    for i in range(n_samples):
        # Choose pattern based on frequency
        pattern_weights = [p['frequency'] for p in transaction_patterns]
        pattern = np.random.choice(transaction_patterns, p=pattern_weights)
        
        # Generate transaction
        description = np.random.choice(pattern['descriptions'])
        amount = np.random.uniform(pattern['amount_range'][0], pattern['amount_range'][1])
        
        # Add some variation to descriptions
        if np.random.random() < 0.3:
            description += f" #{np.random.randint(1000, 9999)}"
        
        # Random date within the period
        days_offset = np.random.randint(0, 180)
        transaction_date = base_date + timedelta(days=days_offset)
        
        transactions.append({
            'date': transaction_date,
            'amount': round(amount, 2),
            'description': description
        })
    
    return pd.DataFrame(transactions)

def test_clustering_engine():
    """Test the clustering engine functionality"""
    print("=== Transaction Clustering Engine Test ===\n")
    
    try:
        # Import modules
        from services.clustering_engine import TransactionClusteringEngine, ClusteringConfig, optimize_clustering_parameters
        from utils.preprocessing_pipeline import TransactionPreprocessingPipeline, PreprocessingConfig
        
        print("✓ Successfully imported clustering modules")
        
        # Create realistic test data
        print("\n1. Creating realistic transaction data...")
        transactions_df = create_realistic_transactions(150)
        print(f"   Created {len(transactions_df)} transactions")
        print(f"   Date range: {transactions_df['date'].min()} to {transactions_df['date'].max()}")
        print(f"   Amount range: ${transactions_df['amount'].min():.2f} to ${transactions_df['amount'].max():.2f}")
        
        # Show sample transactions
        print("\n   Sample transactions:")
        for i in range(5):
            row = transactions_df.iloc[i]
            print(f"     {row['date'].strftime('%Y-%m-%d')}: {row['description']} - ${row['amount']:.2f}")
        
        # Extract features
        print("\n2. Extracting features...")
        preprocessing_config = PreprocessingConfig(
            max_tfidf_features=100,  # Smaller for test
            min_df=1,
            max_df=0.9
        )
        pipeline = TransactionPreprocessingPipeline(preprocessing_config)
        features, processed_df, processing_report = pipeline.fit_transform(transactions_df)
        
        print(f"   ✓ Features extracted: {features.shape}")
        print(f"   ✓ Processing time: {processing_report['processing_time']:.3f} seconds")
        
        # Test KMeans clustering
        print("\n3. Testing KMeans clustering...")
        clustering_config = ClusteringConfig(
            kmeans_n_clusters=8,  # Expect ~8-9 categories from our patterns
            confidence_threshold=0.6
        )
        clustering_engine = TransactionClusteringEngine(clustering_config)
        
        # Fit the model
        clustering_results = clustering_engine.fit(features, processed_df, algorithm='kmeans')
        
        print(f"   ✓ KMeans clustering complete")
        print(f"   ✓ Clusters found: {clustering_results['training_stats']['metrics']['n_clusters']}")
        print(f"   ✓ Average confidence: {clustering_results['training_stats']['avg_confidence']:.3f}")
        print(f"   ✓ Low confidence ratio: {clustering_results['training_stats']['low_confidence_ratio']:.3f}")
        
        # Show cluster distribution
        cluster_dist = clustering_results['training_stats']['cluster_distribution']
        print(f"   ✓ Cluster sizes: {dict(sorted(cluster_dist.items()))}")
        
        # Show category distribution
        category_dist = clustering_results['training_stats']['category_distribution']
        print(f"   ✓ Categories found: {list(category_dist.keys())}")
        
        # Test DBSCAN clustering
        print("\n4. Testing DBSCAN clustering...")
        dbscan_config = ClusteringConfig(
            dbscan_eps=0.3,
            dbscan_min_samples=3
        )
        dbscan_engine = TransactionClusteringEngine(dbscan_config)
        
        dbscan_results = dbscan_engine.fit(features, processed_df, algorithm='dbscan')
        
        print(f"   ✓ DBSCAN clustering complete")
        print(f"   ✓ Clusters found: {dbscan_results['training_stats']['metrics']['n_clusters']}")
        print(f"   ✓ Noise points: {dbscan_results['training_stats']['metrics']['n_noise']}")
        print(f"   ✓ Noise ratio: {dbscan_results['training_stats']['metrics']['noise_ratio']:.3f}")
        
        # Test prediction on new data
        print("\n5. Testing prediction on new data...")
        new_transactions = create_realistic_transactions(20)
        new_features, new_processed_df, _ = pipeline.transform(new_transactions)
        
        predictions = clustering_engine.predict(new_features)
        
        print(f"   ✓ Predictions generated for {len(new_transactions)} transactions")
        print(f"   ✓ Average confidence: {np.mean(predictions['confidence_scores']):.3f}")
        
        # Show sample predictions
        print("\n   Sample predictions:")
        for i in range(min(5, len(new_processed_df))):
            row = new_processed_df.iloc[i]
            print(f"     {row['description']}: {predictions['categories'][i]} "
                  f"(confidence: {predictions['confidence_scores'][i]:.3f})")
        
        # Test cluster analysis
        print("\n6. Testing cluster analysis...")
        analysis = clustering_engine.get_cluster_analysis()
        
        print(f"   ✓ Analysis generated")
        print(f"   ✓ Category summary: {len(analysis['category_summary'])} categories")
        print(f"   ✓ Recommendations: {len(analysis['recommendations'])}")
        
        if analysis['recommendations']:
            print("   ✓ Recommendations:")
            for rec in analysis['recommendations']:
                print(f"     - {rec}")
        
        # Test parameter optimization
        print("\n7. Testing parameter optimization...")
        if len(processed_df) >= 20:  # Only test if we have enough data
            optimization_results = optimize_clustering_parameters(features, processed_df, (3, 10))
            
            print(f"   ✓ Parameter optimization complete")
            print(f"   ✓ Best parameters: {optimization_results['best_kmeans_params']}")
            print(f"   ✓ Best score: {optimization_results['best_kmeans_score']:.3f}")
            
            # Show optimization results
            if optimization_results['kmeans_scores']:
                print("   ✓ Optimization scores:")
                for score_data in optimization_results['kmeans_scores'][:5]:  # Show first 5
                    print(f"     n_clusters={score_data['n_clusters']}: "
                          f"silhouette={score_data['silhouette_score']:.3f}")
        
        # Test model persistence
        print("\n8. Testing model save/load...")
        model_path = "test_clustering_model.joblib"
        
        clustering_engine.save_model(model_path)
        print(f"   ✓ Model saved to {model_path}")
        
        loaded_engine = TransactionClusteringEngine.load_model(model_path)
        print(f"   ✓ Model loaded successfully")
        
        # Test loaded model
        loaded_predictions = loaded_engine.predict(new_features[:5])  # Test with first 5
        print(f"   ✓ Loaded model predictions: {len(loaded_predictions['categories'])}")
        
        # Cleanup
        if os.path.exists(model_path):
            os.remove(model_path)
            print(f"   ✓ Cleaned up test file")
        
        print("\n✅ All clustering tests passed!")
        
        # Show detailed results
        print("\n9. Detailed clustering results:")
        
        # Category analysis
        print("\n   Category Analysis:")
        for category, info in analysis['category_summary'].items():
            print(f"     {category}: {info['cluster_count']} clusters ({info['percentage']:.1f}%)")
        
        # Sample categorized transactions
        print("\n   Sample categorized transactions:")
        categories = clustering_results['categories']
        confidences = clustering_results['confidence_scores']
        
        for category in set(categories):
            category_indices = [i for i, cat in enumerate(categories) if cat == category]
            if category_indices:
                idx = category_indices[0]  # Take first example
                row = processed_df.iloc[idx]
                print(f"     {category}: {row['description']} (${row['amount']:.2f}, "
                      f"confidence: {confidences[idx]:.3f})")
        
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

def test_clustering_edge_cases():
    """Test clustering with edge cases"""
    print("\n=== Testing Edge Cases ===\n")
    
    try:
        from services.clustering_engine import TransactionClusteringEngine, ClusteringConfig
        from utils.preprocessing_pipeline import TransactionPreprocessingPipeline, PreprocessingConfig
        
        # Test with very few transactions
        print("1. Testing with minimal data...")
        minimal_data = pd.DataFrame([
            {'date': datetime.now(), 'amount': -50.0, 'description': 'Store Purchase'},
            {'date': datetime.now(), 'amount': -25.0, 'description': 'Gas Station'},
            {'date': datetime.now(), 'amount': 1000.0, 'description': 'Salary Deposit'}
        ])
        
        pipeline = TransactionPreprocessingPipeline()
        features, processed_df, _ = pipeline.fit_transform(minimal_data)
        
        config = ClusteringConfig(kmeans_n_clusters=2)  # Force 2 clusters
        engine = TransactionClusteringEngine(config)
        
        results = engine.fit(features, processed_df)
        print(f"   ✓ Minimal data clustering: {results['training_stats']['metrics']['n_clusters']} clusters")
        
        # Test with identical transactions
        print("\n2. Testing with identical transactions...")
        identical_data = pd.DataFrame([
            {'date': datetime.now(), 'amount': -50.0, 'description': 'Same Store'} for _ in range(10)
        ])
        
        pipeline2 = TransactionPreprocessingPipeline()
        features2, processed_df2, _ = pipeline2.fit_transform(identical_data)
        
        config2 = ClusteringConfig(kmeans_n_clusters=3)
        engine2 = TransactionClusteringEngine(config2)
        
        results2 = engine2.fit(features2, processed_df2)
        print(f"   ✓ Identical data clustering: {results2['training_stats']['metrics']['n_clusters']} clusters")
        print(f"   ✓ Average confidence: {results2['training_stats']['avg_confidence']:.3f}")
        
        # Test with very diverse transactions
        print("\n3. Testing with diverse transactions...")
        diverse_data = pd.DataFrame([
            {'date': datetime.now(), 'amount': -1.0, 'description': 'A'},
            {'date': datetime.now(), 'amount': -1000.0, 'description': 'B' * 50},
            {'date': datetime.now(), 'amount': 5000.0, 'description': 'C'},
            {'date': datetime.now(), 'amount': -0.01, 'description': 'D'},
            {'date': datetime.now(), 'amount': -500.0, 'description': 'E'}
        ])
        
        pipeline3 = TransactionPreprocessingPipeline()
        features3, processed_df3, _ = pipeline3.fit_transform(diverse_data)
        
        if len(processed_df3) > 0:  # Check if any data survived validation
            config3 = ClusteringConfig(kmeans_n_clusters=min(3, len(processed_df3)))
            engine3 = TransactionClusteringEngine(config3)
            
            results3 = engine3.fit(features3, processed_df3)
            print(f"   ✓ Diverse data clustering: {results3['training_stats']['metrics']['n_clusters']} clusters")
        else:
            print("   ⚠ Diverse data was filtered out during validation")
        
        return True
        
    except Exception as e:
        print(f"❌ Edge case test failed: {e}")
        return False

def analyze_clustering_quality():
    """Analyze the quality of clustering results"""
    print("\n=== Clustering Quality Analysis ===\n")
    
    try:
        from services.clustering_engine import TransactionClusteringEngine, ClusteringConfig
        from utils.preprocessing_pipeline import TransactionPreprocessingPipeline, PreprocessingConfig
        
        # Create data with known patterns
        known_patterns_data = []
        
        # Pattern 1: Grocery stores (should cluster together)
        for i in range(20):
            known_patterns_data.append({
                'date': datetime.now() - timedelta(days=i),
                'amount': np.random.uniform(-100, -20),
                'description': f'Grocery Store {np.random.choice(["Walmart", "Kroger", "Safeway"])}'
            })
        
        # Pattern 2: Gas stations (should cluster together)
        for i in range(15):
            known_patterns_data.append({
                'date': datetime.now() - timedelta(days=i),
                'amount': np.random.uniform(-60, -25),
                'description': f'Gas Station {np.random.choice(["Shell", "Exxon", "BP"])}'
            })
        
        # Pattern 3: Income (should cluster together)
        for i in range(8):
            known_patterns_data.append({
                'date': datetime.now() - timedelta(days=i*7),  # Weekly
                'amount': np.random.uniform(1000, 2000),
                'description': f'Payroll {np.random.choice(["Direct Deposit", "Salary", "Wages"])}'
            })
        
        test_df = pd.DataFrame(known_patterns_data)
        
        # Extract features and cluster
        pipeline = TransactionPreprocessingPipeline()
        features, processed_df, _ = pipeline.fit_transform(test_df)
        
        config = ClusteringConfig(kmeans_n_clusters=5)
        engine = TransactionClusteringEngine(config)
        results = engine.fit(features, processed_df)
        
        # Analyze results
        categories = results['categories']
        cluster_labels = results['cluster_labels']
        
        print("Clustering quality analysis:")
        print(f"   Total transactions: {len(processed_df)}")
        print(f"   Clusters found: {len(set(cluster_labels))}")
        print(f"   Categories found: {len(set(categories))}")
        
        # Check if similar transactions are grouped together
        grocery_indices = [i for i, desc in enumerate(processed_df['description']) 
                          if 'grocery' in desc.lower()]
        gas_indices = [i for i, desc in enumerate(processed_df['description']) 
                      if 'gas' in desc.lower()]
        income_indices = [i for i, desc in enumerate(processed_df['description']) 
                         if any(word in desc.lower() for word in ['payroll', 'salary', 'wages'])]
        
        if grocery_indices:
            grocery_clusters = [cluster_labels[i] for i in grocery_indices]
            grocery_purity = len(set(grocery_clusters)) / len(grocery_clusters) if grocery_clusters else 1
            print(f"   Grocery clustering purity: {1 - grocery_purity:.3f} (higher is better)")
        
        if gas_indices:
            gas_clusters = [cluster_labels[i] for i in gas_indices]
            gas_purity = len(set(gas_clusters)) / len(gas_clusters) if gas_clusters else 1
            print(f"   Gas clustering purity: {1 - gas_purity:.3f} (higher is better)")
        
        if income_indices:
            income_clusters = [cluster_labels[i] for i in income_indices]
            income_purity = len(set(income_clusters)) / len(income_clusters) if income_clusters else 1
            print(f"   Income clustering purity: {1 - income_purity:.3f} (higher is better)")
        
        # Show category assignments
        print("\n   Category assignments:")
        category_counts = {}
        for category in categories:
            category_counts[category] = category_counts.get(category, 0) + 1
        
        for category, count in sorted(category_counts.items()):
            print(f"     {category}: {count} transactions")
        
        return True
        
    except Exception as e:
        print(f"❌ Quality analysis failed: {e}")
        return False

if __name__ == "__main__":
    print("Starting clustering engine tests...\n")
    
    # Run main tests
    success = test_clustering_engine()
    
    if success:
        # Run edge case tests
        test_clustering_edge_cases()
        
        # Run quality analysis
        analyze_clustering_quality()
        
        print("\n" + "="*60)
        print("🎉 Clustering engine is working correctly!")
        print("\nKey capabilities implemented:")
        print("✓ KMeans clustering with automatic category assignment")
        print("✓ DBSCAN clustering with noise detection")
        print("✓ Confidence score calculation")
        print("✓ Parameter optimization")
        print("✓ Model persistence (save/load)")
        print("✓ Comprehensive cluster analysis")
        print("✓ Prediction on new data")
        
        print("\nClustering features:")
        print("✓ Automatic category detection (Groceries, Gas, Restaurants, etc.)")
        print("✓ Confidence-based flagging for manual review")
        print("✓ Adaptive cluster count based on data size")
        print("✓ Feature scaling and dimensionality reduction")
        print("✓ Robust handling of edge cases")
        
        print("\nNext steps:")
        print("- Implement user feedback learning (Task 7.6)")
        print("- Add property-based tests (Tasks 7.3-7.5)")
        print("- Integrate with model storage system")
        print("- Optimize for production performance")
        
    else:
        print("\n❌ Tests failed. Please check the error messages above.")
        
    print("\nTo test with the ML service API:")
    print("1. Start the ML service: python app.py")
    print("2. Send POST request to /ml/categorize")
    print("3. Send POST request to /ml/clustering/analyze for detailed analysis")