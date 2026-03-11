import React from 'react';
import { Transaction } from '../types/transaction.types';

interface RecentTransactionsProps {
  transactions: Transaction[];
  loading?: boolean;
  limit?: number;
}

const RecentTransactions: React.FC<RecentTransactionsProps> = ({
  transactions,
  loading = false,
  limit = 10,
}) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border-subtle rounded-xl p-6">
        <div className="h-6 bg-gray-200 dark:bg-dark-bg-tertiary rounded w-1/3 mb-4 animate-pulse"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex justify-between items-center animate-pulse">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-dark-bg-tertiary rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-dark-bg-tertiary rounded w-1/2"></div>
              </div>
              <div className="h-6 bg-gray-200 dark:bg-dark-bg-tertiary rounded w-20"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="bg-white dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border-subtle rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-4">
          Recent Transactions
        </h3>
        <p className="text-gray-500 dark:text-dark-text-secondary text-center py-8">
          No transactions yet. Upload your CSV file to get started.
        </p>
      </div>
    );
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const displayTransactions = transactions.slice(0, limit);

  return (
    <div className="bg-white dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border-subtle rounded-xl p-6 hover:shadow-md dark:hover:shadow-dark-md transition-shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
          Recent Transactions
        </h3>
        <span className="text-sm text-gray-500 dark:text-dark-text-secondary">
          {transactions.length} total
        </span>
      </div>

      <div className="space-y-3">
        {displayTransactions.map((transaction) => {
          const isIncome = transaction.amount > 0;
          const amountColor = isIncome ? 'text-chart-green' : 'text-gray-900 dark:text-dark-text-primary';

          return (
            <div
              key={transaction._id}
              className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-dark-border-subtle last:border-0 hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary transition-colors rounded px-2"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-dark-text-primary truncate">
                  {transaction.description}
                </p>
                <div className="flex items-center mt-1 space-x-2">
                  <span className="text-xs text-gray-500 dark:text-dark-text-secondary">
                    {formatDate(transaction.date)}
                  </span>
                  {transaction.category?.name && (
                    <>
                      <span className="text-xs text-gray-400 dark:text-dark-text-tertiary">•</span>
                      <span className="text-xs text-gray-600 dark:text-dark-text-secondary bg-gray-100 dark:bg-dark-bg-tertiary px-2 py-0.5 rounded">
                        {transaction.category.name}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="ml-4 flex-shrink-0">
                <p className={`text-sm font-semibold ${amountColor}`}>
                  {isIncome ? '+' : ''}{formatCurrency(transaction.amount)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {transactions.length > limit && (
        <div className="mt-4 text-center">
          <button className="text-sm text-primary-600 dark:text-accent-lime hover:text-primary-700 dark:hover:brightness-110 font-medium transition-colors">
            View All Transactions
          </button>
        </div>
      )}
    </div>
  );
};

export default RecentTransactions;
