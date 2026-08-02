import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const PALETTE = ['#D4AF37', '#3B82F6', '#EC4899', '#F43F5E', '#8B5CF6', '#10B981', '#F97316', '#06B6D4', '#9CA3AF'];

const formatCount = (v) => Intl.NumberFormat('en-IN').format(v ?? 0);

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3">
      <p className="text-sm font-semibold text-gray-900">{item.name}</p>
      <p className="text-xs text-gray-500">{formatCount(item.value)} clicks</p>
    </div>
  );
};

const MarketplaceBreakdownChart = ({ title, data, emptyText = 'No click data for the selected period' }) => {
  const chartData = (data || []).map((item, idx) => ({
    name: item.name,
    value: item.value,
    share: item.share,
    color: item.color || PALETTE[idx % PALETTE.length],
  }));
  const isEmpty = chartData.length === 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-4">{title}</h3>
      {isEmpty ? (
        <div className="flex items-center justify-center h-56 text-gray-400 text-sm">{emptyText}</div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="h-56 w-full sm:w-1/2 min-w-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full sm:w-1/2 space-y-2">
            {chartData.map((entry, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                  <span className="text-sm text-gray-700 truncate capitalize">{entry.name}</span>
                </div>
                <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
                  {formatCount(entry.value)} ({entry.share != null ? `${entry.share}%` : '—'})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketplaceBreakdownChart;
