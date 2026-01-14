import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import dashboardService, { DashboardData, TransactionStats } from '@/services/dashboard.service';
import StatCard from '@/components/StatCard';
import CategoryBreakdown from '@/components/CategoryBreakdown';
import RecentTransactions from '@/components/RecentTransactions';
import StressAlertBanner from '@/components/StressAlertBanner';
import RecommendationCards from '@/components/RecommendationCards';
import AlertList from '@/components/AlertList';
import AlertThresholdSettings from '@/components/AlertThresholdSettings';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [dashData, statsData] = await Promise.all([
        dashboardService.getDashboardData(30),
        dashboardService.getTransactionStats(),
      ]);

      setDashboardData(dashData);
      setStats(statsData);
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

  const handleSaveSettings = (settings: any) => {
    console.log('Saving alert settings:', settings);
    // TODO: Implement API call to save settings
    setShowSettings(false);
    // Show success message
    alert('Alert settings saved successfully!');
  };

  const handleDismissAlert = (index: number) => {
    console.log('Dismissing alert:', index);
    // TODO: Implement API call to dismiss alert
  };

  const hasData = dashboardData && dashboardData.transactions.length > 0;
  const healthStatus = getFinancialHealthStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.firstName || 'User'}!
        </h1>
        <p className="text-gray-600">
          Your financial health dashboard
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-danger-50 border border-danger-500 text-danger-700 px-4 py-3 rounded-lg">
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

      {/* Prominent Stress Alert Banner */}
      {!loading && dashboardData?.stress_score && (
        <StressAlertBanner
          stressScore={dashboardData.stress_score}
          onViewDetails={() => navigate('/predictions')}
        />
      )}

      {/* Alert Threshold Settings */}
      {showSettings && (
        <AlertThresholdSettings
          onSave={handleSaveSettings}
          onCancel={() => setShowSettings(false)}
        />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Current Balance"
          value={hasData ? formatCurrency(calculateCurrentBalance()) : '$0.00'}
          subtitle={hasData ? 'Based on transaction history' : 'No transactions yet'}
          color="primary"
          loading={loading}
          icon={
            <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <svg className="w-8 h-8 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        {/* Settings Card */}
        <div className="bg-white rounded-lg shadow-md p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-2">Alert Settings</h3>
            <p className="text-xs text-gray-500">
              Manage your notification preferences
            </p>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="mt-4 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {showSettings ? 'Hide Settings' : 'Configure Alerts'}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {dashboardData?.alerts && dashboardData.alerts.length > 0 && (
        <AlertList
          alerts={dashboardData.alerts}
          onDismiss={handleDismissAlert}
        />
      )}

      {/* Main Content Grid */}
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
          limit={8}
        />
      </div>

      {/* Recommendations */}
      {dashboardData?.recommendations && dashboardData.recommendations.length > 0 && (
        <RecommendationCards recommendations={dashboardData.recommendations} />
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/upload')}
            className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Upload Transactions
          </button>
          <button
            onClick={() => navigate('/predictions')}
            className="bg-success-600 hover:bg-success-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            View Predictions
          </button>
          <button
            onClick={() => navigate('/transactions')}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Review Transactions
          </button>
        </div>
      </div>

      {/* Get Started Message (only if no data) */}
      {!hasData && !loading && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-primary-900 mb-2">
            Get Started
          </h3>
          <p className="text-primary-700">
            Upload your bank statement CSV file to start analyzing your financial health.
            Our AI will automatically categorize transactions and predict your future balance.
          </p>
          <button
            onClick={() => navigate('/upload')}
            className="mt-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Upload Now
          </button>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
