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
      <div style={{
        width: '100%', height: '280px',
        background: 'linear-gradient(160deg, #fdfaf0, #f5eed8)',
        backgroundImage: `repeating-linear-gradient(180deg, transparent 0px, transparent 27px, rgba(160,130,80,.08) 27px, rgba(160,130,80,.08) 28px)`,
        borderRadius: '2px', border: '1px solid rgba(180,148,95,.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'pulse 2s ease-in-out infinite',
      }}>
        <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '13px', color: '#9a7a50' }}>Loading chart data…</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={{
        width: '100%', height: '280px',
        background: 'linear-gradient(160deg, #fdfaf0, #f5eed8 55%, #ede4c8)',
        backgroundImage: `repeating-linear-gradient(180deg, transparent 0px, transparent 27px, rgba(160,130,80,.08) 27px, rgba(160,130,80,.08) 28px)`,
        borderRadius: '2px', border: '1px solid rgba(180,148,95,.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '8px',
      }}>
        <svg style={{ width: '44px', height: '44px', opacity: .28, color: '#5c4230' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '13px', color: '#7a6248', margin: 0 }}>No prediction data available.</p>
        <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '11px', color: '#9a7a58', margin: 0 }}>Upload transactions to generate predictions</p>
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
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart
        data={data}
        margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
        style={{ background: 'transparent' }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(160,130,80,.25)" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          stroke="#9a7a50"
          tick={{ fontFamily: "'Lato', sans-serif", fontSize: '11px', fill: '#9a7a50' }}
        />
        <YAxis
          tickFormatter={formatCurrency}
          stroke="#9a7a50"
          tick={{ fontFamily: "'Lato', sans-serif", fontSize: '11px', fill: '#9a7a50' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontFamily: "'Lato', sans-serif", fontSize: '12px', color: '#7a6248' }}
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

        {/* Actual balance — dark ink line */}
        <Line
          type="monotone"
          dataKey="actualBalance"
          stroke="#3a5a80"
          strokeWidth={2.5}
          dot={{ fill: '#3a5a80', r: 4, strokeWidth: 1.5, stroke: '#f4edda' }}
          activeDot={{ r: 6, fill: '#3a5a80', strokeWidth: 1.5, stroke: '#f4edda' }}
          name="Actual Balance"
          connectNulls={false}
        />

        {/* Predicted balance — dashed red/orange ink */}
        <Line
          type="monotone"
          dataKey="predictedBalance"
          stroke="#b84020"
          strokeWidth={2}
          strokeDasharray="6 3"
          dot={{ fill: '#b84020', r: 4, strokeWidth: 1.5, stroke: '#f4edda' }}
          activeDot={{ r: 6, fill: '#b84020', strokeWidth: 1.5, stroke: '#f4edda' }}
          name="Predicted Balance"
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default PredictionChart;
