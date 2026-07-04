import React, { useState, useCallback, useEffect } from 'react';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { notificationApi } from '../../services/notificationApi';
import { CATEGORY_FILTERS } from '../../constants/notificationTypes';
import NotificationItem from '../../components/notifications/NotificationItem';
import NotificationSkeleton from '../../components/notifications/NotificationSkeleton';
import NotificationEmptyState from '../../components/notifications/NotificationEmptyState';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'orders', label: 'Orders' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'support', label: 'Support' },
  { key: 'system', label: 'System' },
];

const FILTER_TO_PARAMS = {
  all: {},
  unread: { unread_only: true },
  orders: { type: CATEGORY_FILTERS.orders },
  inventory: { type: CATEGORY_FILTERS.inventory },
  support: { type: CATEGORY_FILTERS.support },
  system: { type: CATEGORY_FILTERS.system },
};

const PAGE_LIMIT = 20;

const AdminNotifications = () => {
  const { markAsRead, markAllAsRead, fetchUnreadCount } = useNotifications();

  const [notifications, setNotifications] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');

  const hasMore = offset + PAGE_LIMIT < total;

  const loadNotifications = useCallback(async (reset) => {
    const params = {
      limit: PAGE_LIMIT,
      offset: reset ? 0 : offset,
      ...FILTER_TO_PARAMS[activeFilter],
    };

    if (reset) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setError(null);

    try {
      const res = await notificationApi.getNotifications(params);
      if (reset) {
        setNotifications(res.data.notifications);
        setOffset(0);
      } else {
        setNotifications((prev) => [...prev, ...res.data.notifications]);
      }
      setTotal(res.data.total);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load notifications');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [activeFilter, offset]);

  useEffect(() => {
    loadNotifications(true);
  }, [activeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = (key) => {
    if (key === activeFilter) return;
    setActiveFilter(key);
    setOffset(0);
    setNotifications([]);
  };

  const handleLoadMore = () => {
    setOffset((prev) => prev + PAGE_LIMIT);
  };

  useEffect(() => {
    if (offset > 0) {
      loadNotifications(false);
    }
  }, [offset]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMarkAsRead = async (id) => {
    await markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true })),
    );
    await fetchUnreadCount();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">Manage system alerts and activity</p>
        </div>
        {notifications.length > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Mark All As Read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => handleFilterChange(f.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeFilter === f.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          <NotificationSkeleton />
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
            <Bell className="w-6 h-6 text-red-500" />
          </div>
          <p className="text-sm font-medium text-gray-900">Failed to load notifications</p>
          <p className="text-xs text-gray-500 mt-1">{error}</p>
          <button
            onClick={() => loadNotifications(true)}
            className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200">
          <NotificationEmptyState />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            {notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onMarkAsRead={handleMarkAsRead}
              />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-2 pb-6">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  `Load More (${notifications.length} of ${total})`
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminNotifications;
