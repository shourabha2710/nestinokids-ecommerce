import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { authAPI } from '../../api/endpoints';
import { setCredentials } from '../../store/slices/authSlice';
import { LogIn, Mail, Lock, Eye, EyeOff } from 'lucide-react';

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="min-h-screen flex">
      {/* Left panel - Brand/Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 w-72 h-72 bg-gold rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-gold/50 rounded-full blur-3xl" />
        </div>
        <div className="relative flex flex-col justify-center px-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <img
              src="/images/logo.png"
              alt="NestinoKids"
              className="h-28 w-auto object-contain mb-6"
            />
            <h1 className="text-4xl font-bold text-white mb-1">NestinoKids</h1>
            <p className="text-sm text-gray-400 tracking-wide mb-6">Softness You Can Trust</p>
            <p className="text-gray-400 text-lg leading-relaxed max-w-md">
              Welcome back, administrator. Manage your store, track orders, and keep your business growing.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-16 space-y-4"
          >
            {[
              { stat: 'Products', desc: 'Manage your product catalog' },
              { stat: 'Orders', desc: 'Track and fulfill customer orders' },
              { stat: 'Analytics', desc: 'Monitor your store performance' },
            ].map((item, i) => (
              <div key={i} className="flex items-center space-x-3 text-gray-400">
                <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                <span className="text-sm">{item.stat}</span>
                <span className="text-gray-600">— {item.desc}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 flex items-center justify-center px-4 lg:px-12 bg-gray-50 lg:bg-white">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md lg:max-w-sm bg-white rounded-2xl shadow-xl lg:shadow-none p-6 md:p-8 lg:p-0"
        >
          <div className="mb-8 md:mb-10 text-center">
            <img
              src="/images/logo.png"
              alt="NestinoKids"
              className="h-[72px] md:h-20 w-auto object-contain mx-auto mb-3"
            />
            <h2 className="text-xl font-bold text-gray-900">NestinoKids</h2>
            <p className="text-xs text-gray-400 mb-5">Softness You Can Trust</p>
            <h2 className="text-3xl lg:text-2xl font-bold text-gray-900 mb-2">Sign In</h2>
            <p className="text-sm text-gray-500">Enter your credentials to access the admin panel</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm flex items-center space-x-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="admin@nestinokids.com"
                  className="w-full pl-10 pr-4 py-3.5 lg:py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-3.5 lg:py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 bg-gray-900 text-white py-3.5 lg:py-2.5 rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all text-sm"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            </motion.button>
          </form>

          <p className="text-center mt-8 text-xs text-gray-400">
            Authorized administrators only &mdash; NestinoKids Admin Panel
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
