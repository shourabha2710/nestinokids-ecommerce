import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Package } from 'lucide-react';
import DashboardWidget from '../DashboardWidget';
import { DashboardSkeletonTable } from '../DashboardSkeleton';

const RANK_LABELS = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];

const RankBadge = ({ rank }) => (
  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold bg-gray-50 text-gray-500">
    {rank <= 3 ? (
      <span className="text-sm">{RANK_LABELS[rank - 1]}</span>
    ) : (
      <span className="text-gray-400">#{rank}</span>
    )}
  </span>
);

const TopSellingProductsWidget = React.memo(({ topSellingProducts, loading, error, lastUpdated, onRefresh }) => (
  <DashboardWidget
    title="Top Selling Products"
    icon={Package}
    color="bg-violet-500"
    error={error}
    isEmpty={!loading && !error && !topSellingProducts?.length}
    emptyMessage="No sales data available."
    onRefresh={onRefresh}
    lastUpdated={lastUpdated}
  >
    {loading ? (
      <DashboardSkeletonTable rows={5} cols={3} />
    ) : (
      <div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ width: '3rem' }}>Rank</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sold</th>
              </tr>
            </thead>
            <tbody>
              {topSellingProducts?.map((product, index) => {
                const rank = index + 1;
                return (
                  <tr key={product.product_id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-3 py-3">
                      <RankBadge rank={rank} />
                    </td>
                    <td className="px-3 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {product.product_name}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600 text-right whitespace-nowrap tabular-nums font-semibold">
                      {product.total_sold}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <Link
            to="/products"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg px-3 py-1.5 transition-colors"
          >
            View Products
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    )}
  </DashboardWidget>
));

export default TopSellingProductsWidget;
