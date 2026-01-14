/**
 * Fallback Data Service
 * 
 * Provides cached or mock data when backend services are unavailable.
 * Implements graceful degradation for better user experience.
 */

import { DashboardData } from './dashboard.service';
import { Transaction } from './transactions.service';

class FallbackDataService {
  private readonly CACHE_PREFIX = 'finsense_cache_';
  private readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Cache data to localStorage
   */
  cacheData<T>(key: string, data: T): void {
    try {
      const cacheEntry = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(
        `${this.CACHE_PREFIX}${key}`,
        JSON.stringify(cacheEntry)
      );
    } catch (error) {
      console.error('Failed to cache data:', error);
    }
  }

  /**
   * Get cached data from localStorage
   */
  getCachedData<T>(key: string): T | null {
    try {
      const cached = localStorage.getItem(`${this.CACHE_PREFIX}${key}`);
      if (!cached) return null;

      const cacheEntry = JSON.parse(cached);
      const age = Date.now() - cacheEntry.timestamp;

      // Return cached data if not expired
      if (age < this.CACHE_EXPIRY) {
        return cacheEntry.data as T;
      }

      // Remove expired cache
      this.clearCache(key);
      return null;
    } catch (error) {
      console.error('Failed to get cached data:', error);
      return null;
    }
  }

  /**
   * Clear specific cache entry
   */
  clearCache(key: string): void {
    try {
      localStorage.removeItem(`${this.CACHE_PREFIX}${key}`);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * Clear all cached data
   */
  clearAllCache(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Failed to clear all cache:', error);
    }
  }

  /**
   * Get fallback dashboard data
   */
  getFallbackDashboardData(): DashboardData {
    // Try to get cached data first
    const cached = this.getCachedData<DashboardData>('dashboard');
    if (cached) return cached;

    // Return empty/default data structure
    return {
      balance_data: [],
      transactions: [],
      stress_score: null,
      recommendations: [],
      alerts: [],
    };
  }

  /**
   * Get fallback transactions
   */
  getFallbackTransactions(): Transaction[] {
    const cached = this.getCachedData<Transaction[]>('transactions');
    if (cached) return cached;

    return [];
  }

  /**
   * Check if we have cached data available
   */
  hasCachedData(key: string): boolean {
    return this.getCachedData(key) !== null;
  }

  /**
   * Get cache age in milliseconds
   */
  getCacheAge(key: string): number | null {
    try {
      const cached = localStorage.getItem(`${this.CACHE_PREFIX}${key}`);
      if (!cached) return null;

      const cacheEntry = JSON.parse(cached);
      return Date.now() - cacheEntry.timestamp;
    } catch (error) {
      return null;
    }
  }

  /**
   * Format cache age for display
   */
  formatCacheAge(ageMs: number): string {
    const minutes = Math.floor(ageMs / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'just now';
  }
}

export const fallbackDataService = new FallbackDataService();
export default fallbackDataService;
