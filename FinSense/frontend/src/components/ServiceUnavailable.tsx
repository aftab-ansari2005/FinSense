import React from 'react';
import { ServiceStatus } from '@/services/serviceHealth.service';

interface ServiceUnavailableProps {
  services?: ServiceStatus[];
  onRetry?: () => void;
  showCachedDataOption?: boolean;
  onUseCachedData?: () => void;
}

const ServiceUnavailable: React.FC<ServiceUnavailableProps> = ({
  services,
  onRetry,
  showCachedDataOption = false,
  onUseCachedData,
}) => {
  const downServices = services?.filter(s => s.status === 'down') || [];
  const hasDownServices = downServices.length > 0;

  return (
    <div className="bg-warning-50 border border-warning-200 rounded-lg p-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className="h-6 w-6 text-warning-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-warning-800">
            {hasDownServices ? 'Service Temporarily Unavailable' : 'Service Degraded'}
          </h3>
          <div className="mt-2 text-sm text-warning-700">
            <p>
              {hasDownServices
                ? 'Some services are currently unavailable. We\'re working to restore them.'
                : 'Some services are experiencing slower than normal response times.'}
            </p>
            
            {services && services.length > 0 && (
              <div className="mt-3 space-y-2">
                {services.map((service) => (
                  <div key={service.name} className="flex items-center justify-between">
                    <span className="font-medium">{service.name}:</span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        service.status === 'healthy'
                          ? 'bg-success-100 text-success-800'
                          : service.status === 'degraded'
                          ? 'bg-warning-100 text-warning-800'
                          : 'bg-danger-100 text-danger-800'
                      }`}
                    >
                      {service.status === 'healthy' && '✓ Healthy'}
                      {service.status === 'degraded' && '⚠ Degraded'}
                      {service.status === 'down' && '✗ Down'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="mt-4 flex gap-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-warning-700 bg-warning-100 hover:bg-warning-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-warning-500"
              >
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Retry
              </button>
            )}
            
            {showCachedDataOption && onUseCachedData && (
              <button
                onClick={onUseCachedData}
                className="inline-flex items-center px-4 py-2 border border-warning-300 text-sm font-medium rounded-md text-warning-700 bg-white hover:bg-warning-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-warning-500"
              >
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                  />
                </svg>
                Use Cached Data
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceUnavailable;
