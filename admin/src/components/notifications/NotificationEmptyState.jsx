import React from 'react';
import { Bell } from 'lucide-react';

const NotificationEmptyState = () => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
      <Bell className="w-6 h-6 text-gray-400" />
    </div>
    <p className="text-sm font-medium text-gray-900">No notifications yet</p>
    <p className="text-xs text-gray-500 mt-1 max-w-[200px]">
      We'll let you know when something needs your attention
    </p>
  </div>
);

export default NotificationEmptyState;
