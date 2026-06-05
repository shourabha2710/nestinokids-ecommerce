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
      const existingItem = state.items.find(item => item.id === action.payload.id);
      if (existingItem) {
        existingItem.quantity += action.payload.quantity || 1;
      } else {
        state.items.push({ ...action.payload, quantity: action.payload.quantity || 1 });
      }
      state.quantity += action.payload.quantity || 1;
      state.total = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },
    removeFromCart: (state, action) => {
      const index = state.items.findIndex(item => item.id === action.payload);
      if (index !== -1) {
        state.quantity -= state.items[index].quantity;
        state.items.splice(index, 1);
      }
      state.total = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },
    updateQuantity: (state, action) => {
      const item = state.items.find(item => item.id === action.payload.id);
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
