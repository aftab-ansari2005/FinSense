import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'gray';
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'primary',
  loading = false,
}) => {
  const colorClasses = {
    primary: 'text-primary-600 dark:text-accent-lime',
    success: 'text-success-600 dark:text-chart-green',
    warning: 'text-warning-600 dark:text-chart-yellow',
    danger: 'text-danger-600 dark:text-chart-red',
    gray: 'text-gray-900 dark:text-dark-text-primary',
  };

  const trendColorClasses = {
    positive: 'text-chart-green',
    negative: 'text-chart-red',
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border-subtle rounded-xl p-6 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-dark-bg-tertiary rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-gray-200 dark:bg-dark-bg-tertiary rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 dark:bg-dark-bg-tertiary rounded w-1/3"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border-subtle rounded-xl p-6 
                    hover:border-gray-300 dark:hover:border-dark-border-focus 
                    hover:shadow-lg dark:hover:shadow-dark-md
                    transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-600 dark:text-dark-text-secondary mb-3">
            {title}
          </p>
          <p className={`text-3xl font-semibold ${colorClasses[color]} mb-2`}>
            {value}
          </p>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-dark-text-tertiary">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center mt-3">
              <svg
                className={`w-4 h-4 ${trend.isPositive ? trendColorClasses.positive : trendColorClasses.negative}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {trend.isPositive ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                  />
                )}
              </svg>
              <span className={`text-sm font-medium ml-1 ${trend.isPositive ? trendColorClasses.positive : trendColorClasses.negative}`}>
                {trend.isPositive ? '+' : ''}{Math.abs(trend.value)}%
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className="ml-4 text-accent-gold">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
