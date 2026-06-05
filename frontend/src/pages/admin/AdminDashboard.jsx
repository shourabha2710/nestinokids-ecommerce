import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { adminAPI } from '../../api/endpoints';
import {
  ShoppingCart,
  Clock,
  CheckCircle,
  IndianRupee,
  Package,
  FolderTree,
  Users,
  ClipboardList,
  AlertTriangle,
  Ban,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

const statCards = [
  { key: 'total_orders', label: 'Total Orders', icon: ShoppingCart, color: 'bg-blue-500', trend: '+12%' },
  { key: 'pending_orders', label: 'Pending Orders', icon: Clock, color: 'bg-yellow-500', trend: null },
  { key: 'delivered_orders', label: 'Delivered', icon: CheckCircle, color: 'bg-green-500', trend: '+8%' },
  { key: 'total_revenue', label: 'Total Revenue', icon: IndianRupee, color: 'bg-emerald-500', trend: '+23%', prefix: '₹' },
  { key: 'total_products', label: 'Products', icon: Package, color: 'bg-violet-500', trend: null },
  { key: 'total_categories', label: 'Categories', icon: FolderTree, color: 'bg-indigo-500', trend: null },
  { key: 'total_users', label: 'Users', icon: Users, color: 'bg-orange-500', trend: '+5%' },
  { key: 'total_inventory_items', label: 'Inventory Items', icon: ClipboardList, color: 'bg-cyan-500', trend: null },
  { key: 'low_stock_products', label: 'Low Stock', icon: AlertTriangle, color: 'bg-yellow-500', trend: null, danger: true },
  { key: 'out_of_stock_products', label: 'Out of Stock', icon: Ban, color: 'bg-red-500', trend: null, danger: true },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const SkeletonCard = () => (
  <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
    <div className="flex items-start justify-between mb-4">
      <div className="w-10 h-10 rounded-xl bg-gray-100" />
      <div className="w-16 h-4 bg-gray-100 rounded" />
    </div>
    <div className="h-8 w-24 bg-gray-100 rounded mb-2" />
    <div className="h-4 w-20 bg-gray-50 rounded" />
  </div>
);

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

  if (error) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of your store performance</p>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-600 px-5 py-4 rounded-xl">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your store performance</p>
      </div>

      {loading ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {statCards.map((card) => {
            const Icon = card.icon;
            const value = card.key === 'total_revenue'
              ? stats?.[card.key]?.toLocaleString() ?? 0
              : stats?.[card.key] ?? 0;
            const isZero = value === 0 || value === '0';

            return (
              <motion.div
                key={card.key}
                variants={itemVariants}
                className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:border-gray-200 transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl ${card.color} bg-opacity-10 flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${card.color.replace('bg-', 'text-')}`} />
                  </div>
                  {card.trend && !isZero && (
                    <span className={`flex items-center space-x-1 text-xs font-medium ${
                      card.danger ? 'text-red-500' : 'text-green-600'
                    }`}>
                      <TrendingUp className="w-3 h-3" />
                      <span>{card.trend}</span>
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {card.prefix || ''}{value}
                </p>
                <p className="text-sm text-gray-500 mt-1">{card.label}</p>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
};

export default AdminDashboard;
