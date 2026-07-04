import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { notificationApi } from '../services/notificationApi';

const NotificationContext = createContext(null);

const POLL_INTERVAL = 30000;

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  const fetchNotifications = useCallback(async (params = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await notificationApi.getNotifications({
        limit: 10,
        offset: 0,
        ...params,
      });
      setNotifications(res.data.notifications);
      setTotal(res.data.total);
      setUnreadCount(res.data.unread_count);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationApi.getUnreadCount();
      setUnreadCount(res.data.count);
    } catch {
      // silent — polling should not spam logs
    }
  }, []);

  const markAsRead = useCallback(async (id) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silent — optimistic update handles most cases
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true })),
      );
      setUnreadCount(0);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    pollRef.current = setInterval(() => {
      fetchUnreadCount();
    }, POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchUnreadCount]);

  const value = {
    notifications,
    unreadCount,
    total,
    isLoading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return ctx;
};
