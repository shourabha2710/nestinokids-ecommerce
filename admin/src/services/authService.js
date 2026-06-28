import axios from 'axios';
import api from './api';

const API_URL = import.meta.env.VITE_API_URL;

export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),

  getCurrentUser: () => api.get('/auth/me'),

  async refreshToken() {
    const token = localStorage.getItem('adminRefreshToken');
    if (!token) {
      return null;
    }
    try {
      const response = await axios.post(`${API_URL}/auth/refresh`, {
        refresh_token: token,
      });
      return response.data;
    } catch {
      return null;
    }
  },

  restoreSession() {
    const token = localStorage.getItem('adminAccessToken');
    const user = localStorage.getItem('adminUser');
    if (token && user) {
      try {
        return {
          token,
          user: JSON.parse(user),
        };
      } catch {
        return null;
      }
    }
    return null;
  },
};
