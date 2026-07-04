import React from 'react';
import {
  ShoppingBag,
  AlertTriangle,
  MessageSquare,
  XCircle,
  AlertCircle,
  Bell,
} from 'lucide-react';
import { NOTIFICATION_TYPES } from '../../constants/notificationTypes';

const ICON_MAP = {
  [NOTIFICATION_TYPES.NEW_ORDER]: ShoppingBag,
  [NOTIFICATION_TYPES.LOW_STOCK]: AlertTriangle,
  [NOTIFICATION_TYPES.SUPPORT_TICKET]: MessageSquare,
  [NOTIFICATION_TYPES.ORDER_CANCELLED]: XCircle,
  [NOTIFICATION_TYPES.PAYMENT_FAILED]: AlertCircle,
  [NOTIFICATION_TYPES.SYSTEM]: Bell,
};

const COLOR_MAP = {
  [NOTIFICATION_TYPES.NEW_ORDER]: 'bg-emerald-100 text-emerald-600',
  [NOTIFICATION_TYPES.LOW_STOCK]: 'bg-amber-100 text-amber-600',
  [NOTIFICATION_TYPES.SUPPORT_TICKET]: 'bg-blue-100 text-blue-600',
  [NOTIFICATION_TYPES.ORDER_CANCELLED]: 'bg-red-100 text-red-600',
  [NOTIFICATION_TYPES.PAYMENT_FAILED]: 'bg-rose-100 text-rose-600',
  [NOTIFICATION_TYPES.SYSTEM]: 'bg-gray-100 text-gray-600',
};

const getTimeAgo = (dateStr) => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
};

const NotificationItem = ({ notification, onMarkAsRead }) => {
  const IconComponent = ICON_MAP[notification.type] || Bell;
  const colorClass = COLOR_MAP[notification.type] || 'bg-gray-100 text-gray-600';

  return (
    <button
      onClick={() => {
        if (!notification.is_read && onMarkAsRead) {
          onMarkAsRead(notification.id);
        }
      }}
      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 focus:outline-none focus:bg-gray-50 ${
        !notification.is_read ? 'bg-blue-50/40' : ''
      }`}
    >
      <div className={`w-8 h-8 rounded-full ${colorClass} flex items-center justify-center shrink-0 mt-0.5`}>
        <IconComponent className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm ${!notification.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
            {notification.title}
          </p>
          {!notification.is_read && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
          )}
        </div>
        {notification.message && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.message}</p>
        )}
        <p className="text-[11px] text-gray-400 mt-1">{getTimeAgo(notification.created_at)}</p>
      </div>
    </button>
  );
};

export default NotificationItem;
