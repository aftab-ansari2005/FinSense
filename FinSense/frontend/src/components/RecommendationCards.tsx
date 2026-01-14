import React from 'react';

interface Recommendation {
  message?: string;
  recommendation?: string;
  category?: string;
  priority?: 'high' | 'medium' | 'low';
  action?: string;
}

interface RecommendationCardsProps {
  recommendations: Recommendation[];
}

const RecommendationCards: React.FC<RecommendationCardsProps> = ({ recommendations }) => {
  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  const getPriorityConfig = (priority?: string) => {
    switch (priority) {
      case 'high':
        return {
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          iconColor: 'text-red-600',
          textColor: 'text-red-900',
          badgeColor: 'bg-red-100 text-red-800',
          label: 'High Priority',
        };
      case 'medium':
        return {
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          iconColor: 'text-yellow-600',
          textColor: 'text-yellow-900',
          badgeColor: 'bg-yellow-100 text-yellow-800',
          label: 'Medium Priority',
        };
      case 'low':
        return {
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          iconColor: 'text-blue-600',
          textColor: 'text-blue-900',
          badgeColor: 'bg-blue-100 text-blue-800',
          label: 'Low Priority',
        };
      default:
        return {
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          iconColor: 'text-green-600',
          textColor: 'text-green-900',
          badgeColor: 'bg-green-100 text-green-800',
          label: 'Suggestion',
        };
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'savings':
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
          />
        );
      case 'spending':
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        );
      case 'budget':
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        );
      default:
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900">
          Personalized Recommendations
        </h2>
        <span className="text-sm text-gray-500">
          {recommendations.length} {recommendations.length === 1 ? 'recommendation' : 'recommendations'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recommendations.map((rec, index) => {
          const config = getPriorityConfig(rec.priority);
          const message = rec.message || rec.recommendation || 'No recommendation available';

          return (
            <div
              key={index}
              className={`${config.bgColor} border ${config.borderColor} rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start space-x-3">
                {/* Icon */}
                <div className="flex-shrink-0">
                  <svg
                    className={`w-6 h-6 ${config.iconColor}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {getCategoryIcon(rec.category)}
                  </svg>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Priority Badge */}
                  {rec.priority && (
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${config.badgeColor} mb-2`}>
                      {config.label}
                    </span>
                  )}

                  {/* Category */}
                  {rec.category && (
                    <p className={`text-xs font-medium ${config.textColor} uppercase tracking-wide mb-1`}>
                      {rec.category}
                    </p>
                  )}

                  {/* Message */}
                  <p className={`text-sm ${config.textColor} leading-relaxed`}>
                    {message}
                  </p>

                  {/* Action */}
                  {rec.action && (
                    <button className={`mt-3 text-sm font-medium ${config.iconColor} hover:underline`}>
                      {rec.action} →
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecommendationCards;
