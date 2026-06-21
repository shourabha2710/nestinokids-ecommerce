import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { authAPI } from '../api/endpoints';
import { setCredentials, setError as setAuthError } from '../store/slices/authSlice';

const RegisterPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const refCode = searchParams.get('ref') || '';

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    referral_code: refCode,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    setError('');

    if (!form.first_name || !form.last_name || !form.email || !form.password) {
      setError('Please fill in all required fields');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!/[A-Z]/.test(form.password)) {
      setError('Password must contain at least one uppercase letter');
      return;
    }

    if (!/\d/.test(form.password)) {
      setError('Password must contain at least one digit');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await authAPI.register({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
        referral_code: form.referral_code || undefined,
      });

      const loginRes = await authAPI.login({
        email: form.email,
        password: form.password,
      });

      const { access_token, refresh_token, user } = loginRes.data;

      if (user.role === 'admin') {
        setError('Administrator accounts cannot be created through registration.');
        setLoading(false);
        return;
      }

      dispatch(setCredentials({ user, accessToken: access_token, refreshToken: refresh_token }));
      dispatch(setAuthError(null));
      navigate('/', { replace: true });
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;

      if (status === 400) {
        if (detail?.includes('Email already registered') || detail?.includes('already registered')) {
          setError('An account with this email already exists');
        } else if (Array.isArray(detail)) {
          setError(detail.map((d) => d.msg || d.message).join(', '));
        } else {
          setError(detail || 'Registration failed. Please check your information.');
        }
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
            className="object-contain h-[70px] md:h-[90px] mx-auto mb-4 cursor-pointer"
            onClick={() => navigate('/')}
          />
          <h2 className="text-xl font-bold text-gold">NestinoKids</h2>
          <p className="text-xs text-gray-400 mb-4">Softness You Can Trust</p>
          <h1 className="text-3xl font-bold text-gold mb-2">Create Account</h1>
          <p className="text-gray-500">Join NestinoKids today</p>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-text mb-1">First Name *</label>
              <input
                type="text"
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                placeholder="First name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gold transition"
                autoComplete="given-name"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-1">Last Name *</label>
              <input
                type="text"
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                placeholder="Last name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gold transition"
                autoComplete="family-name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-text mb-1">Email *</label>
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
            <label className="block text-sm font-semibold text-text mb-1">Phone (optional)</label>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="Enter your phone number"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gold transition"
              autoComplete="tel"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-text mb-1">Password *</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Create a password (min 8 chars)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gold transition"
              autoComplete="new-password"
            />
            <p className="text-xs text-gray-400 mt-1">Must contain 1 uppercase letter and 1 digit</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-text mb-1">Confirm Password *</label>
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gold transition"
              autoComplete="new-password"
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full bg-gold text-white py-3 rounded-lg font-bold text-lg hover:bg-opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </motion.button>
        </form>

        <p className="text-center mt-6 text-gray-500 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-gold font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
