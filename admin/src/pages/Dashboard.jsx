import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0,
  });

  useEffect(() => {
    // Fetch dashboard stats
    // This would call an API endpoint
  }, []);

  const chartData = [
    { name: 'Jan', revenue: 4000, orders: 24 },
    { name: 'Feb', revenue: 3000, orders: 13 },
    { name: 'Mar', revenue: 2000, orders: 9 },
    { name: 'Apr', revenue: 2780, orders: 39 },
    { name: 'May', revenue: 1890, orders: 22 },
    { name: 'Jun', revenue: 2390, orders: 29 },
  ];

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-text mb-8">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Revenue', value: `₹${stats.totalRevenue}`, color: 'from-gold' },
          { label: 'Total Orders', value: stats.totalOrders, color: 'from-blue-500' },
          { label: 'Total Products', value: stats.totalProducts, color: 'from-green-500' },
          { label: 'Total Customers', value: stats.totalCustomers, color: 'from-purple-500' },
        ].map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`bg-gradient-to-r ${stat.color} to-transparent p-6 rounded-lg text-white shadow-md`}
          >
            <p className="text-sm opacity-90">{stat.label}</p>
            <p className="text-3xl font-bold">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-md p-6 mb-8"
      >
        <h2 className="text-xl font-bold text-text mb-6">Sales Overview</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="revenue" fill="#D4AF37" />
            <Bar dataKey="orders" fill="#2D2D2D" />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Recent Orders */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-md overflow-hidden"
      >
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-text">Recent Orders</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-text">Order ID</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-text">Customer</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-text">Amount</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-text">Status</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i} className="border-b hover:bg-ivory">
                <td className="px-6 py-3 text-sm">ORD-001-{i}</td>
                <td className="px-6 py-3 text-sm">Customer {i}</td>
                <td className="px-6 py-3 text-sm">₹{Math.random() * 10000}</td>
                <td className="px-6 py-3 text-sm">
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Delivered</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
};

export default Dashboard;
