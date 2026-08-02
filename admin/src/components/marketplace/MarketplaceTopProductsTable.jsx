import React from 'react';

const formatCount = (v) => Intl.NumberFormat('en-IN').format(v ?? 0);

const renderMapCells = (map) => {
  const entries = Object.entries(map || {});
  if (entries.length === 0) return <span className="text-gray-400">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([key, value]) => (
        <span key={key} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-50 text-xs text-gray-600">
          <span className="capitalize">{key}</span>: <span className="font-semibold">{formatCount(value)}</span>
        </span>
      ))}
    </div>
  );
};

const MarketplaceTopProductsTable = ({ data }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">Top Products by Clicks</h3>
      </div>
      {!data || data.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
          No click data for the selected period
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Product</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Clicks</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Marketplace</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Source Page</th>
              </tr>
            </thead>
            <tbody>
              {data.map((product) => (
                <tr key={product.product_id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-gray-900 truncate">{product.name}</span>
                      {!product.is_active && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-gray-50 text-gray-400 whitespace-nowrap">
                          Inactive
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">ID: {product.product_id}</span>
                  </td>
                  <td className="px-6 py-3 font-semibold text-gray-900">{formatCount(product.clicks)}</td>
                  <td className="px-6 py-3">{renderMapCells(product.marketplace_clicks)}</td>
                  <td className="px-6 py-3">{renderMapCells(product.source_clicks)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MarketplaceTopProductsTable;
