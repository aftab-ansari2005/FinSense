import React from 'react';

interface ModelMetricsProps {
  modelVersion: string;
  accuracy: number;
  mae?: number;
  rmse?: number;
  lastUpdated: string;
}

const ModelMetrics: React.FC<ModelMetricsProps> = ({
  modelVersion,
  accuracy,
  mae,
  rmse,
  lastUpdated,
}) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAccuracyColor = (acc: number) => {
    if (acc >= 0.9) return 'text-green-600 bg-green-50';
    if (acc >= 0.75) return 'text-blue-600 bg-blue-50';
    if (acc >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getAccuracyLabel = (acc: number) => {
    if (acc >= 0.9) return 'Excellent';
    if (acc >= 0.75) return 'Good';
    if (acc >= 0.6) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Model Performance</h3>
        <span className="text-xs text-gray-500">
          Updated: {formatDate(lastUpdated)}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Model Version */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-1">
            <svg
              className="w-4 h-4 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
            <span className="text-xs text-gray-600 font-medium">Version</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{modelVersion}</p>
        </div>

        {/* Accuracy */}
        <div className={`rounded-lg p-4 ${getAccuracyColor(accuracy)}`}>
          <div className="flex items-center space-x-2 mb-1">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-xs font-medium">Accuracy</span>
          </div>
          <p className="text-lg font-bold">{(accuracy * 100).toFixed(1)}%</p>
          <p className="text-xs mt-1">{getAccuracyLabel(accuracy)}</p>
        </div>

        {/* MAE */}
        {mae !== undefined && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-1">
              <svg
                className="w-4 h-4 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
              <span className="text-xs text-gray-600 font-medium">MAE</span>
            </div>
            <p className="text-lg font-bold text-gray-900">
              ${mae.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Mean Abs Error</p>
          </div>
        )}

        {/* RMSE */}
        {rmse !== undefined && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-1">
              <svg
                className="w-4 h-4 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                />
              </svg>
              <span className="text-xs text-gray-600 font-medium">RMSE</span>
            </div>
            <p className="text-lg font-bold text-gray-900">
              ${rmse.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Root Mean Sq Error</p>
          </div>
        )}
      </div>

      {/* Info message */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-xs text-blue-800">
          <span className="font-semibold">Note:</span> Model accuracy represents how well
          predictions match actual outcomes. Higher accuracy indicates more reliable forecasts.
        </p>
      </div>
    </div>
  );
};

export default ModelMetrics;
