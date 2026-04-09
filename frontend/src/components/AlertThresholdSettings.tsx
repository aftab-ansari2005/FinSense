import React, { useState } from 'react';

interface ThresholdSettings {
  stressScoreThreshold: number;
  lowBalanceThreshold: number;
  highSpendingThreshold: number;
  enableEmailAlerts: boolean;
  enablePushNotifications: boolean;
}

interface AlertThresholdSettingsProps {
  initialSettings?: Partial<ThresholdSettings>;
  onSave?: (settings: ThresholdSettings) => void;
  onCancel?: () => void;
}

const AlertThresholdSettings: React.FC<AlertThresholdSettingsProps> = ({
  initialSettings,
  onSave,
  onCancel,
}) => {
  const [settings, setSettings] = useState<ThresholdSettings>({
    stressScoreThreshold: initialSettings?.stressScoreThreshold || 70,
    lowBalanceThreshold: initialSettings?.lowBalanceThreshold || 500,
    highSpendingThreshold: initialSettings?.highSpendingThreshold || 2000,
    enableEmailAlerts: initialSettings?.enableEmailAlerts ?? true,
    enablePushNotifications: initialSettings?.enablePushNotifications ?? false,
  });

  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = (field: keyof ThresholdSettings, value: number | boolean) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (onSave) {
      onSave(settings);
    }
    setHasChanges(false);
  };

  const handleReset = () => {
    setSettings({
      stressScoreThreshold: 70,
      lowBalanceThreshold: 500,
      highSpendingThreshold: 2000,
      enableEmailAlerts: true,
      enablePushNotifications: false,
    });
    setHasChanges(true);
  };

  const getStressLevelLabel = (score: number) => {
    if (score >= 80) return 'Critical';
    if (score >= 70) return 'High';
    if (score >= 50) return 'Moderate';
    return 'Low';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Alert Settings</h2>
          <p className="text-sm text-gray-600 mt-1">
            Customize when you receive financial alerts
          </p>
        </div>
        {hasChanges && (
          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
            Unsaved Changes
          </span>
        )}
      </div>

      <div className="space-y-6">
        {/* Stress Score Threshold */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Financial Stress Alert Threshold
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={settings.stressScoreThreshold}
              onChange={(e) => handleChange('stressScoreThreshold', parseInt(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-gray-900">
                {settings.stressScoreThreshold}
              </span>
              <span className="text-sm text-gray-500">/100</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Alert when stress score reaches: <span className="font-semibold">{getStressLevelLabel(settings.stressScoreThreshold)}</span>
          </p>
        </div>

        {/* Low Balance Threshold */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Low Balance Alert Threshold
          </label>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700 font-medium">$</span>
            <input
              type="number"
              min="0"
              step="100"
              value={settings.lowBalanceThreshold}
              onChange={(e) => handleChange('lowBalanceThreshold', parseInt(e.target.value))}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Alert when balance falls below this amount
          </p>
        </div>

        {/* High Spending Threshold */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            High Spending Alert Threshold (Monthly)
          </label>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700 font-medium">$</span>
            <input
              type="number"
              min="0"
              step="100"
              value={settings.highSpendingThreshold}
              onChange={(e) => handleChange('highSpendingThreshold', parseInt(e.target.value))}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Alert when monthly spending exceeds this amount
          </p>
        </div>

        {/* Notification Preferences */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Notification Preferences
          </h3>
          
          <div className="space-y-3">
            {/* Email Alerts */}
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableEmailAlerts}
                onChange={(e) => handleChange('enableEmailAlerts', e.target.checked)}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">Email Alerts</span>
                <p className="text-xs text-gray-500">Receive alerts via email</p>
              </div>
            </label>

            {/* Push Notifications */}
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enablePushNotifications}
                onChange={(e) => handleChange('enablePushNotifications', e.target.checked)}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">Push Notifications</span>
                <p className="text-xs text-gray-500">Receive browser push notifications</p>
              </div>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Reset to Defaults
          </button>
          
          <div className="flex space-x-3">
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className={`px-6 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                hasChanges
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg
            className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="ml-3 text-sm text-blue-800">
            These settings control when you receive financial alerts. Adjust thresholds based on your
            personal financial situation and preferences.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AlertThresholdSettings;
