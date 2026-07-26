import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CheckCircle, AlertTriangle, Eye, Calendar, Clock, TrendingUp, Package } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { Permissions } from '../../constants/permissions';
import promotionService from '../../services/promotionService';
import PromotionTable from '../../components/promotions/PromotionTable';
import PromotionFilters from '../../components/promotions/PromotionFilters';
import PromotionDeleteDialog from '../../components/promotions/PromotionDeleteDialog';

const STORAGE_KEY = 'promotionFilters';

const getPromotionStatus = (p) => {
  const now = new Date();
  const start = new Date(p.start_date);
  const end = new Date(p.end_date);
  if (!p.is_active) return 'inactive';
  if (now < start) return 'scheduled';
  if (now > end) return 'expired';
  return 'running';
};

const loadFilters = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const saveFilters = (filters) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // localStorage may be unavailable
  }
};

const AdminPromotionList = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();

  const saved = useMemo(() => loadFilters(), []);

  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const [searchQuery, setSearchQuery] = useState(saved?.searchQuery || '');
  const [statusFilter, setStatusFilter] = useState(saved?.statusFilter || 'all');
  const [typeFilter, setTypeFilter] = useState(saved?.typeFilter || 'all');
  const [scopeFilter, setScopeFilter] = useState(saved?.scopeFilter || 'all');
  const [sortField, setSortField] = useState(saved?.sortField || 'priority');
  const [sortDir, setSortDir] = useState(saved?.sortDir || 'desc');

  const [deletePromotion, setDeletePromotion] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [viewPromotion, setViewPromotion] = useState(null);

  useEffect(() => {
    saveFilters({ searchQuery, statusFilter, typeFilter, scopeFilter, sortField, sortDir });
  }, [searchQuery, statusFilter, typeFilter, scopeFilter, sortField, sortDir]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchPromotions = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await promotionService.getPromotions({ limit: 100 });
      setPromotions(res.data.items || res.data);
    } catch (err) {
      setError('Failed to load promotions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  const filteredPromotions = useMemo(() => {
    let result = [...promotions];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          (p.banner_text && p.banner_text.toLowerCase().includes(q)) ||
          (p.badge_text && p.badge_text.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((p) => getPromotionStatus(p) === statusFilter);
    }

    if (typeFilter !== 'all') {
      result = result.filter((p) => p.promotion_type === typeFilter);
    }

    if (scopeFilter !== 'all') {
      result = result.filter((p) => {
        if (scopeFilter === 'global') return !p.category_id && !p.product_id;
        if (scopeFilter === 'category') return !!p.category_id;
        if (scopeFilter === 'product') return !!p.product_id;
        return true;
      });
    }

    result.sort((a, b) => {
      let aVal, bVal;
      if (sortField === 'priority') {
        aVal = Number(a[sortField]) || 0;
        bVal = Number(b[sortField]) || 0;
      } else if (sortField === 'start_date' || sortField === 'end_date' || sortField === 'created_at') {
        aVal = new Date(a[sortField] || 0).getTime();
        bVal = new Date(b[sortField] || 0).getTime();
      } else {
        aVal = String(a[sortField] || '').toLowerCase();
        bVal = String(b[sortField] || '').toLowerCase();
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [searchQuery, promotions, sortField, sortDir, statusFilter, typeFilter, scopeFilter]);

  const stats = useMemo(() => {
    const counts = { total: promotions.length, running: 0, scheduled: 0, expired: 0, inactive: 0 };
    promotions.forEach((p) => {
      counts[getPromotionStatus(p)]++;
    });
    return counts;
  }, [promotions]);

  const handleSort = useCallback((field) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir('desc');
      return field;
    });
  }, []);

  const handleToggleStatus = useCallback(async (id, isActive) => {
    try {
      await promotionService.updatePromotion(id, { is_active: isActive });
      setPromotions((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_active: isActive } : p))
      );
      showToast('Promotion status updated');
    } catch (err) {
      const detail = err.response?.data?.detail;
      showToast(detail || 'Failed to update status', 'error');
    }
  }, [showToast]);

  const handleDelete = useCallback(async () => {
    if (!deletePromotion) return;
    setDeleting(true);
    try {
      await promotionService.deletePromotion(deletePromotion.id);
      setDeletePromotion(null);
      showToast('Promotion deleted successfully');
      fetchPromotions();
    } catch (err) {
      const detail = err.response?.data?.detail;
      showToast(detail || 'Failed to delete promotion', 'error');
    } finally {
      setDeleting(false);
    }
  }, [deletePromotion, fetchPromotions, showToast]);

  const handleDuplicate = useCallback((p) => {
    navigate('/promotions/new', {
      state: {
        duplicate: {
          name: `${p.name} (Copy)`,
          description: p.description,
          promotion_type: p.promotion_type,
          discount_value: p.discount_value,
          minimum_order_amount: p.minimum_order_amount,
          maximum_discount_amount: p.maximum_discount_amount,
          priority: p.priority,
          is_stackable: p.is_stackable,
          is_active: false,
          start_date: p.start_date,
          end_date: p.end_date,
          banner_text: p.banner_text,
          badge_text: p.badge_text,
          category_id: p.category_id,
          product_id: p.product_id,
        },
      },
    });
  }, [navigate]);

  const handleView = useCallback((p) => {
    setViewPromotion(p);
  }, []);

  const summaryCards = [
    { key: 'total', label: 'Total Promotions', icon: Package, color: 'bg-violet-500', textColor: 'text-violet-600', bgColor: 'bg-violet-50' },
    { key: 'running', label: 'Running', icon: TrendingUp, color: 'bg-green-500', textColor: 'text-green-600', bgColor: 'bg-green-50' },
    { key: 'scheduled', label: 'Scheduled', icon: Clock, color: 'bg-blue-500', textColor: 'text-blue-600', bgColor: 'bg-blue-50' },
    { key: 'expired', label: 'Expired', icon: Calendar, color: 'bg-gray-400', textColor: 'text-gray-500', bgColor: 'bg-gray-100' },
    { key: 'inactive', label: 'Inactive', icon: AlertTriangle, color: 'bg-red-400', textColor: 'text-red-500', bgColor: 'bg-red-50' },
  ];

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Promotions</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your promotional campaigns</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-gray-100" />
              </div>
              <div className="h-8 w-16 bg-gray-100 rounded mb-2" />
              <div className="h-4 w-24 bg-gray-50 rounded" />
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="h-10 bg-gray-100 rounded-xl animate-pulse w-full sm:w-64" />
          <div className="h-10 bg-gray-100 rounded-xl animate-pulse w-24" />
          <div className="h-10 bg-gray-100 rounded-xl animate-pulse w-24" />
          <div className="h-10 bg-gray-100 rounded-xl animate-pulse w-24" />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-50 rounded-xl mb-3 last:mb-0" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promotions</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your promotional campaigns</p>
        </div>
        {hasPermission(Permissions.PROMOTION_CREATE) && (
          <button
            onClick={() => navigate('/promotions/new')}
            className="inline-flex items-center justify-center space-x-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-gray-800 transition-all text-sm w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Promotion</span>
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.key} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:border-gray-200 transition-all duration-200">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl ${card.bgColor} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${card.textColor}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats[card.key]}</p>
              <p className="text-sm text-gray-500 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm flex items-center space-x-2"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mb-4 px-4 py-3 rounded-xl text-sm flex items-center space-x-2 ${
              toast.type === 'error'
                ? 'bg-red-50 border border-red-200 text-red-600'
                : 'bg-green-50 border border-green-200 text-green-600'
            }`}
          >
            {toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <PromotionFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        scopeFilter={scopeFilter}
        onScopeFilterChange={setScopeFilter}
      />

      <PromotionTable
        promotions={filteredPromotions}
        sortField={sortField}
        sortDir={sortDir}
        onSort={handleSort}
        onEdit={(id) => navigate(`/promotions/${id}/edit`)}
        onDelete={setDeletePromotion}
        onToggleStatus={handleToggleStatus}
        onDuplicate={handleDuplicate}
        onView={handleView}
        editPermission={hasPermission(Permissions.PROMOTION_UPDATE)}
        deletePermission={hasPermission(Permissions.PROMOTION_DELETE)}
      />

      <PromotionDeleteDialog
        promotion={deletePromotion}
        onConfirm={handleDelete}
        onCancel={() => setDeletePromotion(null)}
        deleting={deleting}
      />

      {/* View Modal */}
      <AnimatePresence>
        {viewPromotion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 py-4"
            onClick={() => setViewPromotion(null)}
            role="dialog"
            aria-modal="true"
            aria-label={`View ${viewPromotion.name}`}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-auto max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{viewPromotion.name}</h2>
                    {viewPromotion.description && (
                      <p className="text-sm text-gray-500 mt-1">{viewPromotion.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setViewPromotion(null)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                    aria-label="Close"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Type</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">
                      {viewPromotion.promotion_type === 'PERCENTAGE' ? 'Percentage' : 'Fixed Amount'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Discount</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">
                      {viewPromotion.promotion_type === 'PERCENTAGE' ? `${viewPromotion.discount_value}%` : `\u20B9${viewPromotion.discount_value}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Start Date</p>
                    <p className="text-sm text-gray-900 mt-1">{new Date(viewPromotion.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">End Date</p>
                    <p className="text-sm text-gray-900 mt-1">{new Date(viewPromotion.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  {viewPromotion.minimum_order_amount > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Min Order</p>
                      <p className="text-sm text-gray-900 mt-1">{`\u20B9${viewPromotion.minimum_order_amount}`}</p>
                    </div>
                  )}
                  {viewPromotion.maximum_discount_amount && (
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Max Discount</p>
                      <p className="text-sm text-gray-900 mt-1">{`\u20B9${viewPromotion.maximum_discount_amount}`}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Priority</p>
                    <p className="text-sm text-gray-900 mt-1">{viewPromotion.priority}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Stackable</p>
                    <p className="text-sm text-gray-900 mt-1">{viewPromotion.is_stackable ? 'Yes' : 'No'}</p>
                  </div>
                </div>
                {viewPromotion.banner_text && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Banner Text</p>
                    <p className="text-sm text-gray-900 mt-1">{viewPromotion.banner_text}</p>
                  </div>
                )}
                {viewPromotion.badge_text && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Badge Text</p>
                    <p className="text-sm text-gray-900 mt-1">{viewPromotion.badge_text}</p>
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                <button
                  onClick={() => setViewPromotion(null)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all text-sm"
                >
                  Close
                </button>
                {hasPermission(Permissions.PROMOTION_UPDATE) && (
                  <button
                    onClick={() => { setViewPromotion(null); navigate(`/promotions/${viewPromotion.id}/edit`); }}
                    className="px-4 py-2 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all text-sm"
                  >
                    Edit Promotion
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPromotionList;
