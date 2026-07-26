import React from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Clock, Calendar, Copy, Eye, Edit3, Trash2, CheckCircle, XCircle } from 'lucide-react';

const getPromotionStatus = (p) => {
  const now = new Date();
  const start = new Date(p.start_date);
  const end = new Date(p.end_date);
  if (!p.is_active) return 'inactive';
  if (now < start) return 'scheduled';
  if (now > end) return 'expired';
  return 'running';
};

const statusConfig = {
  running: { label: 'Running', styles: 'bg-green-50 text-green-600', dotColor: 'bg-green-500' },
  scheduled: { label: 'Scheduled', styles: 'bg-blue-50 text-blue-600', dotColor: 'bg-blue-500' },
  expired: { label: 'Expired', styles: 'bg-gray-100 text-gray-500', dotColor: 'bg-gray-400' },
  inactive: { label: 'Inactive', styles: 'bg-red-50 text-red-500', dotColor: 'bg-red-400' },
};

const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const getTimeIndicator = (p) => {
  const now = new Date();
  const start = new Date(p.start_date);
  const end = new Date(p.end_date);
  const diffMs = p.is_active ? (now < start ? start - now : now < end ? end - now : now - end) : 0;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (!p.is_active) return null;
  if (now < start) {
    if (days > 0) return `Starts in ${days}d`;
    if (hours > 0) return `Starts in ${hours}h`;
    return 'Starting soon';
  }
  if (now > end) {
    const expiredDays = Math.floor((now - end) / (1000 * 60 * 60 * 24));
    if (expiredDays > 0) return `Expired ${expiredDays}d ago`;
    return 'Expired today';
  }
  if (days > 0) return `Ends in ${days}d`;
  if (hours > 0) return `Ends in ${hours}h`;
  return 'Ending soon';
};

const PromotionTable = ({ promotions, sortField, sortDir, onSort, onEdit, onDelete, onToggleStatus, onDuplicate, onView, editPermission, deletePermission }) => {
  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 text-gray-300" />;
    return (
      <ChevronDown
        className={`w-3 h-3 transition-transform ${sortDir === 'desc' ? 'rotate-180' : ''} ${
          sortField === field ? 'text-gold' : ''
        }`}
      />
    );
  };

  const getScope = (p) => {
    if (p.category_id) return 'Category';
    if (p.product_id) return 'Product';
    return 'Global';
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="grid" aria-label="Promotions table">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Name</th>
              <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Type</th>
              <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Discount</th>
              <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Rules</th>
              <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Scope</th>
              <th
                className="text-left px-4 py-3.5 font-semibold text-gray-600 cursor-pointer select-none whitespace-nowrap"
                onClick={() => onSort('priority')}
                role="columnheader"
                aria-sort={sortField === 'priority' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                <div className="flex items-center space-x-1">
                  <span>Priority</span>
                  <SortIcon field="priority" />
                </div>
              </th>
              <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Status</th>
              <th
                className="text-left px-4 py-3.5 font-semibold text-gray-600 cursor-pointer select-none whitespace-nowrap"
                onClick={() => onSort('start_date')}
                role="columnheader"
                aria-sort={sortField === 'start_date' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                <div className="flex items-center space-x-1">
                  <span>Start Date</span>
                  <SortIcon field="start_date" />
                </div>
              </th>
              <th
                className="text-left px-4 py-3.5 font-semibold text-gray-600 cursor-pointer select-none whitespace-nowrap"
                onClick={() => onSort('end_date')}
                role="columnheader"
                aria-sort={sortField === 'end_date' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                <div className="flex items-center space-x-1">
                  <span>End Date</span>
                  <SortIcon field="end_date" />
                </div>
              </th>
              <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Timeline</th>
              <th
                className="text-left px-4 py-3.5 font-semibold text-gray-600 cursor-pointer select-none whitespace-nowrap"
                onClick={() => onSort('created_at')}
                role="columnheader"
                aria-sort={sortField === 'created_at' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                <div className="flex items-center space-x-1">
                  <span>Created</span>
                  <SortIcon field="created_at" />
                </div>
              </th>
              <th className="text-right px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {promotions.length === 0 ? (
              <tr>
                <td colSpan={12}>
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                      <Calendar className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-sm font-medium text-gray-500 mb-1">No promotions found</p>
                    <p className="text-xs text-gray-400">Create your first promotion to get started</p>
                  </div>
                </td>
              </tr>
            ) : (
              promotions.map((p, index) => {
                const status = getPromotionStatus(p);
                const config = statusConfig[status];
                const timeIndicator = getTimeIndicator(p);
                return (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                    tabIndex={0}
                    role="row"
                    aria-label={`Promotion: ${p.name}`}
                  >
                    <td className="px-4 py-3">
                      <div className="min-w-0 max-w-[180px]">
                        <p className="font-medium text-gray-900 truncate">{p.name}</p>
                        {p.badge_text && (
                          <p className="text-xs text-gray-400 truncate">{p.badge_text}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-purple-50 text-purple-600 whitespace-nowrap">
                        {p.promotion_type === 'PERCENTAGE' ? 'Percentage' : 'Fixed Amount'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-semibold text-gray-900">
                        {p.promotion_type === 'PERCENTAGE' ? `${p.discount_value}%` : `\u20B9${p.discount_value}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                        p.rules?.length ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-400'
                      }`}>
                        {p.rules?.length || 0} rule{(p.rules?.length || 0) !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                          getScope(p) === 'Global'
                            ? 'bg-gray-50 text-gray-600'
                            : getScope(p) === 'Category'
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-amber-50 text-amber-600'
                        }`}
                      >
                        {getScope(p)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.priority}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-medium whitespace-nowrap ${config.styles}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
                        {config.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                      {formatDate(p.start_date)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                      {formatDate(p.end_date)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs">
                      {timeIndicator ? (
                        <span className={`inline-flex items-center gap-1 ${
                          status === 'running' ? 'text-green-600' : status === 'scheduled' ? 'text-blue-600' : 'text-gray-400'
                        }`}>
                          <Clock className="w-3 h-3" />
                          {timeIndicator}
                        </span>
                      ) : (
                        <span className="text-gray-300">\u2014</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                      {formatDate(p.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => onView(p)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                          title="View"
                          aria-label={`View ${p.name}`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {editPermission && (
                          <button
                            onClick={() => onEdit(p.id)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Edit"
                            aria-label={`Edit ${p.name}`}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        {editPermission && (
                          <button
                            onClick={() => onDuplicate(p)}
                            className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                            title="Duplicate"
                            aria-label={`Duplicate ${p.name}`}
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        )}
                        {editPermission && (
                          <button
                            onClick={() => onToggleStatus(p.id, !p.is_active)}
                            className={`p-2 rounded-lg transition-all ${
                              p.is_active
                                ? 'text-green-500 hover:text-green-600 hover:bg-green-50'
                                : 'text-gray-400 hover:text-gray-500 hover:bg-gray-50'
                            }`}
                            title={p.is_active ? 'Disable' : 'Enable'}
                            aria-label={p.is_active ? `Disable ${p.name}` : `Enable ${p.name}`}
                          >
                            {p.is_active ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          </button>
                        )}
                        {deletePermission && (
                          <button
                            onClick={() => onDelete(p)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete"
                            aria-label={`Delete ${p.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PromotionTable;
