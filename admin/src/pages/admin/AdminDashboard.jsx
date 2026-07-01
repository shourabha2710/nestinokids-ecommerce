import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { adminAPI } from '../../services/adminApi';
import DashboardStatsGrid from '../../components/dashboard/DashboardStatsGrid';

import {
  ShoppingCart, Clock, CheckCircle, IndianRupee, Package, FolderTree, Users,
  ClipboardList, AlertTriangle as AlertIcon, Ban, Award, Gift, Repeat,
  Heart, Sparkles, MessageSquare, Bell,
} from 'lucide-react';

const statCards = [
  { key: 'total_orders', label: 'Total Orders', icon: ShoppingCart, color: 'bg-blue-500' },
  { key: 'pending_orders', label: 'Pending Orders', icon: Clock, color: 'bg-yellow-500' },
  { key: 'delivered_orders', label: 'Delivered', icon: CheckCircle, color: 'bg-green-500' },
  { key: 'cancelled_orders', label: 'Cancelled', icon: Ban, color: 'bg-red-500', danger: true },
  { key: 'total_revenue', label: 'Total Revenue', icon: IndianRupee, color: 'bg-emerald-500', prefix: '₹' },
  { key: 'total_products', label: 'Products', icon: Package, color: 'bg-violet-500' },
  { key: 'active_products', label: 'Active Products', icon: CheckCircle, color: 'bg-green-500' },
  { key: 'total_categories', label: 'Categories', icon: FolderTree, color: 'bg-indigo-500' },
  { key: 'total_users', label: 'Customers', icon: Users, color: 'bg-orange-500' },
  { key: 'total_inventory_items', label: 'Inventory Items', icon: ClipboardList, color: 'bg-cyan-500' },
  { key: 'inventory_value', label: 'Inventory Value', icon: IndianRupee, color: 'bg-emerald-500', prefix: '₹' },
  { key: 'low_stock_products', label: 'Low Stock', icon: AlertIcon, color: 'bg-yellow-500', danger: true },
  { key: 'out_of_stock_products', label: 'Out of Stock', icon: Ban, color: 'bg-red-500', danger: true },
  { key: 'total_loyalty_points_issued', label: 'Points Issued', icon: Award, color: 'bg-amber-500', prefix: '±' },
  { key: 'total_loyalty_points_redeemed', label: 'Points Redeemed', icon: Sparkles, color: 'bg-rose-500', prefix: '±' },
  { key: 'total_referrals', label: 'Total Referrals', icon: Gift, color: 'bg-teal-500' },
  { key: 'repeat_customer_rate', label: 'Repeat Customers', icon: Repeat, color: 'bg-sky-500', suffix: '%' },
  { key: 'open_tickets', label: 'Open Tickets', icon: MessageSquare, color: 'bg-red-500', danger: true },
  { key: 'resolved_tickets', label: 'Resolved Tickets', icon: CheckCircle, color: 'bg-green-500' },
  { key: 'total_notifications_sent', label: 'Notifications Sent', icon: Bell, color: 'bg-blue-500' },
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

      <DashboardStatsGrid
        cards={statCards}
        stats={stats}
        loading={loading}
      />
    </div>
  );
};

export default AdminDashboard;
