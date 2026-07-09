import React from 'react';

const SettingsSection = ({ title, description, icon: Icon, children }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-start gap-3 mb-5">
        {Icon && (
          <div className="p-2 bg-gold/10 rounded-lg flex-shrink-0">
            <Icon className="w-5 h-5 text-gold" />
          </div>
        )}
        <div>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          {description && (
            <p className="text-sm text-gray-500 mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
};

export default SettingsSection;
