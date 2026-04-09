import React from 'react';

interface DateRangeSelectorProps {
  selectedRange: number;
  onRangeChange: (days: number) => void;
}

const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  selectedRange,
  onRangeChange,
}) => {
  const ranges = [
    { label: '7 Days', value: 7 },
    { label: '30 Days', value: 30 },
    { label: '60 Days', value: 60 },
    { label: '90 Days', value: 90 },
  ];

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-gray-600 font-medium">Time Range:</span>
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
        {ranges.map((range) => (
          <button
            key={range.value}
            onClick={() => onRangeChange(range.value)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              selectedRange === range.value
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default DateRangeSelector;
