import React from 'react';

const shapes = {
  rect: 'rounded-lg',
  circle: 'rounded-full',
  chart: 'rounded-xl',
  table: 'rounded-lg',
};

const DashboardSkeleton = ({ type = 'rect', width, height, className }) => {
  const base = `animate-pulse bg-gray-100 ${shapes[type] || shapes.rect}`;
  return (
    <div
      className={`${base} ${className || ''}`}
      style={{ width: width || '100%', height: height || '1rem' }}
    />
  );
};

const DashboardSkeletonCard = () => (
  <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
    <div className="flex items-start justify-between mb-4">
      <div className="w-10 h-10 rounded-xl bg-gray-100" />
      <div className="w-16 h-4 bg-gray-100 rounded" />
    </div>
    <div className="h-8 w-24 bg-gray-100 rounded mb-2" />
    <div className="h-4 w-20 bg-gray-50 rounded" />
  </div>
);

const DashboardSkeletonChart = ({ height = 48 }) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl bg-gray-100" />
      <div>
        <div className="h-4 w-32 bg-gray-100 rounded mb-1" />
        <div className="h-3 w-20 bg-gray-50 rounded" />
      </div>
    </div>
    <div className={`h-${height} bg-gray-50 rounded-xl border border-dashed border-gray-200 flex items-center justify-center`}>
      <div className="w-full px-8 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-end gap-2" style={{ height: `${16 + i * 8}px` }}>
            <div className="flex-1 bg-gray-100 rounded-t" style={{ height: `${40 + i * 12}%` }} />
            <div className="flex-1 bg-gray-100 rounded-t" style={{ height: `${30 + i * 10}%` }} />
            <div className="flex-1 bg-gray-100 rounded-t" style={{ height: `${50 + i * 8}%` }} />
            <div className="flex-1 bg-gray-100 rounded-t" style={{ height: `${20 + i * 14}%` }} />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export { DashboardSkeleton, DashboardSkeletonCard, DashboardSkeletonChart };
export default DashboardSkeleton;
