import api from './api';

export const dashboardApi = {
  getSummary: () => api.get('/admin/dashboard'),
  getCharts: (range) => api.get('/admin/dashboard/charts', { params: { range } }),
  getWidgets: () => api.get('/admin/dashboard/widgets'),
};
