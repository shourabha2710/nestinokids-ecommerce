import React from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCheck, ArrowRight } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import NotificationItem from './NotificationItem';
import NotificationSkeleton from './NotificationSkeleton';
import NotificationEmptyState from './NotificationEmptyState';

const NotificationDropdown = ({ isOpen, onClose }) => {
  const {
    notifications,
    isLoading,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-[380px] max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
              {notifications.length > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[360px] overflow-y-auto">
              {isLoading ? (
                <NotificationSkeleton />
              ) : notifications.length === 0 ? (
                <NotificationEmptyState />
              ) : (
                notifications.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onMarkAsRead={markAsRead}
                  />
                ))
              )}
            </div>

            <Link
              to="/notifications"
              onClick={onClose}
              className="flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-t border-gray-100 transition-colors"
            >
              View All Notifications
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationDropdown;
