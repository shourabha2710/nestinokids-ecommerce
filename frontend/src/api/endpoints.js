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
  getCategoryTree: () => api.get('/categories/tree'),
  getCategory: (slug) => api.get(`/categories/${slug}`),
  getProductReviews: (productId, params) => api.get(`/products/${productId}/reviews`, { params }),
  createReview: (productId, data) => api.post(`/products/${productId}/reviews`, data),
  getRelatedProducts: (productId, params) => api.get(`/products/${productId}/related`, { params }),
  search: (params) => api.get('/search', { params }),
  getActiveBanners: () => api.get('/banners'),
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
  updateCartItem: (productId, quantity, variantId = null) => api.put(`/cart/${productId}`, null, { params: { quantity, variant_id: variantId } }),
  removeFromCart: (productId, variantId = null) => api.delete(`/cart/${productId}`, { params: { variant_id: variantId } }),
  
  checkout: (data) => api.post('/checkout', data),
  createOrder: (data) => api.post('/orders', data),
  getOrders: () => api.get('/orders'),
  getOrder: (id) => api.get(`/orders/${id}`),
  
  validateCoupon: (code, params) => api.get(`/coupons/${code}`, { params }),
};

// Instragram APIs
export const instagramAPI = {
  getPosts: () => api.get('/instagram-posts'),
  trackClick: (id) => api.post(`/instagram-posts/${id}/click`),
};

// Settings APIs
export const settingsAPI = {
  getPublic: () => api.get('/settings'),
};

// Customer Reviews APIs
export const customerReviewsAPI = {
  getPublic: () => api.get('/reviews'),
};
// Hero Slides APIs
export const heroAPI = {
  getSlides: () => api.get('/hero-slides'),
  trackView: (id) => api.post(`/hero-slides/${id}/view`),
  trackClick: (id) => api.post(`/hero-slides/${id}/click`),
};
// Recently Viewed APIs
export const recentlyViewedAPI = {
  trackView: (productId) => api.post(`/products/${productId}/view`),
  getRecent: (params) => api.get('/recently-viewed', { params }),
};

// Recommendation APIs
export const recommendationAPI = {
  getRecommendations: (params) => api.get('/recommendations', { params }),
};

// Loyalty APIs
export const loyaltyAPI = {
  getSummary: () => api.get('/loyalty'),
  getHistory: (params) => api.get('/loyalty/history', { params }),
};
// Referral APIs
export const referralAPI = {
  getInfo: () => api.get('/referrals'),
  apply: (data) => api.post('/referrals/apply', data),
};
// ─── Phase 8 APIs ───

// Order Tracking APIs
export const orderTrackingAPI = {
  getTracking: (orderId) => api.get(`/orders/${orderId}/tracking`),
};
// Support Ticket APIs
export const supportTicketAPI = {
  getTickets: () => api.get('/support/tickets'),
  createTicket: (data) => api.post('/support/tickets', data),
  getTicket: (id) => api.get(`/support/tickets/${id}`),
};
// FAQ APIs
export const faqAPI = {
  getFAQs: () => api.get('/faqs'),
};
// Announcement APIs
export const announcementAPI = {
  getAnnouncements: () => api.get('/announcements'),
};
// Notification APIs
export const notificationAPI = {
  getNotifications: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

