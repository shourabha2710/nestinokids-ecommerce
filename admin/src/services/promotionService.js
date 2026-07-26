import api from './api';

const promotionService = {
  getPromotions: (params) => api.get('/admin/promotions', { params }),
  getPromotion: (id) => api.get(`/admin/promotions/${id}`),
  createPromotion: (data) => api.post('/admin/promotions', data),
  updatePromotion: (id, data) => api.put(`/admin/promotions/${id}`, data),
  deletePromotion: (id) => api.delete(`/admin/promotions/${id}`),
  getCategories: (params) => api.get('/admin/categories', { params }),
  getProducts: (params) => api.get('/admin/products', { params }),
};

export default promotionService;
