import React from 'react';

const OPTIONS = [
  { value: 7, label: '7 Days' },
  { value: 30, label: '30 Days' },
  { value: 90, label: '90 Days' },
];

const DateRangeFilter = ({ value, onChange }) => {
  return (
    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            value === opt.value
              ? 'bg-gold text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

export default DateRangeFilter;
