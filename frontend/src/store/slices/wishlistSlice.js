import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [],
  ids: [],
  count: 0,
};

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    setWishlist: (state, action) => {
      state.items = action.payload;
      state.ids = action.payload.map((item) => item.id);
      state.count = action.payload.length;
    },
    addWishlistItem: (state, action) => {
      const product = action.payload;
      if (!state.ids.includes(product.id)) {
        state.items.push(product);
        state.ids.push(product.id);
        state.count += 1;
      }
    },
    removeWishlistItem: (state, action) => {
      const id = action.payload;
      state.items = state.items.filter((item) => item.id !== id);
      state.ids = state.ids.filter((i) => i !== id);
      state.count = Math.max(0, state.count - 1);
    },
    clearWishlist: (state) => {
      state.items = [];
      state.ids = [];
      state.count = 0;
    },
  },
});

export const { setWishlist, addWishlistItem, removeWishlistItem, clearWishlist } = wishlistSlice.actions;
export default wishlistSlice.reducer;
