import api from './api';

export const staffApi = {
  getStaff: () => api.get('/admin/staff'),
  createStaff: (data) => api.post('/admin/staff', data),
  updateStaff: (id, data) => api.put(`/admin/staff/${id}`, data),
  deactivateStaff: (id) => api.patch(`/admin/staff/${id}/deactivate`),
  resetPassword: (id, password) => api.patch(`/admin/staff/${id}/reset-password`, { new_password: password }),
};
