import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3">
      <p className="text-xs font-medium text-gray-500 mb-2">{label}</p>
      {payload.map((entry, idx) => (
        <p key={idx} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {entry.name === 'Revenue' ? '₹' : ''}{Intl.NumberFormat('en-IN').format(entry.value)}
        </p>
      ))}
    </div>
  );
};

const SalesTrendChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Sales Trend</h3>
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
          No sales data for the selected period
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-4">Sales Trend</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="revenue" stroke="#D4AF37" strokeWidth={2} name="Revenue" dot={false} />
          <Line type="monotone" dataKey="orders" stroke="#3B82F6" strokeWidth={2} name="Orders" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SalesTrendChart;
