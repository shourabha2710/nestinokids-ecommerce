import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toggleSidebar, openCartDrawer } from '../store/slices/uiSlice';
import { logout } from '../store/slices/authSlice';
import { motion } from 'framer-motion';
import { Menu, Search, X, Loader2, Bell, ChevronDown } from 'lucide-react';
import { productsAPI, notificationAPI } from '../api/endpoints';
import MobileDrawer from './MobileDrawer';
import NotificationCenter from './NotificationCenter';

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useSelector(state => state.auth);
  const { quantity } = useSelector(state => state.cart);
  const wishlistCount = useSelector(state => state.wishlist.count);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [activeParentCat, setActiveParentCat] = useState(null);
  const [categoryTree, setCategoryTree] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  const catDropdownRef = useRef(null);

  // Close mobile drawer when viewport reaches desktop breakpoint
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && drawerOpen) {
        setDrawerOpen(false);
        document.body.style.overflow = '';
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawerOpen]);

  useEffect(() => {
    productsAPI.getCategoryTree().then((res) => {
      if (Array.isArray(res.data)) setCategoryTree(res.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
      if (catDropdownRef.current && !catDropdownRef.current.contains(e.target)) {
        setCatDropdownOpen(false);
        setActiveParentCat(null);
      }
    };
    if (isDropdownOpen || catDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen, catDropdownOpen]);

  useEffect(() => {
    setDrawerOpen(false);
    setShowSuggestions(false);
    setSearchQuery('');
  }, [location.pathname]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await productsAPI.getProducts({ search: searchQuery, limit: 5 });
        const data = Array.isArray(res.data) ? res.data : [];
        setSuggestions(data);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Poll unread notification count
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchCount = () => {
      notificationAPI.getUnreadCount().then((res) => {
        setUnreadCount(res.data?.count || 0);
      }).catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        navigate(`/products/${suggestions[selectedIndex].slug}`);
      } else {
        navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      }
      setShowSuggestions(false);
      setSearchQuery('');
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (product) => {
    navigate(`/products/${product.slug}`);
    setShowSuggestions(false);
    setSearchQuery('');
  };

  const IMG_PLACEHOLDER = '/images/placeholder-product.svg';

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  return (
    <>
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <header className="sticky top-0 z-50 glass shadow-sm">
        <NotificationCenter isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Bar */}
        <div className="flex items-center justify-between py-4">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="md:hidden p-1.5 -ml-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6 text-text" />
          </button>

          {/* Logo + Brand — hidden on mobile (shown in MobileDrawer) */}
          <motion.div
            whileHover={{ opacity: 0.9 }}
            className="hidden md:flex items-center cursor-pointer md:flex-none justify-start gap-3"
            onClick={() => navigate('/')}
          >
            <img
              src="/images/logo.png"
              alt="NestinoKids"
              className="object-contain h-12"
            />
            <div className="leading-tight">
              <h1 className="text-2xl font-bold text-gold">NestinoKids</h1>
              <p className="text-xs tracking-wide text-gray-500">Softness You Can Trust</p>
            </div>
          </motion.div>

          {/* Live Search — desktop only */}
          <div className="hidden md:flex flex-1 max-w-lg mx-8 relative" ref={searchRef}>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSelectedIndex(-1); }}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gold text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setSuggestions([]); setShowSuggestions(false); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {showSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
                {searchLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : suggestions.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-gray-400">
                    No products found for &ldquo;{searchQuery}&rdquo;
                  </div>
                ) : (
                  suggestions.map((product, index) => {
                    const imgUrl = product.images?.find((i) => i.is_primary)?.image_url || product.images?.[0]?.image_url || IMG_PLACEHOLDER;
                    return (
                      <button
                        key={product.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSuggestionClick(product)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${index === selectedIndex ? 'bg-gray-50' : ''}`}
                      >
                        <img src={imgUrl} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-100 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                          <p className="text-xs text-gray-500">₹{product.discount_price || product.price}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Search Icon Mobile */}
            <button
              className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => navigate('/search')}
              aria-label="Search"
            >
              <Search className="w-6 h-6 text-text" />
            </button>

            {/* Notification Bell */}
            {isAuthenticated && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                onClick={() => setNotifOpen(true)}
                className="relative p-1.5"
                aria-label="Notifications"
              >
                <Bell className="w-6 h-6 text-text" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </motion.button>
            )}

            {/* Wishlist */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              onClick={() => navigate('/wishlist')}
              className="relative p-1.5"
              aria-label="Wishlist"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </motion.button>

            {/* Cart */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              onClick={() => dispatch(openCartDrawer())}
              className="relative p-1.5"
              aria-label="Cart"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {quantity > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {quantity}
                </span>
              )}
            </motion.button>

            {/* User Menu */}
            <div className="relative" ref={dropdownRef}>
              <motion.button
                whileHover={{ scale: 1.1 }}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-1 p-1.5"
                aria-label="User menu"
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

        {/* Navigation — desktop only */}
        <nav className="hidden md:flex border-t items-center justify-between">
          <div className="flex">
            {/* Categories Dropdown */}
            <div className="relative" ref={catDropdownRef}>
              <button
                className="px-4 py-3 hover:bg-ivory text-sm font-medium text-gold flex items-center gap-1"
                onMouseEnter={() => { setCatDropdownOpen(true); }}
                onClick={() => { setCatDropdownOpen(!catDropdownOpen); }}
              >
                Categories
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${catDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {catDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute left-0 top-full mt-0 bg-white rounded-b-xl shadow-xl border border-gray-100 min-w-[200px] z-50"
                  onMouseLeave={() => { setCatDropdownOpen(false); setActiveParentCat(null); }}
                >
                  {categoryTree.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-400">No categories</div>
                  ) : (
                    categoryTree.map((parent) => (
                      <div
                        key={parent.id}
                        className="relative group"
                        onMouseEnter={() => setActiveParentCat(parent.id)}
                      >
                        <button
                          onClick={() => { navigate(`/products?category=${parent.id}`); setCatDropdownOpen(false); }}
                          className="w-full text-left px-4 py-2.5 text-sm font-medium text-text hover:bg-ivory hover:text-gold transition-colors flex items-center justify-between"
                        >
                          {parent.name}
                          {parent.children?.length > 0 && (
                            <ChevronDown className="w-3 h-3 -rotate-90 text-gray-400" />
                          )}
                        </button>
                        {activeParentCat === parent.id && parent.children?.length > 0 && (
                          <div className="absolute left-full top-0 bg-white rounded-xl shadow-xl border border-gray-100 min-w-[180px] z-50 ml-1">
                            <button
                              onClick={() => { navigate(`/products?category=${parent.id}`); setCatDropdownOpen(false); }}
                              className="w-full text-left px-4 py-2 text-sm text-gold font-medium hover:bg-ivory transition-colors"
                            >
                              All {parent.name}
                            </button>
                            <div className="border-t border-gray-50" />
                            {parent.children.map((child) => (
                              <button
                                key={child.id}
                                onClick={() => { navigate(`/products?category=${child.id}`); setCatDropdownOpen(false); }}
                                className="w-full text-left px-4 py-2 text-sm text-text hover:bg-ivory hover:text-gold transition-colors"
                              >
                                {child.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  <div className="border-t border-gray-50">
                    <button
                      onClick={() => { navigate('/categories'); setCatDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gold font-medium hover:bg-ivory transition-colors"
                    >
                      View All Categories
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
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
    </>
  );
};

export default Header;
