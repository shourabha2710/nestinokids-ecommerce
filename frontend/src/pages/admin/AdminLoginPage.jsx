import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { authAPI } from '../../api/endpoints';
import { setCredentials } from '../../store/slices/authSlice';

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please enter email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await authAPI.login({
        email: form.email,
        password: form.password,
      });

      const { access_token, refresh_token, user: userData } = res.data;

      if (userData.role !== 'admin') {
        setError('Administrator access required');
        setLoading(false);
        return;
      }

      dispatch(setCredentials({ user: userData, accessToken: access_token, refreshToken: refresh_token }));
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;

      if (status === 401) {
        setError('Invalid email or password');
      } else if (detail) {
        setError(detail);
      } else if (err.message === 'Network Error') {
        setError('Unable to connect to server. Please try again.');
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gold">NestinoKids</h1>
          <p className="text-gray-400 text-sm mt-1">Admin Panel</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-900 bg-opacity-50 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-6 text-sm"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="admin@nestinokids.com"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gold transition"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter your password"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gold transition"
              autoComplete="current-password"
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full bg-gold text-gray-900 py-3 rounded-lg font-bold hover:bg-opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </motion.button>
        </form>

        <p className="text-center mt-6 text-gray-500 text-xs">
          Authorized administrators only
        </p>
      </motion.div>
    </div>
  );
};

export default AdminLoginPage;
