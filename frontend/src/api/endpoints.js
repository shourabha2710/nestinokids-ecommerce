import api from './axios';

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (credentials) => api.post('/auth/login', credentials),
  getCurrentUser: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/me', data),
};

// Products APIs
export const productsAPI = {
  getProducts: (params) => api.get('/products', { params }),
  getProduct: (slug) => api.get(`/products/${slug}`),
  getCategories: (params) => api.get('/categories', { params }),
  getCategory: (slug) => api.get(`/categories/${slug}`),
  getProductReviews: (productId, params) => api.get(`/products/${productId}/reviews`, { params }),
  createReview: (productId, data) => api.post(`/products/${productId}/reviews`, data),
  getRelatedProducts: (productId, params) => api.get(`/products/${productId}/related`, { params }),
  search: (params) => api.get('/search', { params }),
};

// Admin APIs
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getProducts: (params) => api.get('/admin/products', { params }),
  getProduct: (id) => api.get(`/admin/products/${id}`),
  createProduct: (data) => api.post('/admin/products', data),
  updateProduct: (id, data) => api.put(`/admin/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/admin/products/${id}`),
  uploadProductImage: (productId, formData) => api.post(`/admin/products/${productId}/images`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteProductImage: (productId, imageId) => api.delete(`/admin/products/${productId}/images/${imageId}`),
  setProductImagePrimary: (productId, imageId) => api.put(`/admin/products/${productId}/images/${imageId}/primary`),
  getCategories: (params) => api.get('/admin/categories', { params }),
  createCategory: (data) => api.post('/admin/categories', data),
  updateCategory: (id, data) => api.put(`/admin/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}`),
};

// Shopping APIs
export const shoppingAPI = {
  getAddresses: () => api.get('/addresses'),
  createAddress: (data) => api.post('/addresses', data),
  updateAddress: (id, data) => api.put(`/addresses/${id}`, data),
  deleteAddress: (id) => api.delete(`/addresses/${id}`),
  
  getWishlist: () => api.get('/wishlist'),
  addToWishlist: (productId) => api.post(`/wishlist/${productId}`),
  removeFromWishlist: (productId) => api.delete(`/wishlist/${productId}`),
  
  getCart: () => api.get('/cart'),
  addToCart: (productId, params) => api.post(`/cart/${productId}`, null, { params }),
  removeFromCart: (productId) => api.delete(`/cart/${productId}`),
  
  createOrder: (data) => api.post('/orders', data),
  getOrders: () => api.get('/orders'),
  getOrder: (id) => api.get(`/orders/${id}`),
  
  validateCoupon: (code, params) => api.get(`/coupons/${code}`, { params }),
};
