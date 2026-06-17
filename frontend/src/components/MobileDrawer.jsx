import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  FolderTree,
  Package,
  TrendingUp,
  Sparkles,
  Heart,
  ShoppingBag,
  MapPin,
  User,
  Phone,
  X,
  LogIn,
  UserPlus,
  ChevronDown,
} from 'lucide-react';
import { productsAPI } from '../api/endpoints';

const navItems = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'Categories', path: '/categories', icon: FolderTree, hasSubmenu: true },
  { label: 'All Products', path: '/products', icon: Package },
  { label: 'Best Sellers', path: '/bestsellers', icon: TrendingUp },
  { label: 'New Arrivals', path: '/new-arrivals', icon: Sparkles },
];

const authItems = [
  { label: 'Wishlist', path: '/wishlist', icon: Heart },
  { label: 'Orders', path: '/orders', icon: ShoppingBag },
  { label: 'Addresses', path: '/addresses', icon: MapPin },
  { label: 'Profile', path: '/profile', icon: User },
];

const guestItems = [
  { label: 'Login', path: '/login', icon: LogIn },
  { label: 'Register', path: '/register', icon: UserPlus },
];

const contactItem = { label: 'Contact Us', path: '/contact', icon: Phone };

const MobileDrawer = ({ open, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [categoryTree, setCategoryTree] = useState([]);
  const [openCatIds, setOpenCatIds] = useState([]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      productsAPI.getCategoryTree().then((res) => {
        if (Array.isArray(res.data)) setCategoryTree(res.data);
      }).catch(() => {});
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    onClose();
  }, [location.pathname]);

  const handleNav = (path) => {
    navigate(path);
    onClose();
  };

  const toggleCat = (id) => {
    setOpenCatIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const allItems = [
    ...navItems,
    ...(isAuthenticated ? authItems : guestItems),
    contactItem,
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/50 z-[100]"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="fixed top-0 left-0 w-80 max-w-[85vw] h-full bg-white z-[110] shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between px-5 h-14 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <img
                  src="/images/logo.png"
                  alt="NestinoKids"
                  className="h-9 w-auto object-contain"
                />
                <div>
                  <h2 className="font-bold text-base text-gold leading-tight">NestinoKids</h2>
                  <p className="text-[10px] text-gray-400 leading-tight">Softness You Can Trust</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors -mr-1"
                aria-label="Close menu"
              >
                <X className="w-5 h-5 text-text" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-1 overscroll-contain scrollbar-hide">
              {allItems.map((item) => {
                const isActive = location.pathname === item.path;
                if (item.hasSubmenu) {
                  const isOpen = openCatIds.includes('__cat_root__');
                  return (
                    <div key={item.path}>
                      <button
                        onClick={() => toggleCat('__cat_root__')}
                        className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors min-h-[48px] ${
                          isActive
                            ? 'bg-gold/10 text-gold font-semibold'
                            : 'text-text hover:bg-gray-50'
                        }`}
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm flex-1 font-medium">{item.label}</span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            key="submenu"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="bg-gray-50/80">
                              {categoryTree.length === 0 ? (
                                <p className="px-14 py-3 text-xs text-gray-400">No categories</p>
                              ) : (
                                categoryTree.map((parent) => {
                                  const isParentOpen = openCatIds.includes(parent.id);
                                  return (
                                    <div key={parent.id}>
                                      <button
                                        onClick={() => {
                                          if (parent.children?.length > 0) {
                                            toggleCat(parent.id);
                                          } else {
                                            handleNav(`/products?category=${parent.id}`);
                                          }
                                        }}
                                        className="w-full flex items-center justify-between px-14 py-3 text-left text-sm font-medium text-text hover:bg-gray-100 transition-colors min-h-[44px]"
                                      >
                                        <span>{parent.name}</span>
                                        {parent.children?.length > 0 && (
                                          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isParentOpen ? 'rotate-180' : ''}`} />
                                        )}
                                      </button>
                                      {parent.children?.length > 0 && (
                                        <AnimatePresence initial={false}>
                                          {isParentOpen && (
                                            <motion.div
                                              initial={{ height: 0, opacity: 0 }}
                                              animate={{ height: 'auto', opacity: 1 }}
                                              exit={{ height: 0, opacity: 0 }}
                                              transition={{ duration: 0.15 }}
                                              className="overflow-hidden"
                                            >
                                              {parent.children.map((child) => (
                                                <button
                                                  key={child.id}
                                                  onClick={() => handleNav(`/products?category=${child.id}`)}
                                                  className="w-full text-left px-16 py-2.5 text-sm text-gray-600 hover:text-gold hover:bg-gray-100 transition-colors min-h-[40px]"
                                                >
                                                  {child.name}
                                                </button>
                                              ))}
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                              <button
                                onClick={() => handleNav('/categories')}
                                className="w-full text-left px-14 py-3 text-sm text-gold font-medium hover:bg-gray-100 transition-colors min-h-[44px]"
                              >
                                View All Categories
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                }
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNav(item.path)}
                    className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors min-h-[48px] ${
                      isActive
                        ? 'bg-gold/10 text-gold font-semibold'
                        : 'text-text hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileDrawer;
