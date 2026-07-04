import React from 'react';

const NotificationSkeleton = () => (
  <div className="space-y-1 p-2">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="flex items-start gap-3 p-3 animate-pulse">
        <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-3 bg-gray-200 rounded w-3/4" />
          <div className="h-2.5 bg-gray-100 rounded w-full" />
          <div className="h-2 bg-gray-100 rounded w-1/4" />
        </div>
      </div>
    ))}
  </div>
);

export default NotificationSkeleton;
