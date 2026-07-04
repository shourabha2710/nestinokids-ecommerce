import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { NotificationProvider } from '../context/NotificationContext';
import NotificationBell from '../components/notifications/NotificationBell';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ClipboardList,
  ShoppingCart,
  Image,
  Camera,
  Star,
  Monitor,
  Tag,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
  User,
  Bell,
  MessageSquare,
  HelpCircle,
  Megaphone,
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/notifications', label: 'Notifications', icon: Bell },
  { path: '/products', label: 'Products', icon: Package },
  { path: '/categories', label: 'Categories', icon: FolderTree },
  { path: '/inventory', label: 'Inventory', icon: ClipboardList },
  { path: '/orders', label: 'Orders', icon: ShoppingCart },
  { path: '/coupons', label: 'Coupons', icon: Tag },
  { path: '/banners', label: 'Banners', icon: Image },
  { path: '/hero-slides', label: 'Hero Slides', icon: Monitor },
  { path: '/instagram', label: 'Instagram', icon: Camera },
  { path: '/reviews', label: 'Reviews', icon: Star },
  { path: '/support-tickets', label: 'Support Tickets', icon: MessageSquare },
  { path: '/faqs', label: 'FAQs', icon: HelpCircle },
  { path: '/announcements', label: 'Announcements', icon: Megaphone },
  { path: '/settings', label: 'Website Settings', icon: Settings },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (mobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileSidebarOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const isActive = (itemPath) => {
    if (itemPath === '/dashboard') return location.pathname === itemPath;
    return location.pathname.startsWith(itemPath);
  };

  return (
    <NotificationProvider>
    <div className="h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar - always fixed, full viewport height */}
      <motion.aside
        layout
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-gray-900 text-white h-screen transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        } ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo area - fixed top */}
        <div className={`
          flex items-center flex-shrink-0 border-b border-white/10
          ${sidebarCollapsed ? 'justify-center h-16 px-2' : 'px-4 py-3'}
        `}>
          <div className={`flex items-center ${sidebarCollapsed ? '' : 'flex-1 min-w-0'} gap-3`}>
            <img
              src="/images/logo.png"
              alt="NestinoKids"
              className="h-10 w-auto object-contain flex-shrink-0"
            />
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <h2 className="text-base font-bold text-white truncate">NestinoKids</h2>
                <p className="text-[10px] text-gray-400 truncate">Admin Panel</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex text-gray-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-gray-800"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation - scrollable */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2 admin-sidebar-scroll">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  active
                    ? 'bg-gold/10 text-gold'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-gold' : ''}`} />
                {!sidebarCollapsed && (
                  <span className="font-medium truncate">{item.label}</span>
                )}
                {active && !sidebarCollapsed && (
                  <motion.div
                    layoutId="activeTab"
                    className="w-1 h-5 rounded-full bg-gold ml-auto flex-shrink-0"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* User profile area - always visible at bottom */}
        <div className="border-t border-gray-800 p-3 flex-shrink-0">
          {!sidebarCollapsed ? (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-gray-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-200 truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-red-400 transition-colors p-1 flex-shrink-0"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-3">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                <User className="w-4 h-4 text-gray-300" />
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-red-400 transition-colors p-1"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

      </motion.aside>

      {/* Main content area - scrolls independently */}
      <div
        className={`flex-1 flex flex-col min-w-0 h-screen transition-all duration-300 ${
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        }`}
      >
        {/* Top header - fixed/sticky within scroll area */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 lg:px-6 flex-shrink-0">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700 mr-3"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center space-x-4">
            <NotificationBell />
            <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-700">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-gray-400">Administrator</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-gold" />
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </div>
        </main>
      </div>
    </div>
    </NotificationProvider>
  );
};

export default AdminLayout;
