import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import dashboardService, { DashboardData, TransactionStats } from '../services/dashboard.service';
import StatCard from '../components/StatCard';
import CategoryBreakdown from '../components/CategoryBreakdown';
import RecentTransactions from '../components/RecentTransactions';
import PredictionChart from '../components/PredictionChart';
import predictionService from '../services/prediction.service';

interface ChartDataPoint {
  date: string;
  actualBalance?: number;
  predictedBalance?: number;
  confidenceLower?: number;
  confidenceUpper?: number;
}

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [dashData, statsData, predData] = await Promise.all([
        dashboardService.getDashboardData(30),
        dashboardService.getTransactionStats(),
        predictionService.getPredictions(30).catch(() => ({ historical: [], predictions: [], metrics: null }))
      ]);

      setDashboardData(dashData);
      setStats(statsData);

      // Process prediction chart data
      const combined: ChartDataPoint[] = [];
      predData.historical?.forEach((item: any) => {
        combined.push({
          date: item.date,
          actualBalance: item.balance,
        });
      });
      predData.predictions?.forEach((pred: any) => {
        combined.push({
          date: pred.date,
          predictedBalance: pred.predictedBalance,
          confidenceLower: pred.confidenceInterval?.lower,
          confidenceUpper: pred.confidenceInterval?.upper,
        });
      });
      combined.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setChartData(combined);
    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const calculateCurrentBalance = (): number => {
    if (!dashboardData?.balance_data || dashboardData.balance_data.length === 0) {
      return 0;
    }
    return dashboardData.balance_data[dashboardData.balance_data.length - 1].balance;
  };

  const calculateMonthlySpending = (): number => {
    if (!stats?.categoryBreakdown) return 0;
    return stats.categoryBreakdown.reduce((sum, cat) => {
      return sum + (cat.totalAmount < 0 ? Math.abs(cat.totalAmount) : 0);
    }, 0);
  };

  const getFinancialHealthStatus = (): { status: string; color: 'success' | 'warning' | 'danger' } => {
    if (!dashboardData?.stress_score) {
      return { status: 'Good', color: 'success' };
    }

    const score = dashboardData.stress_score.score;
    if (score < 30) return { status: 'Excellent', color: 'success' };
    if (score < 50) return { status: 'Good', color: 'success' };
    if (score < 70) return { status: 'Fair', color: 'warning' };
    return { status: 'At Risk', color: 'danger' };
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const hasData = dashboardData && dashboardData.transactions.length > 0;
  const healthStatus = getFinancialHealthStatus();
  const currentBalance = calculateCurrentBalance();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border-subtle rounded-xl p-6 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">
          Welcome back, {user?.firstName || 'User'}!
        </h1>
        <p className="text-gray-600 dark:text-dark-text-secondary">
          Your financial health dashboard
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
          <p className="font-medium">Error loading dashboard</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-2 text-sm font-medium hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Stats Cards - Top Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Current Balance"
          value={hasData ? formatCurrency(currentBalance) : '$0.00'}
          subtitle={hasData ? 'Based on transaction history' : 'No transactions yet'}
          color="primary"
          loading={loading}
          trend={hasData ? {
            value: 5.2,
            isPositive: true
          } : undefined}
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <StatCard
          title="Monthly Spending"
          value={hasData ? formatCurrency(calculateMonthlySpending()) : '$0.00'}
          subtitle={hasData ? 'Last 30 days' : 'Upload transactions to see insights'}
          color="gray"
          loading={loading}
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          }
        />

        <StatCard
          title="Financial Health"
          value={healthStatus.status}
          subtitle={
            dashboardData?.stress_score
              ? `Stress score: ${dashboardData.stress_score.score.toFixed(0)}`
              : 'No stress detected'
          }
          color={healthStatus.color}
          loading={loading}
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Main Chart - Centered and Prominent */}
      <div className="bg-white dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border-subtle rounded-xl p-8 shadow-md hover:shadow-lg dark:hover:shadow-dark-lg transition-shadow">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
              Balance Forecast
            </h2>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
              30-day prediction with confidence interval
            </p>
          </div>
          {currentBalance > 0 && (
            <div className="text-right">
              <p className="text-4xl font-bold text-gray-900 dark:text-accent-lime font-mono">
                {formatCurrency(currentBalance)}
              </p>
              <p className="text-xs text-gray-500 dark:text-dark-text-tertiary mt-1">CURRENT BALANCE</p>
            </div>
          )}
        </div>
        <PredictionChart data={chartData} loading={loading} />
      </div>

      {/* Two Column Layout Below Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <CategoryBreakdown
          categories={stats?.categoryBreakdown || []}
          loading={loading}
        />

        {/* Recent Transactions */}
        <RecentTransactions
          transactions={dashboardData?.transactions || []}
          loading={loading}
          limit={6}
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border-subtle rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-dark-text-primary">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/upload')}
            className="bg-accent-lime hover:brightness-110 text-dark-bg-primary font-semibold py-3 px-6 rounded-lg transition-all shadow-sm"
          >
            📤 Upload Transactions
          </button>
          <button
            onClick={() => navigate('/predictions')}
            className="bg-gray-200 dark:bg-dark-bg-tertiary hover:bg-gray-300 dark:hover:bg-dark-border-focus text-gray-800 dark:text-dark-text-primary font-semibold py-3 px-6 rounded-lg transition-all border border-gray-300 dark:border-dark-border-subtle"
          >
            📊 View Predictions
          </button>
          <button
            onClick={() => navigate('/transactions')}
            className="bg-gray-200 dark:bg-dark-bg-tertiary hover:bg-gray-300 dark:hover:bg-dark-border-focus text-gray-800 dark:text-dark-text-primary font-semibold py-3 px-6 rounded-lg transition-all border border-gray-300 dark:border-dark-border-subtle"
          >
            💳 Review Transactions
          </button>
        </div>
      </div>

      {/* Get Started Message (only if no data) */}
      {!hasData && !loading && (
        <div className="bg-accent-lime/10 dark:bg-accent-lime/5 border-2 border-accent-lime/30 dark:border-accent-lime/20 rounded-xl p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-3">
            🚀 Get Started with FinSense
          </h3>
          <p className="text-gray-700 dark:text-dark-text-secondary mb-6 max-w-2xl mx-auto">
            Upload your bank statement CSV file to start analyzing your financial health.
            Our AI will automatically categorize transactions and predict your future balance.
          </p>
          <button
            onClick={() => navigate('/upload')}
            className="bg-accent-lime hover:brightness-110 text-dark-bg-primary font-bold py-4 px-10 rounded-lg transition-all shadow-md inline-flex items-center space-x-2"
          >
            <span>Upload Now</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
