import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Clock } from 'lucide-react';
import DashboardWidget from '../DashboardWidget';
import { DashboardSkeletonTable } from '../DashboardSkeleton';

const STATUS_MAP = {
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Pending' },
  confirmed: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Confirmed' },
  packed: { bg: 'bg-indigo-50', text: 'text-indigo-700', label: 'Packed' },
  shipped: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Shipped' },
  delivered: { bg: 'bg-green-50', text: 'text-green-700', label: 'Delivered' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700', label: 'Cancelled' },
  returned: { bg: 'bg-gray-50', text: 'text-gray-700', label: 'Returned' },
};

const formatCurrency = (amount) =>
  amount != null ? `\u20B9${Number(amount).toLocaleString()}` : '\u20B90';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const OrderStatusBadge = ({ status }) => {
  const config = STATUS_MAP[status] || STATUS_MAP.pending;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium whitespace-nowrap ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

const LatestOrdersWidget = React.memo(({ latestOrders, loading, error, lastUpdated, onRefresh }) => (
  <DashboardWidget
    title="Latest Orders"
    icon={Clock}
    color="bg-yellow-500"
    error={error}
    isEmpty={!loading && !error && !latestOrders?.length}
    emptyMessage="No recent orders found."
    onRefresh={onRefresh}
    lastUpdated={lastUpdated}
  >
    {loading ? (
      <DashboardSkeletonTable rows={5} cols={5} />
    ) : (
      <div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody>
              {latestOrders?.map((order) => (
                <tr key={order.order_number} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-3 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                    #{order.order_number}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {order.customer_name}
                  </td>
                  <td className="px-3 py-3 text-sm font-semibold text-gray-900 text-right whitespace-nowrap">
                    {formatCurrency(order.final_amount)}
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    <OrderStatusBadge status={order.order_status} />
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-500 text-right whitespace-nowrap">
                    {formatDate(order.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <Link
            to="/orders"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg px-3 py-1.5 transition-colors"
          >
            View All Orders
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    )}
  </DashboardWidget>
));

export default LatestOrdersWidget;
