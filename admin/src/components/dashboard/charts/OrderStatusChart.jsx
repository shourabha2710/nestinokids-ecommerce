import React, { memo } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { CHART_COLORS } from '../constants/chartColors';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { status, count } = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3">
      <p className="text-sm font-bold text-gray-900 capitalize">{status}</p>
      <p className="text-xs text-gray-500">{count} order{count !== 1 ? 's' : ''}</p>
    </div>
  );
};

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const RAD = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
  const x = cx + radius * Math.cos(-midAngle * RAD);
  const y = cy + radius * Math.sin(-midAngle * RAD);
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" className="text-xs font-medium" fill={CHART_COLORS.labelText}>
      {(percent * 100).toFixed(0)}%
    </text>
  );
};

const OrderStatusChart = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
        <Pie
          data={data}
          dataKey="count"
          nameKey="status"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          label={renderCustomLabel}
        >
          {data.map((entry) => (
            <Cell
              key={entry.status}
              fill={CHART_COLORS[entry.status] || CHART_COLORS.fallback}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => (
            <span className="text-sm text-gray-600 capitalize">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default memo(OrderStatusChart);
