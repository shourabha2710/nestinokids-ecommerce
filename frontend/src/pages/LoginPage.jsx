import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { authAPI } from '../api/endpoints';
import { setCredentials, setError as setAuthError } from '../store/slices/authSlice';

const LoginPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useSelector((state) => state.auth);

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirect = searchParams.get('redirect') || '/';

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await authAPI.login({
        email: form.email,
        password: form.password,
      });

      const { access_token, refresh_token, user } = res.data;

      if (user.role === 'admin') {
        setError('This login is for customer accounts only. Administrators should use the Admin Panel.');
        setLoading(false);
        return;
      }

      dispatch(setCredentials({ user, accessToken: access_token, refreshToken: refresh_token }));
      dispatch(setAuthError(null));
      navigate(redirect, { replace: true });
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
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-md p-8 w-full max-w-md"
      >
        <div className="text-center mb-6">
          <img
            src="/images/logo.png"
            alt="NestinoKids"
            className="object-contain h-[70px] md:h-[90px] mx-auto mb-3 cursor-pointer"
            onClick={() => navigate('/')}
          />
          <h2 className="text-xl font-bold text-gold">NestinoKids</h2>
          <p className="text-xs text-gray-400 mb-4">Softness You Can Trust</p>
          <h1 className="text-3xl font-bold text-gold mb-2">Welcome Back</h1>
          <p className="text-gray-500">Sign in to your NestinoKids account</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-text mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter your email"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gold transition"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-text mb-1">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter your password"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gold transition"
              autoComplete="current-password"
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full bg-gold text-white py-3 rounded-lg font-bold text-lg hover:bg-opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </motion.button>
        </form>

        <p className="text-center mt-6 text-gray-500 text-sm">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-gold font-semibold hover:underline">
            Register here
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
