import React from 'react';

interface Category {
  _id: string;
  totalAmount: number;
  count: number;
  avgAmount: number;
}

interface CategoryBreakdownProps {
  categories: Category[];
  loading?: boolean;
}

const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({
  categories,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border-subtle rounded-xl p-6">
        <div className="h-6 bg-gray-200 dark:bg-dark-bg-tertiary rounded w-1/3 mb-4 animate-pulse"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-dark-bg-tertiary rounded w-1/4 mb-2"></div>
              <div className="h-6 bg-gray-200 dark:bg-dark-bg-tertiary rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Category Breakdown
        </h3>
        <p className="text-gray-500 text-center py-8">
          No transaction data available
        </p>
      </div>
    );
  }

  // Calculate total for percentages
  const total = categories.reduce((sum, cat) => sum + Math.abs(cat.totalAmount), 0);

  // Sort by amount (descending)
  const sortedCategories = [...categories].sort((a, b) =>
    Math.abs(b.totalAmount) - Math.abs(a.totalAmount)
  );

  // Color palette for categories
  const colors = [
    'bg-primary-500',
    'bg-success-500',
    'bg-warning-500',
    'bg-danger-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-blue-500',
  ];

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(amount));
  };

  return (
    <div className="bg-white dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border-subtle rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-4">
        Category Breakdown
      </h3>

      <div className="space-y-4">
        {sortedCategories.map((category, index) => {
          const percentage = total > 0 ? (Math.abs(category.totalAmount) / total) * 100 : 0;
          const colorClass = colors[index % colors.length];

          return (
            <div key={category._id || index}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-dark-text-primary">
                  {category._id || 'Uncategorized'}
                </span>
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-900 dark:text-dark-text-primary">
                    {formatCurrency(category.totalAmount)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-dark-text-secondary ml-2">
                    ({category.count} transactions)
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-dark-bg-tertiary rounded-full h-2">
                <div
                  className={`${colorClass} h-2 rounded-full transition-all duration-300`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-500 dark:text-dark-text-secondary">
                  {percentage.toFixed(1)}% of total
                </span>
                <span className="text-xs text-gray-500 dark:text-dark-text-secondary">
                  Avg: {formatCurrency(category.avgAmount)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {sortedCategories.length > 5 && (
        <div className="mt-4 text-center">
          <button className="text-sm text-primary-600 dark:text-accent-lime hover:text-primary-700 dark:hover:brightness-110 font-medium transition-colors">
            View All Categories
          </button>
        </div>
      )}
    </div>
  );
};

export default CategoryBreakdown;
