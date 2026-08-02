import React from 'react';
import { Calendar, Filter } from 'lucide-react';

const MARKETPLACE_OPTIONS = ['AMAZON', 'FLIPKART', 'MYNTRA', 'FIRSTCRY', 'MEESHO'];
const SOURCE_OPTIONS = [
  { value: 'product_detail', label: 'Product Detail' },
  { value: 'cart', label: 'Cart' },
  { value: 'unknown', label: 'Unknown' },
];

const toISODate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const todayISO = () => toISODate(new Date());

const daysAgoISO = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toISODate(d);
};

const PRESETS = [
  { key: 'today', label: 'Today', start: () => todayISO(), end: () => todayISO() },
  { key: '7', label: '7 Days', start: () => daysAgoISO(6), end: () => todayISO() },
  { key: '30', label: '30 Days', start: () => daysAgoISO(29), end: () => todayISO() },
  { key: '90', label: '90 Days', start: () => daysAgoISO(89), end: () => todayISO() },
];

const MarketplaceAnalyticsFilters = ({ filters, onChange, products }) => {
  const activePreset = PRESETS.find((p) => p.start() === filters.startDate && p.end() === filters.endDate)?.key || 'custom';

  const set = (patch) => onChange({ ...filters, ...patch });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl p-1">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => set({ startDate: p.start(), endDate: p.end() })}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activePreset === p.key
                  ? 'bg-gold text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className={`flex items-center gap-2 rounded-xl border p-1.5 ${
          activePreset === 'custom' ? 'border-gold/40 bg-gold/5' : 'border-gray-200 bg-gray-50'
        }`}>
          <Calendar className="w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => set({ startDate: e.target.value })}
            className="bg-transparent text-sm text-gray-700 focus:outline-none"
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => set({ endDate: e.target.value })}
            className="bg-transparent text-sm text-gray-700 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <select
            value={filters.marketplace}
            onChange={(e) => set({ marketplace: e.target.value })}
            className="appearance-none pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 transition-all"
          >
            <option value="all">All Marketplaces</option>
            {MARKETPLACE_OPTIONS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <select
            value={filters.sourcePage}
            onChange={(e) => set({ sourcePage: e.target.value })}
            className="appearance-none pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 transition-all"
          >
            <option value="all">All Source Pages</option>
            {SOURCE_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <select
            value={filters.productId}
            onChange={(e) => set({ productId: e.target.value })}
            className="appearance-none pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 transition-all max-w-xs"
          >
            <option value="all">All Products</option>
            {(products || []).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceAnalyticsFilters;
