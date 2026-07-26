import api from './api';

const couponService = {
  getCoupons: (params) => api.get('/admin/coupons', { params }),
  getCoupon: (id) => api.get(`/admin/coupons/${id}`),
  createCoupon: (data) => api.post('/admin/coupons', data),
  updateCoupon: (id, data) => api.put(`/admin/coupons/${id}`, data),
  deleteCoupon: (id) => api.delete(`/admin/coupons/${id}`),
  toggleStatus: (id) => api.patch(`/admin/coupons/${id}/status`),
};

export default couponService;
