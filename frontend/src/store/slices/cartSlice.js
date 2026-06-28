const getItemKey = (item) => `${item.product_id || item.id}_${item.variant_id ?? 'null'}`;

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [],
  total: 0,
  quantity: 0,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const key = getItemKey(action.payload);
      const existingItem = state.items.find(item => getItemKey(item) === key);
      if (existingItem) {
        existingItem.quantity += action.payload.quantity || 1;
      } else {
        state.items.push({
          ...action.payload,
          id: action.payload.product_id || action.payload.id,
          product_id: action.payload.product_id || action.payload.id,
          quantity: action.payload.quantity || 1,
        });
      }
      state.quantity += action.payload.quantity || 1;
      state.total = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },
    removeFromCart: (state, action) => {
      const key = typeof action.payload === 'object'
        ? getItemKey(action.payload)
        : `${action.payload ?? ''}_null`;
      const index = state.items.findIndex(item => getItemKey(item) === key);
      if (index !== -1) {
        state.quantity -= state.items[index].quantity;
        state.items.splice(index, 1);
      }
      state.total = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },
    updateQuantity: (state, action) => {
      const key = getItemKey(action.payload);
      const item = state.items.find(item => getItemKey(item) === key);
      if (item) {
        const oldQuantity = item.quantity;
        item.quantity = action.payload.quantity;
        state.quantity += (action.payload.quantity - oldQuantity);
      }
      state.total = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },
    clearCart: (state) => {
      state.items = [];
      state.quantity = 0;
      state.total = 0;
    },
    setCartItems: (state, action) => {
      state.items = action.payload;
      state.quantity = action.payload.reduce((sum, item) => sum + item.quantity, 0);
      state.total = action.payload.reduce((sum, item) => sum + item.total, 0);
    },
  },
});

export const { addToCart, removeFromCart, updateQuantity, clearCart, setCartItems } = cartSlice.actions;
export default cartSlice.reducer;
