import React, { useState } from 'react';

interface Alert {
  message?: string;
  description?: string;
  type?: 'warning' | 'danger' | 'info';
  severity?: 'high' | 'medium' | 'low';
  timestamp?: string;
  dismissible?: boolean;
}

interface AlertListProps {
  alerts: Alert[];
  onDismiss?: (index: number) => void;
}

const AlertList: React.FC<AlertListProps> = ({ alerts, onDismiss }) => {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<number>>(new Set());

  if (!alerts || alerts.length === 0) {
    return null;
  }

  const handleDismiss = (index: number) => {
    setDismissedAlerts(prev => new Set(prev).add(index));
    if (onDismiss) {
      onDismiss(index);
    }
  };

  const getAlertConfig = (alert: Alert) => {
    const severity = alert.severity || alert.type || 'warning';

    switch (severity) {
      case 'high':
      case 'danger':
        return {
          bgColor: 'bg-red-50',
          borderColor: 'border-red-400',
          textColor: 'text-red-800',
          iconColor: 'text-red-600',
          icon: (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          ),
        };
      case 'medium':
      case 'warning':
        return {
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-400',
          textColor: 'text-yellow-800',
          iconColor: 'text-yellow-600',
          icon: (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          ),
        };
      case 'low':
      case 'info':
        return {
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-400',
          textColor: 'text-blue-800',
          iconColor: 'text-blue-600',
          icon: (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          ),
        };
      default:
        return {
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-400',
          textColor: 'text-yellow-800',
          iconColor: 'text-yellow-600',
          icon: (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          ),
        };
    }
  };

  const visibleAlerts = alerts.filter((_, index) => !dismissedAlerts.has(index));

  if (visibleAlerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-3">
        Active Alerts ({visibleAlerts.length})
      </h3>

      {alerts.map((alert, index) => {
        if (dismissedAlerts.has(index)) return null;

        const config = getAlertConfig(alert);
        const message = alert.message || alert.description || 'Alert notification';

        return (
          <div
            key={index}
            className={`${config.bgColor} border ${config.borderColor} rounded-lg p-4 shadow-sm`}
          >
            <div className="flex items-start">
              {/* Icon */}
              <div className="flex-shrink-0">
                <svg
                  className={`w-5 h-5 ${config.iconColor}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {config.icon}
                </svg>
              </div>

              {/* Content */}
              <div className="ml-3 flex-1">
                <p className={`text-sm font-medium ${config.textColor}`}>
                  {message}
                </p>

                {alert.timestamp && (
                  <p className={`text-xs ${config.textColor} opacity-75 mt-1`}>
                    {new Date(alert.timestamp).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Dismiss Button */}
              {alert.dismissible !== false && (
                <button
                  onClick={() => handleDismiss(index)}
                  className={`ml-3 flex-shrink-0 ${config.iconColor} hover:opacity-75 transition-opacity`}
                  aria-label="Dismiss alert"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AlertList;
