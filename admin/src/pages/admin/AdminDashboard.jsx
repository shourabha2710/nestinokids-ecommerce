import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import { dashboardApi } from '../../services/dashboardApi';
import DashboardSection from '../../components/dashboard/DashboardSection';
import DashboardGrid from '../../components/dashboard/DashboardGrid';
import DashboardChartCard from '../../components/dashboard/DashboardChartCard';
import DashboardWidget from '../../components/dashboard/DashboardWidget';
import DashboardStatsGrid from '../../components/dashboard/DashboardStatsGrid';
import RevenueTrendChart from '../../components/dashboard/charts/RevenueTrendChart';
import OrdersTrendChart from '../../components/dashboard/charts/OrdersTrendChart';
import OrderStatusChart from '../../components/dashboard/charts/OrderStatusChart';
import LatestOrdersWidget from '../../components/dashboard/widgets/LatestOrdersWidget';

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

const chartSections = [
  {
    title: 'Revenue',
    description: 'Revenue and order trends over time',
    cols: 2,
    cards: [
      { key: 'revenue-trend', title: 'Revenue Trend', icon: IndianRupee, color: 'bg-emerald-500', dataKey: 'revenue_trend', Chart: RevenueTrendChart },
      { key: 'orders-trend', title: 'Orders Trend', icon: ShoppingCart, color: 'bg-blue-500', dataKey: 'orders_trend', Chart: OrdersTrendChart },
    ],
  },
  {
    title: 'Orders',
    description: 'Order analytics and status distribution',
    cols: 2,
    cards: [
      { key: 'order-status', title: 'Order Status Distribution', icon: CheckCircle, color: 'bg-green-500', dataKey: 'order_status', Chart: OrderStatusChart },
      { key: 'latest-orders', title: 'Latest Orders', icon: Clock, color: 'bg-yellow-500', Widget: LatestOrdersWidget },
    ],
  },
  {
    title: 'Products',
    description: 'Product performance and inventory alerts',
    cols: 2,
    cards: [
      { key: 'top-products', title: 'Top Selling Products', icon: Package, color: 'bg-violet-500', placeholder: 'Top products chart will be added in a future phase' },
      { key: 'low-stock', title: 'Low Stock Products', icon: AlertIcon, color: 'bg-red-500', placeholder: 'Low stock table will be added in a future phase' },
    ],
  },
];

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [widgetData, setWidgetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [widgetLoading, setWidgetLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setChartLoading(true);
      setWidgetLoading(true);
      const [statsRes, chartsRes, widgetsRes] = await Promise.all([
        dashboardApi.getSummary(),
        dashboardApi.getCharts(),
        dashboardApi.getWidgets(),
      ]);
      setStats(statsRes.data);
      setChartData(chartsRes.data);
      setWidgetData(widgetsRes.data);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setChartLoading(false);
      setWidgetLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

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

      <DashboardSection title="Overview" description="Key metrics at a glance">
        <DashboardStatsGrid
          cards={statCards}
          stats={stats}
          loading={loading}
        />
      </DashboardSection>

      {chartSections.map((section) => (
        <DashboardSection
          key={section.title}
          title={section.title}
          description={section.description}
        >
          <DashboardGrid cols={section.cols}>
            {section.cards.map((card) => (
              card.Widget ? (
                <card.Widget
                  key={card.key}
                  latestOrders={widgetData?.latest_orders}
                  loading={widgetLoading}
                  error={error}
                  lastUpdated={lastUpdated}
                  onRefresh={fetchAll}
                />
              ) : card.Chart ? (
                <DashboardWidget
                  key={card.key}
                  icon={card.icon}
                  title={card.title}
                  color={card.color}
                  loading={chartLoading}
                  isEmpty={!chartData?.[card.dataKey]?.length}
                  onRefresh={fetchAll}
                  lastUpdated={lastUpdated}
                >
                  <card.Chart data={chartData?.[card.dataKey] || []} />
                </DashboardWidget>
              ) : (
                <DashboardChartCard
                  key={card.key}
                  icon={card.icon}
                  title={card.title}
                  color={card.color}
                  placeholder={card.placeholder}
                />
              )
            ))}
          </DashboardGrid>
        </DashboardSection>
      ))}
    </div>
  );
};

export default AdminDashboard;
