import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            FinSense
          </h1>
          <p className="text-2xl text-gray-700 mb-8">
            AI-Powered Wealth Intelligence
          </p>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            Transform your financial data into actionable insights. 
            Automatically categorize transactions, predict future balances, 
            and receive personalized recommendations.
          </p>
          
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors"
            >
              Go to Dashboard
            </Link>
          ) : (
            <div className="space-x-4">
              <Link
                to="/register"
                className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors"
              >
                Get Started
              </Link>
              <Link
                to="/login"
                className="inline-block bg-white hover:bg-gray-50 text-primary-600 font-bold py-3 px-8 rounded-lg text-lg border-2 border-primary-600 transition-colors"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-primary-600 text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">Smart Categorization</h3>
            <p className="text-gray-600">
              AI automatically categorizes your transactions using machine learning, 
              learning from your corrections to improve accuracy over time.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-success-600 text-4xl mb-4">📈</div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">Predictive Analytics</h3>
            <p className="text-gray-600">
              LSTM neural networks analyze your spending patterns to forecast 
              your balance 30 days into the future with confidence intervals.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-warning-600 text-4xl mb-4">⚠️</div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">Financial Stress Alerts</h3>
            <p className="text-gray-600">
              Get early warnings about potential overspending and receive 
              personalized recommendations to improve your financial health.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-20 bg-white rounded-lg shadow-lg p-12">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">1</span>
              </div>
              <h4 className="font-semibold mb-2 text-gray-900">Upload CSV</h4>
              <p className="text-sm text-gray-600">
                Upload your bank statement in CSV format
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">2</span>
              </div>
              <h4 className="font-semibold mb-2 text-gray-900">AI Analysis</h4>
              <p className="text-sm text-gray-600">
                Machine learning categorizes and analyzes your data
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">3</span>
              </div>
              <h4 className="font-semibold mb-2 text-gray-900">Get Predictions</h4>
              <p className="text-sm text-gray-600">
                View future balance forecasts and insights
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">4</span>
              </div>
              <h4 className="font-semibold mb-2 text-gray-900">Take Action</h4>
              <p className="text-sm text-gray-600">
                Follow personalized recommendations
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
