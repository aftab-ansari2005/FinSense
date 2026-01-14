import api from './api.service';
import fallbackDataService from './fallbackData.service';

export interface DashboardData {
  transactions: any[];
  balance_data: Array<{
    date: string;
    balance: number;
  }>;
  predictions: any[];
  stress_score: {
    score: number;
    risk_level: string;
    factors: any[];
    calculated_at: string;
  } | null;
  alerts: any[];
  recommendations: any[];
  metadata?: {
    data_period_days: number;
    last_updated: string;
    ml_service_status: {
      predictions: boolean;
      stress_score: boolean;
      alerts: boolean;
      recommendations: boolean;
    };
  };
}

export interface TransactionStats {
  period: {
    start: string;
    end: string;
  };
  categoryBreakdown: Array<{
    _id: string;
    totalAmount: number;
    count: number;
    avgAmount: number;
  }>;
  monthlyTrends: Array<{
    _id: {
      year: number;
      month: number;
    };
    totalIncome: number;
    totalExpenses: number;
    netAmount: number;
    transactionCount: number;
  }>;
}

class DashboardService {
  /**
   * Get aggregated dashboard data from ML service with fallback
   */
  async getDashboardData(days: number = 30): Promise<DashboardData> {
    try {
      const response = await api.get('/ml/dashboard', {
        params: { days },
        timeout: 10000, // 10 second timeout
      });
      
      const data = response.data.data;
      
      // Cache successful response
      fallbackDataService.cacheData('dashboard', data);
      
      return data;
    } catch (error: any) {
      console.warn('Dashboard service unavailable, using fallback data:', error.message);
      
      // Try to use cached data
      const cachedData = fallbackDataService.getCachedData<DashboardData>('dashboard');
      if (cachedData) {
        console.info('Using cached dashboard data');
        return cachedData;
      }
      
      // Return empty data structure if no cache available
      console.warn('No cached data available, returning empty dashboard');
      return fallbackDataService.getFallbackDashboardData();
    }
  }

  /**
   * Get transaction statistics with fallback
   */
  async getTransactionStats(startDate?: string, endDate?: string): Promise<TransactionStats> {
    try {
      const response = await api.get('/transactions/stats/summary', {
        params: { startDate, endDate },
        timeout: 10000,
      });
      
      const data = response.data.data;
      
      // Cache successful response
      fallbackDataService.cacheData('transaction_stats', data);
      
      return data;
    } catch (error: any) {
      console.warn('Transaction stats unavailable, using fallback:', error.message);
      
      // Try to use cached data
      const cachedData = fallbackDataService.getCachedData<TransactionStats>('transaction_stats');
      if (cachedData) {
        console.info('Using cached transaction stats');
        return cachedData;
      }
      
      // Return empty stats if no cache available
      console.warn('No cached stats available, returning empty stats');
      return {
        period: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
        },
        categoryBreakdown: [],
        monthlyTrends: [],
      };
    }
  }

  /**
   * Check if we're using cached data
   */
  isUsingCachedData(key: string): boolean {
    return fallbackDataService.hasCachedData(key);
  }

  /**
   * Get cache age for display
   */
  getCacheAge(key: string): string | null {
    const age = fallbackDataService.getCacheAge(key);
    return age ? fallbackDataService.formatCacheAge(age) : null;
  }
}

export const dashboardService = new DashboardService();
export default dashboardService;

