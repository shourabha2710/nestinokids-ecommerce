import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, CheckCheck, ShoppingBag, Gift, Award, Megaphone } from 'lucide-react';
import { notificationAPI } from '../api/endpoints';

const TYPE_ICONS = {
  Order: ShoppingBag,
  Promotion: Megaphone,
  Loyalty: Award,
  Referral: Gift,
};

const TYPE_COLORS = {
  Order: 'text-blue-500 bg-blue-50',
  Promotion: 'text-purple-500 bg-purple-50',
  Loyalty: 'text-gold bg-amber-50',
  Referral: 'text-green-500 bg-green-50',
};

const NotificationCenter = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const res = await notificationAPI.getNotifications({ limit: 50 });
      setNotifications(res.data || []);
    } catch {} finally {
      setLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkRead = async (id) => {
    try {
      await notificationAPI.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {}
  };

  const getTimeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-xl z-50 flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-gold" />
                <h2 className="font-display font-bold text-text text-lg">Notifications</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {notifications.some((n) => !n.is_read) && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-gold hover:bg-amber-50 transition-colors border-b border-gray-50"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all as read
              </button>
            )}

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Bell className="w-10 h-10 mb-3" />
                  <p className="text-sm font-medium">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {notifications.map((notification) => {
                    const Icon = TYPE_ICONS[notification.type] || Bell;
                    const colorClass = TYPE_COLORS[notification.type] || 'text-gray-500 bg-gray-50';
                    return (
                      <div
                        key={notification.id}
                        className={`px-5 py-3.5 transition-colors ${notification.is_read ? 'bg-white' : 'bg-amber-50/40'}`}
                      >
                        <div className="flex gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium text-text">{notification.title}</p>
                              {!notification.is_read && (
                                <button
                                  onClick={() => handleMarkRead(notification.id)}
                                  className="flex-shrink-0 p-0.5 hover:bg-gray-100 rounded"
                                  title="Mark as read"
                                >
                                  <CheckCheck className="w-3.5 h-3.5 text-gray-400" />
                                </button>
                              )}
                            </div>
                            {notification.message && (
                              <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{notification.message}</p>
                            )}
                            <p className="text-[10px] text-gray-400 mt-1">{getTimeAgo(notification.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationCenter;
