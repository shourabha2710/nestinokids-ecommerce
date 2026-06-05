import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toggleSidebar, toggleSearch } from '../store/slices/uiSlice';
import { logout } from '../store/slices/authSlice';
import { motion } from 'framer-motion';

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector(state => state.auth);
  const { quantity } = useSelector(state => state.cart);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Bar */}
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center cursor-pointer"
            onClick={() => navigate('/')}
          >
            <h1 className="text-2xl font-bold text-gold">NestinoKids</h1>
            <p className="text-xs text-blush ml-2">Softness You Can Trust</p>
          </motion.div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-lg mx-8">
            <input
              type="text"
              placeholder="Search products..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gold"
              onFocus={() => navigate('/search')}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            {/* Search Icon Mobile */}
            <button
              className="md:hidden"
              onClick={() => dispatch(toggleSearch())}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* Wishlist */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              onClick={() => navigate('/wishlist')}
              className="relative"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </motion.button>

            {/* Cart */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              onClick={() => navigate('/cart')}
              className="relative"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {quantity > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {quantity}
                </span>
              )}
            </motion.button>

            {/* User Menu */}
            <div className="relative" ref={dropdownRef}>
              <motion.button
                whileHover={{ scale: 1.1 }}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </motion.button>

              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl"
                >
                  {isAuthenticated ? (
                    <>
                      <div className="px-4 py-2 border-b">
                        <p className="text-sm font-semibold">{user?.first_name}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                      </div>
                      <button
                        onClick={() => navigate('/profile')}
                        className="block w-full text-left px-4 py-2 hover:bg-ivory"
                      >
                        My Profile
                      </button>
                      <button
                        onClick={() => navigate('/orders')}
                        className="block w-full text-left px-4 py-2 hover:bg-ivory"
                      >
                        My Orders
                      </button>
                      <button
                        onClick={() => navigate('/addresses')}
                        className="block w-full text-left px-4 py-2 hover:bg-ivory"
                      >
                        Addresses
                      </button>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 hover:bg-ivory border-t text-red-600"
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => navigate('/login')}
                        className="block w-full text-left px-4 py-2 hover:bg-ivory"
                      >
                        Login
                      </button>
                      <button
                        onClick={() => navigate('/register')}
                        className="block w-full text-left px-4 py-2 hover:bg-ivory"
                      >
                        Register
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex border-t items-center justify-between">
          <div className="flex">
            <button
              className="px-4 py-3 hover:bg-ivory text-sm font-medium text-gold"
              onClick={() => navigate('/categories')}
            >
              Categories
            </button>
            <button
              className="px-4 py-3 hover:bg-ivory text-sm font-medium"
              onClick={() => navigate('/products')}
            >
              All Products
            </button>
            <button
              className="px-4 py-3 hover:bg-ivory text-sm font-medium"
              onClick={() => navigate('/bestsellers')}
            >
              Best Sellers
            </button>
            <button
              className="px-4 py-3 hover:bg-ivory text-sm font-medium"
              onClick={() => navigate('/new-arrivals')}
            >
              New Arrivals
            </button>
          </div>

          <div className="flex items-center space-x-1">
            {isAuthenticated ? (
              <>
                <span className="px-3 py-3 text-sm font-medium text-gray-600">
                  Hi, {user?.first_name || 'User'}
                </span>
                <button
                  className="px-3 py-3 hover:bg-ivory text-sm font-medium"
                  onClick={() => navigate('/profile')}
                >
                  Profile
                </button>
                <button
                  className="px-3 py-3 hover:bg-ivory text-sm font-medium text-red-600"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  className="px-3 py-3 hover:bg-ivory text-sm font-medium"
                  onClick={() => navigate('/login')}
                >
                  Login
                </button>
                <button
                  className="px-3 py-3 hover:bg-ivory text-sm font-medium text-gold"
                  onClick={() => navigate('/register')}
                >
                  Register
                </button>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
