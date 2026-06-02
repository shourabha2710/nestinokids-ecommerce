import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  products: [],
  categories: [],
  loading: false,
  error: null,
  selectedProduct: null,
  wishlist: [],
};

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setProducts: (state, action) => {
      state.products = action.payload;
    },
    setCategories: (state, action) => {
      state.categories = action.payload;
    },
    setSelectedProduct: (state, action) => {
      state.selectedProduct = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    addToWishlist: (state, action) => {
      if (!state.wishlist.find(item => item.id === action.payload.id)) {
        state.wishlist.push(action.payload);
      }
    },
    removeFromWishlist: (state, action) => {
      state.wishlist = state.wishlist.filter(item => item.id !== action.payload);
    },
  },
});

export const {
  setProducts,
  setCategories,
  setSelectedProduct,
  setLoading,
  setError,
  addToWishlist,
  removeFromWishlist,
} = productsSlice.actions;

export default productsSlice.reducer;
