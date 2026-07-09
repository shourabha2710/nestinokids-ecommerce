import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, DollarSign, ShoppingBag, Users, Package } from 'lucide-react';
import { analyticsApi } from '../../services/analyticsApi';
import AnalyticsCard from '../../components/analytics/AnalyticsCard';
import DateRangeFilter from '../../components/analytics/DateRangeFilter';
import SalesTrendChart from '../../components/analytics/SalesTrendChart';
import OrderStatusChart from '../../components/analytics/OrderStatusChart';
import TopProductsTable from '../../components/analytics/TopProductsTable';
import LowStockTable from '../../components/analytics/LowStockTable';
import ExportReports from '../../components/analytics/ExportReports';

const LOADING_STATE = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
  </div>
);

const ERROR_STATE = ({ msg, onRetry }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
      <BarChart3 className="w-6 h-6 text-red-400" />
    </div>
    <p className="text-gray-900 font-medium mb-1">Failed to load reports</p>
    <p className="text-sm text-gray-500 mb-4">{msg}</p>
    <button onClick={onRetry} className="px-4 py-2 bg-gold text-white text-sm font-medium rounded-lg hover:bg-gold/90 transition-colors">
      Try Again
    </button>
  </div>
);

const AdminReports = () => {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [salesTrend, setSalesTrend] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [orderStatus, setOrderStatus] = useState([]);
  const [lowStock, setLowStock] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, trendRes, productsRes, statusRes, lowStockRes] = await Promise.all([
        analyticsApi.getSummary(days),
        analyticsApi.getSalesTrend(days),
        analyticsApi.getTopProducts(10),
        analyticsApi.getOrderStatus(),
        analyticsApi.getLowStock(),
      ]);
      setSummary(summaryRes.data);
      setSalesTrend(trendRes.data || []);
      setTopProducts(productsRes.data || []);
      setOrderStatus(statusRes.data || []);
      setLowStock(lowStockRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !summary) return LOADING_STATE();
  if (error && !summary) return <ERROR_STATE msg={error} onRetry={fetchData} />;

  const totalOrders = summary?.totalOrders ?? 0;
  const totalRevenue = summary?.totalRevenue ?? 0;
  const totalCustomers = summary?.totalCustomers ?? 0;
  const activeProducts = summary?.activeProducts ?? 0;
  const pendingOrders = summary?.pendingOrders ?? 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track your store performance and metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangeFilter value={days} onChange={setDays} />
          <ExportReports />
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <AnalyticsCard title="Total Revenue" value={totalRevenue} icon={DollarSign} trend={summary?.revenueTrend} subtitle={`${days}-day period`} />
        <AnalyticsCard title="Total Orders" value={totalOrders} icon={ShoppingBag} trend={summary?.ordersTrend} />
        <AnalyticsCard title="Customers" value={totalCustomers} icon={Users} />
        <AnalyticsCard title="Active Products" value={activeProducts} icon={Package} />
        <AnalyticsCard title="Pending Orders" value={pendingOrders} icon={BarChart3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SalesTrendChart data={salesTrend} />
        </div>
        <div>
          <OrderStatusChart data={orderStatus} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <TopProductsTable data={topProducts} />
        <LowStockTable data={lowStock} />
      </div>
    </div>
  );
};

export default AdminReports;
