import api from '../api/axios';

const promotionService = {
  getActivePromotions: (params = {}) =>
    api.get('/promotions/active', { params }),

  getPromotionsForProduct: (productId) =>
    api.get('/promotions/active', { params: { product_id: productId } }),

  getPromotionsForCategory: (categoryId) =>
    api.get('/promotions/active', { params: { category_id: categoryId } }),
};

export default promotionService;
