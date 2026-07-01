import React from 'react';

const DashboardCardHeader = ({ icon: Icon, title, subtitle, action, color }) => {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={`w-10 h-10 rounded-xl ${color || 'bg-gray-500'} bg-opacity-10 flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${color ? color.replace('bg-', 'text-') : 'text-gray-500'}`} />
          </div>
        )}
        <div>
          <p className="text-sm font-bold text-gray-900">{title}</p>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

export default DashboardCardHeader;
