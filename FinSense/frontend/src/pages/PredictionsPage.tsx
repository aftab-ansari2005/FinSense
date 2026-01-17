import React, { useState, useEffect } from 'react';
import PredictionChart from '../components/PredictionChart';
import ModelMetrics from '../components/ModelMetrics';
import DateRangeSelector from '../components/DateRangeSelector';
import predictionService from '../services/prediction.service';

interface ChartDataPoint {
  date: string;
  actualBalance?: number;
  predictedBalance?: number;
  confidenceLower?: number;
  confidenceUpper?: number;
}

const PredictionsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState(30);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    loadPredictions();
  }, [selectedRange]);

  const loadPredictions = async () => {
    try {
      setLoading(true);
      setError(null);

      const { historical, predictions, metrics: modelMetrics } = 
        await predictionService.getPredictions(selectedRange);

      // Combine historical and prediction data
      const combined: ChartDataPoint[] = [];

      // Add historical data
      historical.forEach((item) => {
        combined.push({
          date: item.date,
          actualBalance: item.balance,
        });
      });

      // Add prediction data
      predictions.forEach((pred) => {
        combined.push({
          date: pred.date,
          predictedBalance: pred.predictedBalance,
          confidenceLower: pred.confidenceInterval.lower,
          confidenceUpper: pred.confidenceInterval.upper,
        });
      });

      // Sort by date
      combined.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setChartData(combined);
      setMetrics(modelMetrics);
    } catch (err: any) {
      console.error('Error loading predictions:', err);
      setError(err.response?.data?.message || 'Failed to load predictions');
    } finally {
      setLoading(false);
    }
  };

  const handleRangeChange = (days: number) => {
    setSelectedRange(days);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Financial Predictions</h1>
            <p className="text-gray-600">View your 30-day balance forecasts and insights</p>
          </div>
          <div className="mt-4 md:mt-0">
            <DateRangeSelector
              selectedRange={selectedRange}
              onRangeChange={handleRangeChange}
            />
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 text-red-600 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-red-800">{error}</p>
          </div>
          <button
            onClick={loadPredictions}
            className="mt-3 text-sm text-red-600 hover:text-red-800 font-medium"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Chart */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Balance Forecast</h2>
        <PredictionChart data={chartData} loading={loading} />
        
        {/* Legend explanation */}
        {!loading && chartData.length > 0 && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-0.5 bg-green-500"></div>
              <span className="text-gray-600">
                <span className="font-semibold">Actual Balance:</span> Your historical account balance
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-0.5 bg-blue-500" style={{ borderTop: '3px dashed #3b82f6', backgroundColor: 'transparent' }}></div>
              <span className="text-gray-600">
                <span className="font-semibold">Predicted Balance:</span> AI-generated forecast
              </span>
            </div>
            <div className="flex items-center space-x-2 md:col-span-2">
              <div className="w-8 h-4 bg-blue-100 rounded"></div>
              <span className="text-gray-600">
                <span className="font-semibold">Confidence Range:</span> Expected variation in predictions (95% confidence)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Model Metrics */}
      {metrics && !loading && (
        <ModelMetrics
          modelVersion={metrics.modelVersion}
          accuracy={metrics.accuracy}
          mae={metrics.mae}
          rmse={metrics.rmse}
          lastUpdated={metrics.lastUpdated}
        />
      )}

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <svg
            className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              How Predictions Work
            </h3>
            <p className="text-blue-800 text-sm leading-relaxed">
              Our AI analyzes your spending patterns, income trends, and transaction history
              to forecast your future account balance. The shaded area represents the confidence
              interval - the range where your actual balance is likely to fall. More transaction
              data leads to more accurate predictions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictionsPage;
