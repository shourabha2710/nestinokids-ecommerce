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
  Award,
  Gift,
  Repeat,
  Heart,
  Sparkles,
} from 'lucide-react';

const statCards = [
  { key: 'total_orders', label: 'Total Orders', icon: ShoppingCart, color: 'bg-blue-500' },
  { key: 'pending_orders', label: 'Pending Orders', icon: Clock, color: 'bg-yellow-500' },
  { key: 'delivered_orders', label: 'Delivered', icon: CheckCircle, color: 'bg-green-500' },
  { key: 'total_revenue', label: 'Total Revenue', icon: IndianRupee, color: 'bg-emerald-500', prefix: '₹' },
  { key: 'total_products', label: 'Products', icon: Package, color: 'bg-violet-500' },
  { key: 'total_categories', label: 'Categories', icon: FolderTree, color: 'bg-indigo-500' },
  { key: 'total_users', label: 'Users', icon: Users, color: 'bg-orange-500' },
  { key: 'total_inventory_items', label: 'Inventory Items', icon: ClipboardList, color: 'bg-cyan-500' },
  { key: 'low_stock_products', label: 'Low Stock', icon: AlertTriangle, color: 'bg-yellow-500', danger: true },
  { key: 'out_of_stock_products', label: 'Out of Stock', icon: Ban, color: 'bg-red-500', danger: true },
  { key: 'total_loyalty_points_issued', label: 'Points Issued', icon: Award, color: 'bg-amber-500', prefix: '±' },
  { key: 'total_loyalty_points_redeemed', label: 'Points Redeemed', icon: Sparkles, color: 'bg-rose-500', prefix: '±' },
  { key: 'total_referrals', label: 'Total Referrals', icon: Gift, color: 'bg-teal-500' },
  { key: 'repeat_customer_rate', label: 'Repeat Customers', icon: Repeat, color: 'bg-sky-500', suffix: '%' },
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
          {Array.from({ length: 14 }).map((_, i) => (
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
            const rawValue = stats?.[card.key];
            const value = card.prefix
              ? `${card.prefix}${rawValue?.toLocaleString() ?? 0}`
              : card.suffix
              ? `${rawValue ?? 0}${card.suffix}`
              : rawValue ?? 0;
            const isZero = rawValue === 0 || rawValue === '0';

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
                  {!isZero && (
                    <span className="flex items-center space-x-1 text-xs font-medium text-green-600">
                      <TrendingUp className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-sm text-gray-500 mt-1">{card.label}</p>
              </motion.div>
            );
          })}

          {/* Most Wishlisted Products card */}
          {stats?.most_wishlisted_products?.length > 0 && (
            <motion.div
              variants={itemVariants}
              className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:border-gray-200 transition-all duration-200 col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-2"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-pink-500 bg-opacity-10 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-pink-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Most Wishlisted Products</p>
                  <p className="text-xs text-gray-500">Top 5 most saved items</p>
                </div>
              </div>
              <div className="space-y-2">
                {stats.most_wishlisted_products.map((item, i) => (
                  <div key={item.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400 w-5">{i + 1}.</span>
                      <span className="font-medium text-gray-700 truncate max-w-[200px]">{item.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-pink-500 bg-pink-50 px-2 py-0.5 rounded-full">
                      {item.wishlist_count} saved
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default AdminDashboard;
