import api from './api';

export const searchApi = {
  globalSearch: (query, limit = 5) =>
    api.get('/admin/search', { params: { q: query, limit } }),

  // TODO: Send search analytics to backend
  trackSearch: (query, resultCount) => {},
};
