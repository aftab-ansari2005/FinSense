import pytest
import os
import tempfile
import shutil
from unittest.mock import patch
import pandas as pd
import numpy as np

# Set test environment
os.environ['FLASK_ENV'] = 'testing'
os.environ['LOG_LEVEL'] = 'ERROR'

@pytest.fixture(scope='session')
def app():
    """Create application for testing."""
    from app import app
    app.config['TESTING'] = True
    return app

@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()

@pytest.fixture
def temp_model_dir():
    """Create temporary directory for model storage."""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    shutil.rmtree(temp_dir)

@pytest.fixture
def sample_transactions():
    """Generate sample transaction data for testing."""
    np.random.seed(42)
    dates = pd.date_range('2023-01-01', periods=100, freq='D')
    
    transactions = []
    categories = ['Groceries', 'Gas', 'Restaurant', 'Shopping', 'Utilities']
    
    for i, date in enumerate(dates):
        transactions.append({
            'date': date,
            'amount': np.random.uniform(-200, -10),
            'description': f'Transaction {i} - {np.random.choice(categories)}',
            'category': np.random.choice(categories)
        })
    
    return pd.DataFrame(transactions)

@pytest.fixture
def sample_user_data():
    """Generate sample user data for testing."""
    return {
        'user_id': '507f1f77bcf86cd799439011',
        'transactions': [
            {
                'date': '2023-01-01',
                'amount': -50.00,
                'description': 'Grocery Store Purchase'
            },
            {
                'date': '2023-01-02',
                'amount': -25.00,
                'description': 'Gas Station'
            }
        ]
    }

@pytest.fixture
def mock_database():
    """Mock database connections."""
    with patch('pymongo.MongoClient') as mock_client:
        yield mock_client