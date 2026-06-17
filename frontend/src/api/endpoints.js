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
  getInventory: (params) => api.get('/admin/inventory', { params }),
  getInventoryItem: (productId) => api.get(`/admin/inventory/${productId}`),
  updateInventory: (productId, data) => api.put(`/admin/inventory/${productId}`, data),
  getVariants: (productId) => api.get(`/admin/products/${productId}/variants`),
  createVariant: (productId, data) => api.post(`/admin/products/${productId}/variants`, data),
  updateVariant: (productId, variantId, data) => api.put(`/admin/products/${productId}/variants/${variantId}`, data),
  deleteVariant: (productId, variantId) => api.delete(`/admin/products/${productId}/variants/${variantId}`),
  getBanners: () => api.get('/admin/banners'),
  getBanner: (id) => api.get(`/admin/banners/${id}`),
  createBanner: (data) => api.post('/admin/banners', data),
  updateBanner: (id, data) => api.put(`/admin/banners/${id}`, data),
  deleteBanner: (id) => api.delete(`/admin/banners/${id}`),
  getOrders: (params) => api.get('/admin/orders', { params }),
  getOrder: (id) => api.get(`/admin/orders/${id}`),
  updateOrderStatus: (id, data) => api.put(`/admin/orders/${id}/status`, data),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data) => api.put('/admin/settings', data),
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

export const adminReviewsAPI = {
  getReviews: () => api.get('/admin/reviews'),
  createReview: (formData) => api.post('/admin/reviews', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  updateReview: (id, formData) => api.put(`/admin/reviews/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteReview: (id) => api.delete(`/admin/reviews/${id}`),
};

export const adminInstagramAPI = {
  getPosts: () => api.get('/admin/instagram-posts'),
  getPost: (id) => api.get(`/admin/instagram-posts/${id}`),
  createPost: (formData) => api.post('/admin/instagram-posts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  updatePost: (id, formData) => api.put(`/admin/instagram-posts/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deletePost: (id) => api.delete(`/admin/instagram-posts/${id}`),
  reorder: (data) => api.post('/admin/instagram-posts/reorder', data),
  toggleActive: (id, isActive) => {
    const formData = new FormData();
    formData.append('is_active', String(isActive));
    return api.put(`/admin/instagram-posts/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Hero Slides APIs
export const heroAPI = {
  getSlides: () => api.get('/hero-slides'),
  trackView: (id) => api.post(`/hero-slides/${id}/view`),
  trackClick: (id) => api.post(`/hero-slides/${id}/click`),
};

export const adminHeroAPI = {
  getSlides: () => api.get('/admin/hero-slides'),
  createSlide: (formData) => api.post('/admin/hero-slides', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  updateSlide: (id, formData) => api.put(`/admin/hero-slides/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteSlide: (id) => api.delete(`/admin/hero-slides/${id}`),
  reorder: (data) => api.post('/admin/hero-slides/reorder', data),
};

// Coupon APIs
export const adminCouponAPI = {
  getCoupons: () => api.get('/admin/coupons'),
  getCoupon: (id) => api.get(`/admin/coupons/${id}`),
  createCoupon: (data) => api.post('/admin/coupons', data),
  updateCoupon: (id, data) => api.put(`/admin/coupons/${id}`, data),
  deleteCoupon: (id) => api.delete(`/admin/coupons/${id}`),
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

export const adminLoyaltyAPI = {
  adjustPoints: (data) => api.post('/admin/loyalty/adjust', data),
};

// Referral APIs
export const referralAPI = {
  getInfo: () => api.get('/referrals'),
  apply: (data) => api.post('/referrals/apply', data),
};

export const adminReferralAPI = {
  getAnalytics: () => api.get('/admin/referrals'),
};

// ─── Phase 8 APIs ───

// Order Tracking APIs
export const orderTrackingAPI = {
  getTracking: (orderId) => api.get(`/orders/${orderId}/tracking`),
};

export const adminOrderTrackingAPI = {
  addEvent: (orderId, data) => api.post(`/admin/orders/${orderId}/tracking`, data),
};

// Support Ticket APIs
export const supportTicketAPI = {
  getTickets: () => api.get('/support/tickets'),
  createTicket: (data) => api.post('/support/tickets', data),
  getTicket: (id) => api.get(`/support/tickets/${id}`),
};

export const adminSupportTicketAPI = {
  getTickets: (params) => api.get('/admin/support/tickets', { params }),
  updateTicket: (id, data) => api.put(`/admin/support/tickets/${id}`, data),
  deleteTicket: (id) => api.delete(`/admin/support/tickets/${id}`),
};

// FAQ APIs
export const faqAPI = {
  getFAQs: () => api.get('/faqs'),
};

export const adminFAQAPI = {
  getFAQs: () => api.get('/admin/faqs'),
  createFAQ: (data) => api.post('/admin/faqs', data),
  updateFAQ: (id, data) => api.put(`/admin/faqs/${id}`, data),
  deleteFAQ: (id) => api.delete(`/admin/faqs/${id}`),
};

// Announcement APIs
export const announcementAPI = {
  getAnnouncements: () => api.get('/announcements'),
};

export const adminAnnouncementAPI = {
  getAnnouncements: () => api.get('/admin/announcements'),
  createAnnouncement: (data) => api.post('/admin/announcements', data),
  updateAnnouncement: (id, data) => api.put(`/admin/announcements/${id}`, data),
  deleteAnnouncement: (id) => api.delete(`/admin/announcements/${id}`),
};

// Notification APIs
export const notificationAPI = {
  getNotifications: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

export const adminNotificationAPI = {
  broadcast: (data) => api.post('/admin/notifications', data),
};
