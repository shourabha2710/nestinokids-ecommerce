import React, { useEffect } from 'react';
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
} from 'lucide-react';

const navItems = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'Categories', path: '/categories', icon: FolderTree },
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

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
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
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-[60]"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 left-0 bottom-0 w-72 bg-white z-[70] shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between px-4 h-16 border-b border-gray-100">
              <span className="font-bold text-lg text-gold">Menu</span>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-text" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-2">
              {allItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNav(item.path)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      isActive
                        ? 'bg-gold/10 text-gold font-semibold'
                        : 'text-text hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm">{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="px-4 py-4 border-t border-gray-100">
              <p className="text-xs text-gray-400">NestinoKids &copy; {new Date().getFullYear()}</p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileDrawer;
