import React from 'react';
import { BarChart3 } from 'lucide-react';
import DashboardCardHeader from './DashboardCardHeader';
import { DashboardSkeletonChart } from './DashboardSkeleton';

const EmptyState = ({ icon: Icon, message, submessage }) => (
  <div className="flex items-center justify-center h-48 bg-gray-50 rounded-xl border border-dashed border-gray-200">
    <div className="text-center">
      {Icon && <Icon className="w-8 h-8 text-gray-300 mx-auto mb-2" />}
      <p className="text-sm font-medium text-gray-400">{message || 'No data available'}</p>
      {submessage && <p className="text-xs text-gray-300 mt-1">{submessage}</p>}
    </div>
  </div>
);

const DashboardChartCard = ({ icon, title, subtitle, action, color, children, placeholder, loading, error, isEmpty, className }) => {
  const showPlaceholder = !children && placeholder;

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:border-gray-200 transition-all duration-200 ${className || ''}`}>
      {(title || icon) && (
        <DashboardCardHeader
          icon={icon}
          title={title}
          subtitle={subtitle}
          action={action}
          color={color}
        />
      )}
      {loading ? (
        <DashboardSkeletonChart />
      ) : error ? (
        <EmptyState message={error} submessage="Try refreshing the page" />
      ) : isEmpty ? (
        <EmptyState icon={BarChart3} message="No data available" submessage="Data will appear once orders are placed" />
      ) : showPlaceholder ? (
        <EmptyState icon={BarChart3} message={placeholder} submessage="Coming in a future phase" />
      ) : (
        children
      )}
    </div>
  );
};

export default DashboardChartCard;
