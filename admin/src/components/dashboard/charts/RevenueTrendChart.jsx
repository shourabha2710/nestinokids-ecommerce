import React, { memo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { CHART_COLORS } from '../constants/chartColors';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-bold" style={{ color: CHART_COLORS.success }}>
        ₹{Number(payload[0].value).toLocaleString()}
      </p>
    </div>
  );
};

const RevenueTrendChart = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: CHART_COLORS.axisText }}
          tickLine={false}
          axisLine={{ stroke: CHART_COLORS.axisLine }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: CHART_COLORS.axisText }}
          tickLine={false}
          axisLine={{ stroke: CHART_COLORS.axisLine }}
          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke={CHART_COLORS.success}
          strokeWidth={2}
          dot={{ r: 3, fill: CHART_COLORS.success, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: CHART_COLORS.success, stroke: '#fff', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default memo(RevenueTrendChart);
