import React from 'react';
import {
  LineChart,
  Line,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ChartDataPoint {
  date: string;
  actualBalance?: number;
  predictedBalance?: number;
  confidenceLower?: number;
  confidenceUpper?: number;
}

interface PredictionChartProps {
  data: ChartDataPoint[];
  loading?: boolean;
}

const PredictionChart: React.FC<PredictionChartProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="w-full h-96 bg-gray-50 dark:bg-dark-bg-secondary rounded-xl animate-pulse flex items-center justify-center border border-gray-200 dark:border-dark-border-subtle">
        <div className="text-gray-400 dark:text-dark-text-tertiary">Loading chart data...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-96 bg-gray-50 dark:bg-dark-bg-secondary rounded-xl flex items-center justify-center border border-gray-200 dark:border-dark-border-subtle">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <p className="mt-2 text-gray-500">No prediction data available</p>
          <p className="text-sm text-gray-400 mt-1">
            Upload transactions to generate predictions
          </p>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;

      return (
        <div className="bg-white dark:bg-dark-bg-tertiary p-4 rounded-lg shadow-lg border border-gray-200 dark:border-dark-border-subtle">
          <p className="font-semibold text-gray-900 dark:text-dark-text-primary mb-2">{formatDate(label)}</p>
          {payload.map((entry: any, index: number) => {
            // Skip confidence range entries in tooltip
            if (entry.dataKey === 'confidenceUpper' || entry.dataKey === 'confidenceLower') {
              return null;
            }

            return (
              <p key={index} className="text-sm mb-1" style={{ color: entry.color }}>
                {entry.name}: {formatCurrency(entry.value)}
              </p>
            );
          })}

          {/* Show confidence interval if available */}
          {data?.confidenceLower !== undefined && data?.confidenceUpper !== undefined && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-dark-border-subtle">
              <p className="text-xs text-gray-600 dark:text-dark-text-secondary mb-1">95% Confidence Interval:</p>
              <p className="text-xs text-gray-700 dark:text-dark-text-primary">
                {formatCurrency(data.confidenceLower)} - {formatCurrency(data.confidenceUpper)}
              </p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-dark-border-subtle" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          className="stroke-gray-500 dark:stroke-dark-text-secondary"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          tickFormatter={formatCurrency}
          className="stroke-gray-500 dark:stroke-dark-text-secondary"
          style={{ fontSize: '12px' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '14px' }}
          iconType="line"
        />

        {/* Confidence interval area - only show if we have prediction data */}
        {data.some(d => d.confidenceUpper !== undefined && d.confidenceLower !== undefined) && (
          <>
            <Area
              type="monotone"
              dataKey="confidenceUpper"
              stroke="none"
              fill="#dbeafe"
              fillOpacity={0.4}
              name="Confidence Range"
            />
            <Area
              type="monotone"
              dataKey="confidenceLower"
              stroke="none"
              fill="#ffffff"
              fillOpacity={1}
            />
          </>
        )}

        {/* Actual balance line */}
        <Line
          type="monotone"
          dataKey="actualBalance"
          stroke="#00ff88"
          strokeWidth={3}
          dot={{ fill: '#00ff88', r: 5, strokeWidth: 2, stroke: '#1a1a1a' }}
          activeDot={{ r: 7, fill: '#00ff88', strokeWidth: 2, stroke: '#1a1a1a' }}
          name="Actual Balance"
          connectNulls={false}
        />

        {/* Predicted balance line */}
        <Line
          type="monotone"
          dataKey="predictedBalance"
          stroke="#7ed321"
          strokeWidth={3}
          strokeDasharray="8 4"
          dot={{ fill: '#7ed321', r: 5, strokeWidth: 2, stroke: '#1a1a1a' }}
          activeDot={{ r: 7, fill: '#7ed321', strokeWidth: 2, stroke: '#1a1a1a' }}
          name="Predicted Balance"
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default PredictionChart;
