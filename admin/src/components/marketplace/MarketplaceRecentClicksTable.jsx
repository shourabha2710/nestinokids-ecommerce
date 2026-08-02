import React from 'react';

const MARKETPLACE_STYLES = {
  AMAZON: 'bg-amber-50 text-amber-700',
  FLIPKART: 'bg-blue-50 text-blue-700',
  MYNTRA: 'bg-pink-50 text-pink-700',
  FIRSTCRY: 'bg-rose-50 text-rose-700',
  MEESHO: 'bg-purple-50 text-purple-700',
};

const getMarketplaceBadge = (marketplace) => {
  const key = String(marketplace || '').toUpperCase();
  return {
    label: MARKETPLACE_STYLES[key] ? String(marketplace || '').toUpperCase() : (marketplace || '—'),
    className: MARKETPLACE_STYLES[key] || 'bg-gray-50 text-gray-600',
  };
};

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
};

const MarketplaceRecentClicksTable = ({ data }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">Recent Clicks</h3>
      </div>
      {!data || data.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
          No recent clicks
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Marketplace</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Product</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Variant</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Source</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Clicked At</th>
              </tr>
            </thead>
            <tbody>
              {data.map((click) => {
                const badge = getMarketplaceBadge(click.marketplace);
                return (
                  <tr key={click.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium whitespace-nowrap ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="font-medium text-gray-900 truncate block max-w-[200px]">
                        {click.product_name || `Product #${click.product_id}`}
                      </span>
                      {click.product_id != null && <span className="text-xs text-gray-400">ID: {click.product_id}</span>}
                    </td>
                    <td className="px-6 py-3 text-gray-600 whitespace-nowrap">
                      {click.variant_label || (click.variant_id != null ? `Variant #${click.variant_id}` : '—')}
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-gray-600 capitalize">{click.source_page || '—'}</span>
                    </td>
                    <td className="px-6 py-3 text-gray-600 whitespace-nowrap">{formatDate(click.clicked_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MarketplaceRecentClicksTable;
