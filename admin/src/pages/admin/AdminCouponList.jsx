import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import couponService from '../../services/couponService';
import CouponTable from '../../components/coupons/CouponTable';
import CouponFilters from '../../components/coupons/CouponFilters';
import CouponDeleteDialog from '../../components/coupons/CouponDeleteDialog';
import { usePermissions } from '../../hooks/usePermissions';
import { Permissions } from '../../constants/permissions';
import { Plus, Tag, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

const STORAGE_KEY = 'admin_coupon_filters';

const AdminCouponList = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [deleteCoupon, setDeleteCoupon] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [viewCoupon, setViewCoupon] = useState(null);

  const [searchQuery, setSearchQuery] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY))?.searchQuery || ''; } catch { return ''; }
  });
  const [statusFilter, setStatusFilter] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY))?.statusFilter || 'all'; } catch { return 'all'; }
  });
  const [scopeFilter, setScopeFilter] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY))?.scopeFilter || 'all'; } catch { return 'all'; }
  });
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ searchQuery, statusFilter, scopeFilter }));
  }, [searchQuery, statusFilter, scopeFilter]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchCoupons = useCallback(async () => {
    try {
      setLoading(true);
      const res = await couponService.getCoupons({ limit: 100 });
      const data = res.data.items || res.data;
      setCoupons(Array.isArray(data) ? data : []);
    } catch {
      showToast('Failed to load coupons', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  const now = new Date();

  const filtered = useMemo(() => {
    let result = [...coupons];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) => c.code.toLowerCase().includes(q) || (c.name && c.name.toLowerCase().includes(q)) || (c.description && c.description.toLowerCase().includes(q))
      );
    }

    if (statusFilter === 'active') result = result.filter((c) => c.is_active && new Date(c.end_date) >= now);
    else if (statusFilter === 'inactive') result = result.filter((c) => !c.is_active);
    else if (statusFilter === 'expired') result = result.filter((c) => new Date(c.end_date) < now);

    if (scopeFilter !== 'all') result = result.filter((c) => c.applicable_scope === scopeFilter);

    result.sort((a, b) => {
      let valA = a[sortField], valB = b[sortField];
      if (sortField === 'code') { valA = valA?.toLowerCase(); valB = valB?.toLowerCase(); }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [coupons, searchQuery, statusFilter, scopeFilter, sortField, sortDir, now]);

  const stats = useMemo(() => {
    const total = coupons.length;
    const active = coupons.filter((c) => c.is_active && new Date(c.end_date) >= now).length;
    const expired = coupons.filter((c) => new Date(c.end_date) < now).length;
    const inactive = coupons.filter((c) => !c.is_active && new Date(c.end_date) >= now).length;
    return { total, active, expired, inactive };
  }, [coupons, now]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const handleToggleStatus = async (coupon) => {
    try {
      await couponService.toggleStatus(coupon.id);
      showToast(`Coupon ${coupon.is_active ? 'deactivated' : 'activated'}`);
      await fetchCoupons();
    } catch {
      showToast('Failed to toggle status', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteCoupon) return;
    try {
      setDeleting(true);
      await couponService.deleteCoupon(deleteCoupon.id);
      setDeleteCoupon(null);
      showToast('Coupon deleted');
      await fetchCoupons();
    } catch {
      showToast('Failed to delete coupon', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleDuplicate = (coupon) => {
    navigate('/coupons/new', { state: { duplicate: coupon } });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
          <p className="text-gray-500 text-sm mt-1">Manage discount coupons</p>
        </div>
        {hasPermission(Permissions.COUPON_CREATE) && (
          <button
            onClick={() => navigate('/coupons/new')}
            className="inline-flex items-center justify-center space-x-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-gray-800 transition-all text-sm w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Coupon</span>
          </button>
        )}
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`mb-4 p-3 rounded-xl flex items-center gap-2 text-sm ${
              toast.type === 'error' ? 'bg-red-50 border border-red-200 text-red-600' : 'bg-green-50 border border-green-200 text-green-600'
            }`}
          >
            {toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'text-gray-900' },
          { label: 'Active', value: stats.active, color: 'text-green-600' },
          { label: 'Inactive', value: stats.inactive, color: 'text-gray-500' },
          { label: 'Expired', value: stats.expired, color: 'text-red-500' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <CouponFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            scopeFilter={scopeFilter}
            onScopeFilterChange={setScopeFilter}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <CouponTable
            coupons={filtered}
            sortField={sortField}
            sortDir={sortDir}
            onSort={handleSort}
            onEdit={(c) => navigate(`/coupons/${c.id}/edit`)}
            onDelete={setDeleteCoupon}
            onToggleStatus={handleToggleStatus}
            onDuplicate={handleDuplicate}
            onView={setViewCoupon}
          />
        )}
      </div>

      <CouponDeleteDialog
        coupon={deleteCoupon}
        onConfirm={handleDelete}
        onCancel={() => setDeleteCoupon(null)}
        deleting={deleting}
      />

      <AnimatePresence>
        {viewCoupon && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setViewCoupon(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900">Coupon Details</h2>
                <button onClick={() => setViewCoupon(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Tag className="w-5 h-5 text-gold" />
                  <span className="font-mono font-bold text-lg">{viewCoupon.code}</span>
                </div>
                {viewCoupon.name && <p className="text-gray-600">{viewCoupon.name}</p>}
                {viewCoupon.description && <p className="text-sm text-gray-400">{viewCoupon.description}</p>}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-400">Type:</span> <span className="font-medium">{viewCoupon.discount_type}</span></div>
                  <div><span className="text-gray-400">Value:</span> <span className="font-medium">{viewCoupon.discount_type === 'percentage' ? `${viewCoupon.discount_value}%` : `₹${viewCoupon.discount_value}`}</span></div>
                  <div><span className="text-gray-400">Min Order:</span> <span className="font-medium">₹{viewCoupon.minimum_order_value || 0}</span></div>
                  <div><span className="text-gray-400">Max Discount:</span> <span className="font-medium">{viewCoupon.maximum_discount ? `₹${viewCoupon.maximum_discount}` : 'None'}</span></div>
                  <div><span className="text-gray-400">Scope:</span> <span className="font-medium">{viewCoupon.applicable_scope}</span></div>
                  <div><span className="text-gray-400">Priority:</span> <span className="font-medium">{viewCoupon.priority}</span></div>
                  <div><span className="text-gray-400">Usage:</span> <span className="font-medium">{viewCoupon.usage_count}{viewCoupon.max_usage ? ` / ${viewCoupon.max_usage}` : ''}</span></div>
                  <div><span className="text-gray-400">Per User:</span> <span className="font-medium">{viewCoupon.per_user_limit || 'Unlimited'}</span></div>
                  <div><span className="text-gray-400">Start:</span> <span className="font-medium">{new Date(viewCoupon.start_date).toLocaleDateString()}</span></div>
                  <div><span className="text-gray-400">End:</span> <span className="font-medium">{new Date(viewCoupon.end_date).toLocaleDateString()}</span></div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button onClick={() => setViewCoupon(null)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Close</button>
                <button onClick={() => { setViewCoupon(null); navigate(`/coupons/${viewCoupon.id}/edit`); }} className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800">Edit</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminCouponList;
