import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import dashboardService, { DashboardData, TransactionStats } from '../services/dashboard.service';
import StatCard from '../components/StatCard';
import PredictionChart from '../components/PredictionChart';
import predictionService from '../services/prediction.service';

interface ChartDataPoint {
  date: string;
  actualBalance?: number;
  predictedBalance?: number;
  confidenceLower?: number;
  confidenceUpper?: number;
}

/* ── Paper card with clip-path torn bottom ── */
const PaperCard: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{
    background: 'linear-gradient(160deg, #faf5ea 0%, #f4edda 55%, #ede4c8 100%)',
    backgroundImage: `
      repeating-linear-gradient(
        0deg,
        rgba(180,145,90,0),
        rgba(180,145,90,0) 27px,
        rgba(180,145,90,0.06) 28px
      ),
      linear-gradient(160deg, #faf5ea 0%, #f4edda 55%, #ede4c8 100%)
    `,
    borderRadius: '4px',
    boxShadow: '0 4px 20px rgba(60,35,10,0.34), 0 1px 0 rgba(255,250,225,0.6) inset',
    border: '1px solid rgba(180,145,90,0.18)',
    position: 'relative',
    paddingBottom: '18px',
    clipPath: `polygon(
      0% 0%, 100% 0%, 100% 86%,
      98% 89%, 96% 85%, 94% 90%, 92% 86%,
      90% 92%, 88% 87%, 86% 91%, 84% 85%,
      82% 89%, 80% 85%, 78% 91%, 76% 87%,
      74% 91%, 72% 86%, 70% 90%, 68% 84%,
      66% 90%, 64% 86%, 62% 92%, 60% 87%,
      58% 91%, 56% 86%, 54% 89%, 52% 84%,
      50% 89%, 48% 85%, 46% 91%, 44% 87%,
      42% 91%, 40% 85%, 38% 89%, 36% 85%,
      34% 91%, 32% 86%, 30% 90%, 28% 85%,
      26% 90%, 24% 86%, 22% 92%, 20% 87%,
      18% 89%, 16% 84%, 14% 90%, 12% 86%,
      10% 89%, 8% 92%, 6% 87%, 4% 90%,
      2% 86%, 0% 89%
    )`,
    ...style,
  }}>
    {children}
  </div>
);

/* ── Gold pushpin ── */
const Pushpin: React.FC = () => (
  <div style={{
    width: '16px', height: '16px', borderRadius: '50%',
    background: 'radial-gradient(circle at 35% 35%, #f8e080, #c89030 58%, #9a6e18)',
    boxShadow: '0 2px 5px rgba(0,0,0,0.55), inset 0 1px 2px rgba(255,240,160,0.5)',
    border: '1.5px solid #8a6010',
    flexShrink: 0,
  }} />
);

/* ── Main page ── */
const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    setLoading(true); setError(null);
    try {
      const [dashData, statsData, predData] = await Promise.all([
        dashboardService.getDashboardData(30),
        dashboardService.getTransactionStats(),
        predictionService.getPredictions(30).catch(() => ({ historical: [], predictions: [], metrics: null })),
      ]);
      setDashboardData(dashData);
      setStats(statsData);
      const combined: ChartDataPoint[] = [];
      predData.historical?.forEach((item: any) => combined.push({ date: item.date, actualBalance: item.balance }));
      predData.predictions?.forEach((pred: any) => combined.push({ date: pred.date, predictedBalance: pred.predictedBalance, confidenceLower: pred.confidenceInterval?.lower, confidenceUpper: pred.confidenceInterval?.upper }));
      combined.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setChartData(combined);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally { setLoading(false); }
  };

  const calculateCurrentBalance = (): number => {
    if (!dashboardData?.balance_data?.length) return 0;
    return dashboardData.balance_data[dashboardData.balance_data.length - 1].balance;
  };

  const calculateMonthlySpending = (): number => {
    if (!stats?.categoryBreakdown) return 0;
    return stats.categoryBreakdown.reduce((sum, cat) => sum + (cat.totalAmount < 0 ? Math.abs(cat.totalAmount) : 0), 0);
  };

  const getFinancialHealthStatus = (): { status: string; color: 'success' | 'warning' | 'danger' } => {
    if (!dashboardData?.stress_score) return { status: 'Good', color: 'success' };
    const s = dashboardData.stress_score.score;
    if (s < 30) return { status: 'Excellent', color: 'success' };
    if (s < 50) return { status: 'Good', color: 'success' };
    if (s < 70) return { status: 'Fair', color: 'warning' };
    return { status: 'At Risk', color: 'danger' };
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  const hasData = dashboardData && dashboardData.transactions.length > 0;
  const healthStatus = getFinancialHealthStatus();
  const currentBalance = calculateCurrentBalance();
  const steps = ['Dashboard', 'Upload\nTransactions', 'Review\nInsights', 'Predictions'];
  const activeStep = 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ── Welcome banner — blue watercolor paper ── */}
      <div style={{
        background: 'linear-gradient(160deg, #cee0ea 0%, #d8eaf4 45%, #c4d8e4 100%)',
        backgroundImage: `
          repeating-linear-gradient(0deg, rgba(100,160,200,0), rgba(100,160,200,0) 27px, rgba(100,160,200,0.07) 28px),
          linear-gradient(160deg, #cee0ea, #d8eaf4 45%, #c4d8e4)
        `,
        padding: '26px 30px 22px',
        boxShadow: '0 4px 20px rgba(60,35,10,0.3)',
        border: '1px solid rgba(130,180,220,0.25)',
        /* torn bottom via clip-path */
        clipPath: `polygon(
          0% 0%, 100% 0%, 100% 84%,
          98% 88%, 96% 83%, 94% 89%, 92% 84%,
          90% 90%, 88% 84%, 86% 89%, 84% 83%,
          82% 88%, 80% 83%, 78% 90%, 76% 85%,
          74% 89%, 72% 83%, 70% 88%, 68% 83%,
          66% 89%, 64% 84%, 62% 90%, 60% 85%,
          58% 89%, 56% 83%, 54% 88%, 52% 83%,
          50% 89%, 48% 84%, 46% 90%, 44% 85%,
          42% 89%, 40% 83%, 38% 88%, 36% 83%,
          34% 90%, 32% 85%, 30% 89%, 28% 83%,
          26% 88%, 24% 83%, 22% 90%, 20% 85%,
          18% 88%, 16% 82%, 14% 89%, 12% 84%,
          10% 88%, 8% 84%, 6% 89%, 4% 83%,
          2% 88%, 0% 83%
        )`,
        position: 'relative',
        borderRadius: '4px 4px 0 0',
      }}>
        <h1 style={{ fontFamily: "'Lato', sans-serif", fontWeight: 900, fontSize: '28px', color: '#1e3a4a', marginBottom: '6px' }}>
          Welcome back, {user?.firstName || 'User'}!
        </h1>
        <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '14px', color: '#4a6878' }}>
          Your financial health dashboard.
        </p>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ background: 'rgba(180,60,60,0.1)', border: '1px solid rgba(160,60,60,0.3)', borderRadius: '4px', padding: '12px 16px' }}>
          <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 700, color: '#8a2020', fontSize: '14px' }}>Error loading dashboard</p>
          <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '12px', color: '#8a2020', marginTop: '4px' }}>{error}</p>
          <button onClick={fetchDashboardData} style={{ marginTop: '8px', fontFamily: "'Lato', sans-serif", fontSize: '12px', color: '#8a2020', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}>Try again</button>
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', paddingBottom: '4px' }}>
        <StatCard
          title="Current Balance"
          value={hasData ? formatCurrency(currentBalance) : '$0.00'}
          subtitle={hasData ? 'Based on transaction history' : 'No transactions yet'}
          color="primary" loading={loading}
          trend={hasData ? { value: 5.2, isPositive: true } : undefined}
          icon={<svg style={{ width: '72px', height: '72px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          title="Monthly Spending"
          value={hasData ? formatCurrency(calculateMonthlySpending()) : '$0.00'}
          subtitle={hasData ? 'Last 30 days' : 'Upload transactions to see insights'}
          color="gray" loading={loading}
          icon={<svg style={{ width: '72px', height: '72px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>}
        />
        <StatCard
          title="Financial Health"
          value={healthStatus.status}
          subtitle={dashboardData?.stress_score ? `Stress score: ${dashboardData.stress_score.score.toFixed(0)}` : 'No stress detected'}
          color={healthStatus.color} loading={loading}
          icon={<svg style={{ width: '72px', height: '72px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      {/* ── Handwritten section title ── */}
      <div style={{ paddingLeft: '4px', marginBottom: '-10px' }}>
        <span style={{ fontFamily: "'Caveat', cursive", fontSize: '34px', fontWeight: 700, color: '#3a6496', letterSpacing: '0.01em' }}>
          Key Metrics Summary
        </span>
      </div>

      {/* ── Chart + Cork board ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '22px', alignItems: 'start' }}>

        {/* Balance Forecast — paper card */}
        <PaperCard style={{ padding: '22px 24px 24px' }}>
          <h2 style={{ fontFamily: "'Lato', sans-serif", fontWeight: 700, fontSize: '16px', color: '#1e1610', marginBottom: '14px' }}>
            Balance Forecast Summary
          </h2>

          {/* Chart wrapper — override any white bg inside PredictionChart */}
          <div style={{
            background: 'rgba(255,250,240,0.6)',
            border: '1px solid rgba(180,145,90,0.18)',
            borderRadius: '3px',
            padding: '8px',
            backgroundImage: `repeating-linear-gradient(
              0deg,
              rgba(180,145,90,0),
              rgba(180,145,90,0) 27px,
              rgba(180,145,90,0.08) 28px
            )`,
          }}>
            <PredictionChart data={chartData} loading={loading} />
          </div>

          <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '11px', color: '#9a7a52', marginTop: '12px' }}>
            30-day forecast: {chartData.length > 0 ? 'Data available' : 'No prediction yet.'}
          </p>
        </PaperCard>

        {/* ── Cork board Onboarding Tracker ── */}
        <div style={{
          background: `
            radial-gradient(ellipse at 20% 30%, rgba(200,155,70,0.75) 0%, transparent 50%),
            radial-gradient(ellipse at 75% 70%, rgba(140,100,40,0.65) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(220,175,90,0.4) 0%, transparent 65%)
          `,
          backgroundColor: '#c8963e',
          borderRadius: '6px',
          border: '5px solid #7a5010',
          boxShadow: 'inset 0 3px 12px rgba(0,0,0,0.38), inset 0 -2px 6px rgba(200,160,60,0.2), 0 6px 22px rgba(30,15,5,0.45)',
          padding: '22px 18px 28px',
          position: 'relative',
        }}>

          {/* Title label pinned to cork */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              {/* Pushpin above label */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '-2px' }}>
                <Pushpin />
              </div>
              <div style={{
                background: 'linear-gradient(160deg, #f8f2e5, #ece4ce)',
                border: '1px solid rgba(180,140,80,0.3)',
                borderRadius: '2px',
                padding: '7px 20px',
                boxShadow: '2px 3px 10px rgba(40,20,5,0.38)',
              }}>
                <span style={{ fontFamily: "'Lato', sans-serif", fontWeight: 700, fontSize: '14px', color: '#1e1610' }}>
                  Onboarding Progress Tracker
                </span>
              </div>
            </div>
          </div>

          {/* Steps with string */}
          <div style={{ position: 'relative' }}>
            {/* Green string */}
            <div style={{
              position: 'absolute',
              top: '10px',
              left: '8%', right: '8%',
              height: '2px',
              background: 'linear-gradient(90deg, #3a6a2a, #5aaa3a 50%, #3a6a2a)',
              boxShadow: '0 1px 4px rgba(40,80,20,0.55)',
              borderRadius: '2px',
              zIndex: 0,
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
              {steps.map((step, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '22%' }}>
                  <Pushpin />
                  <div style={{
                    background: i === activeStep
                      ? 'linear-gradient(160deg, #f0e8d0, #e4d8b8)'
                      : 'linear-gradient(160deg, #f8f2e5, #ede4ce)',
                    border: i === activeStep
                      ? '1.5px solid rgba(140,105,40,0.55)'
                      : '1px solid rgba(180,145,80,0.3)',
                    borderRadius: '3px',
                    padding: '5px 6px',
                    boxShadow: i === activeStep
                      ? '2px 3px 10px rgba(40,20,5,0.42)'
                      : '1px 2px 6px rgba(40,20,5,0.25)',
                    textAlign: 'center',
                    width: '100%',
                  }}>
                    <span style={{
                      fontFamily: "'Lato', sans-serif",
                      fontSize: '10px',
                      fontWeight: i === activeStep ? 700 : 400,
                      color: '#1e1610',
                      whiteSpace: 'pre-line',
                      lineHeight: 1.35,
                      display: 'block',
                    }}>
                      {i + 1}. {step}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick action wooden buttons ── */}
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '4px' }}>
        <button onClick={() => navigate('/upload')} className="btn-wood-lime"
          style={{ flex: '1', minWidth: '200px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          ⬇ Upload Transactions
        </button>
        <button onClick={() => navigate('/predictions')} className="btn-wood-natural"
          style={{ flex: '1', minWidth: '200px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          📊 View Predictions
        </button>
        <button onClick={() => navigate('/transactions')} style={{
          flex: '1', minWidth: '200px', fontSize: '14px',
          fontFamily: "'Lato', sans-serif", fontWeight: 700, color: '#3a2e22',
          background: `
            repeating-linear-gradient(90deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 5px, rgba(0,0,0,0.03) 5px, rgba(0,0,0,0.03) 6px),
            linear-gradient(180deg, #ece4d0, #ddd0b8)
          `,
          border: '1.5px solid rgba(140,110,60,0.35)',
          borderBottom: '3px solid rgba(120,90,40,0.42)',
          borderRadius: '6px', padding: '11px 20px', cursor: 'pointer',
          boxShadow: '0 3px 8px rgba(80,50,10,0.22), inset 0 1px 0 rgba(255,255,255,0.28)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          transition: 'all 0.12s ease',
        }}>
          ☰ Review Transactions
        </button>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', paddingTop: '8px', paddingBottom: '4px' }}>
        <span style={{ fontFamily: "'Lato', sans-serif", fontSize: '11px', color: 'rgba(255,235,180,0.4)', letterSpacing: '0.08em' }}>
          © FinSense 2024
        </span>
      </div>

    </div>
  );
};

export default DashboardPage;
