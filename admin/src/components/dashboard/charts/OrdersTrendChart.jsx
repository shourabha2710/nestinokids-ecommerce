import React, { memo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { CHART_COLORS } from '../constants/chartColors';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-bold" style={{ color: CHART_COLORS.info }}>
        {payload[0].value} order{payload[0].value !== 1 ? 's' : ''}
      </p>
    </div>
  );
};

const OrdersTrendChart = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
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
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="orders"
          fill={CHART_COLORS.info}
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default memo(OrdersTrendChart);
