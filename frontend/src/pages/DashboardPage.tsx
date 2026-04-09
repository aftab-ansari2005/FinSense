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

/* ── Reusable paper card ── */
const PaperCard: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    className="paper-card-base paper-card-torn"
    style={{ borderRadius: '3px', padding: '22px 24px 30px', position: 'relative', ...style }}
  >
    {children}
  </div>
);

/* ── Gold pushpin ── */
const Pin: React.FC = () => (
  <div className="pushpin" style={{ width: '16px', height: '16px' }} />
);

/* ═══ Main Page ════════════════════════════════════════════ */
const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [stats, setStats]                 = useState<TransactionStats | null>(null);
  const [chartData, setChartData]         = useState<ChartDataPoint[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const [dash, stats, pred] = await Promise.all([
        dashboardService.getDashboardData(30),
        dashboardService.getTransactionStats(),
        predictionService.getPredictions(30).catch(() => ({ historical: [], predictions: [], metrics: null })),
      ]);
      setDashboardData(dash);
      setStats(stats);

      const combined: ChartDataPoint[] = [];
      pred.historical?.forEach((i: any) => combined.push({ date: i.date, actualBalance: i.balance }));
      pred.predictions?.forEach((p: any) => combined.push({
        date: p.date,
        predictedBalance: p.predictedBalance,
        confidenceLower: p.confidenceInterval?.lower,
        confidenceUpper: p.confidenceInterval?.upper,
      }));
      combined.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setChartData(combined);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load dashboard data');
    } finally { setLoading(false); }
  };

  const currentBalance = (): number => {
    if (!dashboardData?.balance_data?.length) return 0;
    return dashboardData.balance_data[dashboardData.balance_data.length - 1].balance;
  };

  const monthlySpending = (): number =>
    stats?.categoryBreakdown?.reduce((s, c) => s + (c.totalAmount < 0 ? Math.abs(c.totalAmount) : 0), 0) ?? 0;

  const health = (): { status: string; color: 'success' | 'warning' | 'danger' } => {
    const s = dashboardData?.stress_score?.score;
    if (!s) return { status: 'Good', color: 'success' };
    if (s < 30) return { status: 'Excellent', color: 'success' };
    if (s < 50) return { status: 'Good',      color: 'success' };
    if (s < 70) return { status: 'Fair',      color: 'warning' };
    return       { status: 'At Risk',          color: 'danger'  };
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  const hasData    = !!(dashboardData?.transactions?.length);
  const h          = health();
  const steps      = ['Dashboard', 'Upload\nTransactions', 'Review\nInsights', 'Predictions'];
  const activeStep = 1;

  /* shared label style */
  const inkLabel: React.CSSProperties = {
    fontFamily: "'Lato', sans-serif",
    fontSize: '10px', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '.14em',
    color: '#9a7a50', margin: '0 0 10px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

      {/* ══ Welcome banner — blue watercolour torn bottom ══ */}
      <div
        className="paper-blue"
        style={{
          padding: '28px 32px 20px',
          boxShadow: '0 4px 18px rgba(58,34,10,.3)',
          border: '1px solid rgba(130,185,220,.22)',
          /* torn bottom */
          clipPath: `polygon(
            0% 0%, 100% 0%, 100% 80%,
            98% 85%, 95% 79%, 92% 86%, 89% 80%,
            86% 86%, 83% 80%, 80% 86%, 77% 79%,
            74% 86%, 71% 80%, 68% 85%, 65% 79%,
            62% 86%, 59% 80%, 56% 85%, 53% 79%,
            50% 86%, 47% 80%, 44% 86%, 41% 80%,
            38% 86%, 35% 79%, 32% 85%, 29% 79%,
            26% 85%, 23% 80%, 20% 86%, 17% 80%,
            14% 85%, 11% 79%, 8%  85%, 5%  80%,
            2%  85%, 0%  80%
          )`,
        }}
      >
        <h1 style={{ fontFamily: "'Lato', sans-serif", fontWeight: 900, fontSize: '28px', color: '#1a3848', margin: '0 0 6px' }}>
          Welcome back, {user?.firstName || 'User'}!
        </h1>
        <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '14px', color: '#3e6070', margin: 0 }}>
          Your financial health dashboard.
        </p>
      </div>

      {/* ══ Error ══ */}
      {error && (
        <div style={{
          background: 'rgba(170,50,50,.1)', border: '1px solid rgba(150,50,50,.3)',
          borderRadius: '3px', padding: '12px 16px',
        }}>
          <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 700, color: '#802020', fontSize: '14px', margin: '0 0 4px' }}>
            Error loading dashboard
          </p>
          <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '12px', color: '#802020', margin: 0 }}>{error}</p>
          <button
            onClick={fetchData}
            style={{ marginTop: '8px', fontFamily: "'Lato', sans-serif", fontSize: '12px', color: '#802020', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
          >Try again</button>
        </div>
      )}

      {/* ══ Stat Cards row ══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '18px' }}>
        <StatCard
          title="Current Balance"
          value={hasData ? fmt(currentBalance()) : '$0.00'}
          subtitle={hasData ? 'Based on transaction history' : 'No transactions yet'}
          color="primary" loading={loading}
          trend={hasData ? { value: 5.2, isPositive: true } : undefined}
          icon={<svg style={{ width: '72px', height: '72px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          title="Monthly Spending"
          value={hasData ? fmt(monthlySpending()) : '$0.00'}
          subtitle={hasData ? 'Last 30 days' : 'Upload transactions to see insights'}
          color="gray" loading={loading}
          icon={<svg style={{ width: '72px', height: '72px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>}
        />
        <StatCard
          title="Financial Health"
          value={h.status}
          subtitle={dashboardData?.stress_score ? `Stress score: ${dashboardData.stress_score.score.toFixed(0)}` : 'No stress detected'}
          color={h.color} loading={loading}
          icon={<svg style={{ width: '72px', height: '72px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      {/* ══ Handwritten section heading ══ */}
      <div style={{ paddingLeft: '2px', marginBottom: '-8px' }}>
        <span style={{ fontFamily: "'Caveat', cursive", fontSize: '34px', fontWeight: 700, color: '#2e4e7a', letterSpacing: '.01em' }}>
          Key Metrics Summary
        </span>
      </div>

      {/* ══ Two-column: chart | cork board ══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>

        {/* Balance Forecast paper card */}
        <PaperCard>
          <h2 style={{ fontFamily: "'Lato', sans-serif", fontWeight: 700, fontSize: '16px', color: '#1e1610', margin: '0 0 14px' }}>
            Balance Forecast Summary
          </h2>

          {/* Ruled paper chart wrapper */}
          <div style={{
            background: '#fdfaf0',
            backgroundImage: `repeating-linear-gradient(
              180deg,
              transparent 0px, transparent 27px,
              rgba(160,130,80,.09) 27px, rgba(160,130,80,.09) 28px
            )`,
            border: '1px solid rgba(180,148,95,.2)',
            borderRadius: '2px',
            padding: '8px',
          }}>
            <PredictionChart data={chartData} loading={loading} />
          </div>

          <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '11px', color: '#9a7a50', margin: '10px 0 0' }}>
            30-day forecast: {chartData.length ? 'Data available' : 'No prediction yet.'}
          </p>
        </PaperCard>

        {/* Cork-board onboarding tracker */}
        <div
          className="cork-board"
          style={{ padding: '22px 18px 26px', position: 'relative' }}
        >

          {/* Pinned title label */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '26px' }}>
            <div style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
              <Pin />
              <div
                className="paper-card-base"
                style={{ marginTop: '-2px', padding: '7px 18px', borderRadius: '2px', boxShadow: '2px 3px 10px rgba(40,20,5,.40)' }}
              >
                <span style={{ fontFamily: "'Lato', sans-serif", fontWeight: 700, fontSize: '14px', color: '#1e1610' }}>
                  Onboarding Progress Tracker
                </span>
              </div>
            </div>
          </div>

          {/* Steps + string */}
          <div style={{ position: 'relative' }}>
            {/* Green string */}
            <div style={{
              position: 'absolute', top: '10px', left: '8%', right: '8%',
              height: '2px',
              background: 'linear-gradient(90deg, #2e5a20, #5aaa3a 50%, #2e5a20)',
              boxShadow: '0 1px 4px rgba(40,80,20,.55)',
              borderRadius: '2px', zIndex: 0,
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
              {steps.map((step, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '22%' }}>
                  <Pin />
                  <div
                    className="paper-card-base"
                    style={{
                      marginTop: '-2px',
                      borderRadius: '2px',
                      padding: '5px 6px',
                      width: '100%',
                      textAlign: 'center',
                      boxShadow: i === activeStep
                        ? '2px 3px 10px rgba(40,20,5,.42)'
                        : '1px 2px 6px rgba(40,20,5,.25)',
                      border: i === activeStep
                        ? '1.5px solid rgba(140,108,42,.55)'
                        : '1px solid rgba(180,148,95,.22)',
                      background: i === activeStep
                        ? 'linear-gradient(160deg, #ede4c8, #e4d8b0)'
                        : undefined,
                    }}
                  >
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

      {/* ══ Quick action buttons ══ */}
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', paddingTop: '4px' }}>

        {/* Lime upload */}
        <button className="btn-wood-lime"
          onClick={() => navigate('/upload')}
          style={{ flex: '1', minWidth: '200px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          ⬇ Upload Transactions
        </button>

        {/* Natural wood predictions */}
        <button className="btn-wood-natural"
          onClick={() => navigate('/predictions')}
          style={{ flex: '1', minWidth: '200px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          📊 View Predictions
        </button>

        {/* Light wood review */}
        <button
          onClick={() => navigate('/transactions')}
          style={{
            flex: '1', minWidth: '200px', fontSize: '14px',
            fontFamily: "'Lato', sans-serif", fontWeight: 700, color: '#3a2e22',
            backgroundImage: `
              repeating-linear-gradient(90deg, transparent 0px, transparent 4px, rgba(0,0,0,.04) 4px, rgba(0,0,0,.04) 5px),
              linear-gradient(180deg, #ece4ce, #ddd0b4)
            `,
            borderTop:    '2px solid #f0e8d4',
            borderBottom: '4px solid #b09060',
            borderLeft:   '1px solid #d0b880',
            borderRight:  '1px solid #d0b880',
            borderRadius: '5px', padding: '11px 22px',
            cursor: 'pointer',
            boxShadow: '0 4px 10px rgba(80,52,14,.26), inset 0 1px 0 rgba(255,255,255,.28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            transition: 'all .12s ease',
          }}>
          ☰ Review Transactions
        </button>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', paddingTop: '8px' }}>
        <span style={{ fontFamily: "'Lato', sans-serif", fontSize: '11px', color: 'rgba(200,160,100,.38)', letterSpacing: '.08em' }}>
          © FinSense 2024
        </span>
      </div>

    </div>
  );
};

export default DashboardPage;
