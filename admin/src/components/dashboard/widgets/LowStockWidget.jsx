import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, AlertTriangle } from 'lucide-react';
import DashboardWidget from '../DashboardWidget';
import { DashboardSkeletonTable } from '../DashboardSkeleton';

const getStatus = (item) => {
  if (item.available_quantity === 0) return { bg: 'bg-red-50', text: 'text-red-700', label: 'Out of Stock' };
  if (item.available_quantity <= item.low_stock_threshold) return { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Low Stock' };
  return { bg: 'bg-green-50', text: 'text-green-700', label: 'In Stock' };
};

const StockStatusBadge = ({ item }) => {
  const config = getStatus(item);
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium whitespace-nowrap ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

const LowStockWidget = React.memo(({ lowStockProducts, loading, error, lastUpdated, onRefresh }) => (
  <DashboardWidget
    title="Low Stock Products"
    icon={AlertTriangle}
    color="bg-red-500"
    error={error}
    isEmpty={!loading && !error && !lowStockProducts?.length}
    emptyMessage="No low stock products."
    onRefresh={onRefresh}
    lastUpdated={lastUpdated}
  >
    {loading ? (
      <DashboardSkeletonTable rows={5} cols={4} />
    ) : (
      <div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Available</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Threshold</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {lowStockProducts?.map((item) => (
                <tr key={item.product_id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-3 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                    {item.product_name}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-600 text-right whitespace-nowrap tabular-nums">
                    {item.available_quantity}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-500 text-right whitespace-nowrap tabular-nums">
                    {item.low_stock_threshold}
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    <StockStatusBadge item={item} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <Link
            to="/inventory"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg px-3 py-1.5 transition-colors"
          >
            View Inventory
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    )}
  </DashboardWidget>
));

export default LowStockWidget;
