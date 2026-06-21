import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">NestinoKids Admin</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Admin Dashboard
          </h2>
          <p className="text-green-600 font-semibold text-lg mb-4">
            Authentication working
          </p>
          <p className="text-gray-400 text-sm">
            You are logged in as <strong>{user?.email}</strong> with role{' '}
            <strong>{user?.role}</strong>.
          </p>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
