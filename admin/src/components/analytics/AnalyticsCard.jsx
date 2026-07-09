import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const AnalyticsCard = ({ title, value, icon: Icon, trend, subtitle }) => {
  const formatINR = (val) => {
    if (val === undefined || val === null) return '0';
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return new Intl.NumberFormat('en-IN').format(num);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex-1 min-w-[200px]">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2.5 bg-gold/10 rounded-xl">
          {Icon && <Icon size={20} className="text-gold" />}
        </div>
        {trend !== undefined && trend !== null && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-0.5">{formatINR(value)}</p>
      <p className="text-sm text-gray-500">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
};

export default AnalyticsCard;
