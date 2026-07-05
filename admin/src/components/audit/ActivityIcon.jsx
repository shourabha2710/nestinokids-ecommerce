import React from 'react';
import { Plus, Pencil, Trash2, LogIn, RefreshCw } from 'lucide-react';

const iconMap = {
  CREATE: { icon: Plus, bg: 'bg-green-100', color: 'text-green-600' },
  UPDATE: { icon: Pencil, bg: 'bg-blue-100', color: 'text-blue-600' },
  DELETE: { icon: Trash2, bg: 'bg-red-100', color: 'text-red-600' },
  LOGIN: { icon: LogIn, bg: 'bg-purple-100', color: 'text-purple-600' },
  STATUS_CHANGE: { icon: RefreshCw, bg: 'bg-amber-100', color: 'text-amber-600' },
};

const ActivityIcon = ({ action }) => {
  const config = iconMap[action] || { icon: Plus, bg: 'bg-gray-100', color: 'text-gray-500' };
  const Icon = config.icon;
  return (
    <div className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center shrink-0`}>
      <Icon className={`w-5 h-5 ${config.color}`} />
    </div>
  );
};

export default ActivityIcon;
