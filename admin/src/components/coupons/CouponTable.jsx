import React from 'react';
import { motion } from 'framer-motion';
import { Edit3, Trash2, Eye, Copy, ToggleLeft, ToggleRight, ChevronDown } from 'lucide-react';

const CouponTable = ({
  coupons,
  sortField,
  sortDir,
  onSort,
  onEdit,
  onDelete,
  onToggleStatus,
  onDuplicate,
  onView,
}) => {
  const now = new Date();

  const SortIcon = ({ field }) => (
    <ChevronDown
      className={`w-3 h-3 inline-block ml-1 transition-transform ${
        sortField === field ? (sortDir === 'asc' ? 'rotate-180' : '') : 'opacity-30'
      }`}
    />
  );

  const getStatus = (coupon) => {
    if (new Date(coupon.end_date) < now) return { label: 'Expired', color: 'bg-red-50 text-red-600' };
    if (coupon.is_active) return { label: 'Active', color: 'bg-green-50 text-green-600' };
    return { label: 'Inactive', color: 'bg-gray-100 text-gray-500' };
  };

  const getTimeLeft = (coupon) => {
    const diff = new Date(coupon.end_date) - now;
    if (diff < 0) return 'Expired';
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    if (days > 0) return `${days}d left`;
    if (hours > 0) return `${hours}h left`;
    return 'Ending soon';
  };

  if (coupons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <p className="text-lg font-semibold text-gray-600 mb-1">No coupons found</p>
        <p className="text-sm">Create your first coupon to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700" onClick={() => onSort('code')}>
              Code <SortIcon field="code" />
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Discount</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Scope</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700" onClick={() => onSort('usage_count')}>
              Usage <SortIcon field="usage_count" />
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Expires</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {coupons.map((coupon, index) => {
            const status = getStatus(coupon);
            return (
              <motion.tr
                key={coupon.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className="hover:bg-gray-50/50 transition-colors"
              >
                <td className="px-4 py-3">
                  <div>
                    <span className="inline-flex items-center px-2.5 py-1 bg-gold/5 text-gold font-mono text-sm font-bold rounded-lg">
                      {coupon.code}
                    </span>
                    {coupon.name && <p className="text-xs text-gray-500 mt-0.5">{coupon.name}</p>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-semibold text-gray-900">
                    {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `₹${coupon.discount_value}`}
                  </span>
                  {coupon.maximum_discount && (
                    <span className="text-xs text-gray-400 block">max ₹{coupon.maximum_discount}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium ${
                    coupon.applicable_scope === 'GLOBAL' ? 'bg-blue-50 text-blue-600' :
                    coupon.applicable_scope === 'CATEGORY' ? 'bg-purple-50 text-purple-600' :
                    'bg-amber-50 text-amber-600'
                  }`}>
                    {coupon.applicable_scope}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {coupon.usage_count}{coupon.max_usage ? ` / ${coupon.max_usage}` : ''}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium ${status.color}`}>
                    {status.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400 hidden lg:table-cell">
                  {getTimeLeft(coupon)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => onView(coupon)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => onEdit(coupon)} className="p-1.5 text-gray-400 hover:text-gold hover:bg-gold/5 rounded-lg transition-colors" title="Edit">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDuplicate(coupon)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Duplicate">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button onClick={() => onToggleStatus(coupon)} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Toggle Status">
                      {coupon.is_active ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    <button onClick={() => onDelete(coupon)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default CouponTable;
