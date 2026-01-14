import React from 'react';

interface StressScore {
  score: number;
  risk_level: string;
  factors: Array<{
    category: string;
    impact: number;
    description: string;
  }>;
  calculated_at: string;
}

interface StressAlertBannerProps {
  stressScore: StressScore | null;
  onViewDetails?: () => void;
}

const StressAlertBanner: React.FC<StressAlertBannerProps> = ({ stressScore, onViewDetails }) => {
  if (!stressScore || stressScore.score < 50) {
    return null; // Only show for moderate to high stress
  }

  const getRiskConfig = (score: number) => {
    if (score >= 80) {
      return {
        level: 'Critical',
        color: 'red',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-500',
        textColor: 'text-red-900',
        iconColor: 'text-red-600',
        icon: (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        ),
      };
    } else if (score >= 70) {
      return {
        level: 'High',
        color: 'orange',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-500',
        textColor: 'text-orange-900',
        iconColor: 'text-orange-600',
        icon: (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        ),
      };
    } else {
      return {
        level: 'Moderate',
        color: 'yellow',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-500',
        textColor: 'text-yellow-900',
        iconColor: 'text-yellow-600',
        icon: (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        ),
      };
    }
  };

  const config = getRiskConfig(stressScore.score);
  const topFactors = stressScore.factors.slice(0, 3);

  return (
    <div className={`${config.bgColor} border-2 ${config.borderColor} rounded-lg p-6 shadow-lg`}>
      <div className="flex items-start">
        {/* Icon */}
        <div className="flex-shrink-0">
          <svg
            className={`w-8 h-8 ${config.iconColor}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {config.icon}
          </svg>
        </div>

        {/* Content */}
        <div className="ml-4 flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-xl font-bold ${config.textColor}`}>
                {config.level} Financial Stress Detected
              </h3>
              <p className={`text-sm ${config.textColor} mt-1`}>
                Stress Score: {stressScore.score.toFixed(0)}/100 ({stressScore.risk_level})
              </p>
            </div>
            
            {/* Score Badge */}
            <div className={`hidden md:flex items-center justify-center w-20 h-20 rounded-full bg-white border-4 ${config.borderColor}`}>
              <div className="text-center">
                <div className={`text-2xl font-bold ${config.textColor}`}>
                  {stressScore.score.toFixed(0)}
                </div>
                <div className={`text-xs ${config.textColor}`}>
                  Score
                </div>
              </div>
            </div>
          </div>

          {/* Key Factors */}
          {topFactors.length > 0 && (
            <div className="mt-4">
              <p className={`text-sm font-semibold ${config.textColor} mb-2`}>
                Key Contributing Factors:
              </p>
              <div className="space-y-2">
                {topFactors.map((factor, index) => (
                  <div key={index} className="flex items-start">
                    <svg
                      className={`w-4 h-4 ${config.iconColor} mt-0.5 flex-shrink-0`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                    <div className="ml-2">
                      <p className={`text-sm font-medium ${config.textColor}`}>
                        {factor.category}
                      </p>
                      <p className={`text-xs ${config.textColor} opacity-90`}>
                        {factor.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Button */}
          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className={`mt-4 px-4 py-2 bg-white border-2 ${config.borderColor} ${config.textColor} font-semibold rounded-lg hover:bg-opacity-90 transition-colors`}
            >
              View Detailed Analysis
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StressAlertBanner;
