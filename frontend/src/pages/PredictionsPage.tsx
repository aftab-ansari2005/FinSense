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

const inkText: React.CSSProperties = { fontFamily: "'Lato', sans-serif", color: '#1e1610' };
const inkLabel: React.CSSProperties = { ...inkText, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.13em', color: '#9a7a50', margin: '0 0 8px' };

const Section: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div className="paper-card-base paper-card-torn" style={{ borderRadius: '3px', padding: '22px 24px 32px', position: 'relative', ...style }}>
    {children}
  </div>
);

const PredictionsPage: React.FC = () => {
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState(30);
  const [chartData, setChartData]     = useState<ChartDataPoint[]>([]);
  const [metrics, setMetrics]         = useState<any>(null);

  useEffect(() => { loadPredictions(); }, [selectedRange]);

  const loadPredictions = async () => {
    setLoading(true); setError(null);
    try {
      const { historical, predictions, metrics: m } = await predictionService.getPredictions(selectedRange);
      const combined: ChartDataPoint[] = [];
      historical.forEach((i: any) => combined.push({ date: i.date, actualBalance: i.balance }));
      predictions.forEach((p: any) => combined.push({
        date: p.date, predictedBalance: p.predictedBalance,
        confidenceLower: p.confidenceInterval.lower, confidenceUpper: p.confidenceInterval.upper,
      }));
      combined.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setChartData(combined); setMetrics(m);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load predictions');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header */}
      <div
        className="paper-blue"
        style={{
          padding: '24px 28px 18px',
          boxShadow: '0 4px 18px rgba(58,34,10,.3)',
          clipPath: `polygon(0% 0%, 100% 0%, 100% 78%, 97% 84%, 93% 78%, 90% 85%, 86% 78%, 82% 85%, 78% 78%, 74% 85%, 70% 78%, 66% 84%, 62% 78%, 58% 84%, 54% 78%, 50% 85%, 46% 78%, 42% 84%, 38% 78%, 34% 85%, 30% 78%, 26% 84%, 22% 78%, 18% 84%, 14% 78%, 10% 84%, 6% 78%, 2% 84%, 0% 78%)`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}
      >
        <div>
          <h1 style={{ ...inkText, fontWeight: 900, fontSize: '26px', margin: '0 0 5px', color: '#1a3848' }}>Financial Predictions</h1>
          <p style={{ ...inkText, fontSize: '14px', color: '#3e6070', margin: 0 }}>View your balance forecasts and AI-generated insights</p>
        </div>
        <div style={{ alignSelf: 'center' }}>
          <DateRangeSelector selectedRange={selectedRange} onRangeChange={setSelectedRange} />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: 'rgba(170,50,50,.1)', border: '1px solid rgba(150,50,50,.3)', borderRadius: '3px', padding: '12px 16px' }}>
          <p style={{ ...inkText, fontWeight: 700, color: '#802020', fontSize: '14px', margin: '0 0 4px' }}>Failed to load predictions</p>
          <p style={{ ...inkText, fontSize: '12px', color: '#802020', margin: 0 }}>{error}</p>
          <button onClick={loadPredictions} style={{ ...inkText, marginTop: '8px', fontSize: '12px', color: '#802020', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>Try Again</button>
        </div>
      )}

      {/* Chart */}
      <Section>
        <h2 style={{ ...inkText, fontWeight: 700, fontSize: '16px', margin: '0 0 14px' }}>Balance Forecast</h2>

        <div style={{
          background: 'linear-gradient(160deg, #fdfaf0, #f5eed8)',
          backgroundImage: `repeating-linear-gradient(180deg, transparent 0px, transparent 27px, rgba(160,130,80,.08) 27px, rgba(160,130,80,.08) 28px), linear-gradient(160deg, #fdfaf0, #f5eed8)`,
          border: '1px solid rgba(180,148,95,.2)', borderRadius: '2px', padding: '8px',
        }}>
          <PredictionChart data={chartData} loading={loading} />
        </div>

        {!loading && chartData.length > 0 && (
          <div style={{ display: 'flex', gap: '20px', marginTop: '12px', flexWrap: 'wrap' }}>
            {[
              { colour: '#3a5a80', dash: false, label: 'Actual Balance', desc: 'Your historical account balance' },
              { colour: '#b84020', dash: true,  label: 'Predicted Balance', desc: 'AI-generated forecast' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '28px', height: '2px',
                  background: item.dash ? 'none' : item.colour,
                  borderTop: item.dash ? `2px dashed ${item.colour}` : 'none',
                }} />
                <p style={{ ...inkText, fontSize: '12px', color: '#7a6248', margin: 0 }}>
                  <strong>{item.label}</strong>: {item.desc}
                </p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Model metrics */}
      {metrics && !loading && (
        <Section>
          <h2 style={{ ...inkText, fontWeight: 700, fontSize: '16px', margin: '0 0 14px' }}>Model Performance</h2>
          <ModelMetrics
            modelVersion={metrics.modelVersion}
            accuracy={metrics.accuracy}
            mae={metrics.mae}
            rmse={metrics.rmse}
            lastUpdated={metrics.lastUpdated}
          />
        </Section>
      )}

      {/* How it works */}
      <Section>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '22px', flexShrink: 0 }}>🔮</span>
          <div>
            <h3 style={{ ...inkText, fontWeight: 700, fontSize: '15px', margin: '0 0 8px' }}>How Predictions Work</h3>
            <p style={{ ...inkText, fontSize: '13px', color: '#5a4832', margin: 0, lineHeight: 1.65 }}>
              Our AI analyzes your spending patterns, income trends, and transaction history to forecast
              your future account balance. The shaded area represents the <strong>confidence interval</strong> — the
              range where your actual balance is likely to fall. More transaction data leads to more
              accurate predictions.
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
};

export default PredictionsPage;
