import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import promotionService from '../../services/promotionService';

export const fetchActivePromotions = createAsyncThunk(
  'promotions/fetchActive',
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await promotionService.getActivePromotions(params);
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const promotionsSlice = createSlice({
  name: 'promotions',
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearPromotions(state) {
      state.items = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchActivePromotions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActivePromotions.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchActivePromotions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearPromotions } = promotionsSlice.actions;
export default promotionsSlice.reducer;
