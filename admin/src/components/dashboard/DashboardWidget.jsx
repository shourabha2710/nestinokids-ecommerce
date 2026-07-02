import React from 'react';
import { RefreshCw } from 'lucide-react';
import DashboardChartCard from './DashboardChartCard';

const formatTime = (date) => {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const DashboardWidget = ({
  title,
  icon,
  color,
  description,
  loading,
  error,
  isEmpty,
  emptyMessage,
  onRefresh,
  lastUpdated,
  actions,
  children,
  className,
}) => {
  const headerActions = (
    <div className="flex items-center gap-2">
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      )}
      {actions}
    </div>
  );

  return (
    <DashboardChartCard
      icon={icon}
      title={title}
      color={color}
      subtitle={description}
      loading={loading}
      error={error}
      isEmpty={isEmpty}
      placeholder={emptyMessage}
      action={headerActions}
      className={className}
    >
      {children}
      {lastUpdated && !loading && (
        <div className="flex items-center justify-end mt-3 pt-3 border-t border-gray-50">
          <span className="text-xs text-gray-400">
            Updated {formatTime(lastUpdated)}
          </span>
        </div>
      )}
    </DashboardChartCard>
  );
};

export default DashboardWidget;
