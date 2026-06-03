import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/slices/authSlice';

const navItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/admin/products', label: 'Products', icon: '📦' },
  { path: '/admin/categories', label: 'Categories', icon: '📂' },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white transform transition-transform md:transform-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-xl font-bold text-gold">NestinoKids</h1>
          <p className="text-xs text-gray-400 mt-1">Admin Panel</p>
        </div>

        <nav className="mt-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path === '/admin/products' && location.pathname.startsWith('/admin/products')) ||
              (item.path === '/admin/categories' && location.pathname.startsWith('/admin/categories'));
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-6 py-3 text-sm transition ${
                  isActive
                    ? 'bg-gray-800 text-gold border-r-2 border-gold'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-700">
          <p className="text-xs text-gray-400">{user?.email}</p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-white shadow-sm border-b">
          <div className="flex items-center justify-between px-4 md:px-6 py-3">
            <button
              className="md:hidden text-gray-600 hover:text-gray-900"
              onClick={() => setSidebarOpen(true)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex items-center space-x-4 ml-auto">
              <span className="text-sm text-gray-600">
                {user?.first_name} {user?.last_name}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
