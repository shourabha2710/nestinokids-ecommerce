import api from './api';

export const notificationApi = {
  getNotifications: (params) =>
    api.get('/admin/notifications', { params }),

  getUnreadCount: () =>
    api.get('/admin/notifications/unread-count'),

  markAsRead: (id) =>
    api.patch(`/admin/notifications/${id}/read`),

  markAllAsRead: () =>
    api.patch('/admin/notifications/read-all'),
};
