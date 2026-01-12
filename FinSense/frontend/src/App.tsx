import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header bg-blue-600 text-white p-6">
        <h1 className="text-3xl font-bold">FinSense</h1>
        <p className="text-lg mt-2">AI-Powered Wealth Intelligence</p>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Upload Transactions</h2>
            <p className="text-gray-600 mb-4">Upload your bank statement CSV files for analysis</p>
            <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              Coming Soon
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Financial Predictions</h2>
            <p className="text-gray-600 mb-4">View your 30-day balance forecasts and insights</p>
            <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
              Coming Soon
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Smart Categories</h2>
            <p className="text-gray-600 mb-4">AI-powered transaction categorization</p>
            <button className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
              Coming Soon
            </button>
          </div>
        </div>
        
        <div className="mt-12 text-center">
          <h2 className="text-2xl font-bold mb-4">System Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-100 rounded-lg p-4">
              <h3 className="font-semibold">Backend API</h3>
              <p className="text-sm text-gray-600">http://localhost:5000</p>
            </div>
            <div className="bg-gray-100 rounded-lg p-4">
              <h3 className="font-semibold">ML Service</h3>
              <p className="text-sm text-gray-600">http://localhost:5001</p>
            </div>
            <div className="bg-gray-100 rounded-lg p-4">
              <h3 className="font-semibold">Database</h3>
              <p className="text-sm text-gray-600">MongoDB</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;