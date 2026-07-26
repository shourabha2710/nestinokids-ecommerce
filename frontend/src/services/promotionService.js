import api from '../api/axios';

const promotionService = {
  getActivePromotions: (params = {}) =>
    api.get('/promotions/active', { params }),

  getPromotionsForProduct: (productId) =>
    api.get('/promotions/active', { params: { product_id: productId } }),

  getPromotionsForCategory: (categoryId) =>
    api.get('/promotions/active', { params: { category_id: categoryId } }),

  evaluateCart: (cartItems, totalAmount) =>
    api.post('/promotions/evaluate', {
      cart_items: cartItems.map((item) => ({
        product_id: item.product_id || item.id,
        category_id: item.category_id ?? null,
        quantity: item.quantity,
        unit_price: item.price,
        line_total: item.total || item.price * item.quantity,
      })),
      total_amount: totalAmount,
    }),
};

export default promotionService;
