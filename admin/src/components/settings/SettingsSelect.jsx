import React from 'react';

const SettingsSelect = ({ label, name, value, onChange, options, placeholder = 'Select', required, disabled, error }) => {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select
        id={name}
        name={name}
        value={value || ''}
        onChange={onChange}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-colors ${
          disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-900'
        } ${error ? 'border-red-300' : 'border-gray-200'}`}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => {
          const optValue = typeof opt === 'object' ? opt.value : opt;
          const optLabel = typeof opt === 'object' ? opt.label : opt;
          return (
            <option key={optValue} value={optValue}>
              {optLabel}
            </option>
          );
        })}
      </select>
    </div>
  );
};

export default SettingsSelect;