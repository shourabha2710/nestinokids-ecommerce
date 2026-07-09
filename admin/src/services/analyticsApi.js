import api from './api';

export const analyticsApi = {
  getSummary: (days) => api.get('/admin/analytics/summary', { params: { days } }),
  getSalesTrend: (days) => api.get('/admin/analytics/sales-trend', { params: { days } }),
  getTopProducts: (limit) => api.get('/admin/analytics/top-products', { params: { limit } }),
  getOrderStatus: () => api.get('/admin/analytics/order-status'),
  getLowStock: () => api.get('/admin/analytics/low-stock'),

  exportSales: (params) => api.get('/admin/analytics/export/sales', { params, responseType: 'blob' }),
  exportProducts: () => api.get('/admin/analytics/export/products', { responseType: 'blob' }),
  exportInventory: () => api.get('/admin/analytics/export/inventory', { responseType: 'blob' }),
};
