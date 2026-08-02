import api from './api';

const marketplaceService = {
  getListings: (params) => api.get('/admin/marketplace/listings', { params }),
  getListing: (id) => api.get(`/admin/marketplace/listings/${id}`),
  createListing: (data) => api.post('/admin/marketplace/listings', data),
  updateListing: (id, data) => api.put(`/admin/marketplace/listings/${id}`, data),
  deleteListing: (id) => api.delete(`/admin/marketplace/listings/${id}`),
};

export default marketplaceService;
