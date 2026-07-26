import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import cartReducer from './slices/cartSlice';
import productsReducer from './slices/productsSlice';
import uiReducer from './slices/uiSlice';
import wishlistReducer from './slices/wishlistSlice';
import promotionsReducer from './slices/promotionsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    products: productsReducer,
    ui: uiReducer,
    wishlist: wishlistReducer,
    promotions: promotionsReducer,
  },
});

export default store;
