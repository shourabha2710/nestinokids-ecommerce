import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../api/endpoints';

const cards = [
  { key: 'total_products', label: 'Total Products', color: 'bg-blue-500', icon: '📦' },
  { key: 'total_categories', label: 'Total Categories', color: 'bg-green-500', icon: '📁' },
  { key: 'total_orders', label: 'Total Orders', color: 'bg-purple-500', icon: '🛒' },
  { key: 'total_users', label: 'Total Users', color: 'bg-orange-500', icon: '👤' },
];

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await adminAPI.getDashboard();
        setStats(res.data);
      } catch (err) {
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
              <div className="h-8 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <div key={card.key} className="bg-white rounded-lg shadow overflow-hidden">
            <div className={`${card.color} px-4 py-3 flex items-center justify-between`}>
              <span className="text-white text-lg font-semibold">{card.label}</span>
              <span className="text-2xl">{card.icon}</span>
            </div>
            <div className="px-4 py-6">
              <p className="text-3xl font-bold text-gray-800">
                {stats?.[card.key] ?? 0}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
