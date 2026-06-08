import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminCouponAPI } from '../../api/endpoints';
import {
  Plus, Edit3, Trash2, AlertTriangle, X, Save,
  CheckCircle, Loader2, Tag,
} from 'lucide-react';

const emptyForm = {
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: '',
  minimum_order_value: 0,
  maximum_discount: '',
  max_usage: '',
  start_date: '',
  end_date: '',
  is_active: true,
};

const Coupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchCoupons = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminCouponAPI.getCoupons();
      setCoupons(res.data);
    } catch {
      setError('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  };

  const openEdit = (coupon) => {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      description: coupon.description || '',
      discount_type: coupon.discount_type,
      discount_value: String(coupon.discount_value),
      minimum_order_value: coupon.minimum_order_value,
      maximum_discount: coupon.maximum_discount ? String(coupon.maximum_discount) : '',
      max_usage: coupon.max_usage ? String(coupon.max_usage) : '',
      start_date: coupon.start_date ? coupon.start_date.slice(0, 16) : '',
      end_date: coupon.end_date ? coupon.end_date.slice(0, 16) : '',
      is_active: coupon.is_active,
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.code.trim()) { setError('Coupon code is required'); return; }
    if (!form.discount_value || Number(form.discount_value) <= 0) { setError('Discount value must be > 0'); return; }
    if (!form.start_date || !form.end_date) { setError('Start and end dates are required'); return; }

    try {
      setSaving(true);
      setError('');
      const payload = {
        code: form.code.trim().toUpperCase(),
        description: form.description.trim() || null,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        minimum_order_value: Number(form.minimum_order_value) || 0,
        maximum_discount: form.maximum_discount ? Number(form.maximum_discount) : null,
        max_usage: form.max_usage ? Number(form.max_usage) : null,
        start_date: new Date(form.start_date).toISOString(),
        end_date: new Date(form.end_date).toISOString(),
        is_active: form.is_active,
      };

      if (editingId) {
        await adminCouponAPI.updateCoupon(editingId, payload);
        showToast('Coupon updated successfully');
      } else {
        await adminCouponAPI.createCoupon(payload);
        showToast('Coupon created successfully');
      }

      setShowModal(false);
      await fetchCoupons();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(Array.isArray(detail) ? detail.map((e) => e.msg).join(', ') : (detail || 'Failed to save coupon'));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (id) => setDeleteId(id);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await adminCouponAPI.deleteCoupon(deleteId);
      setDeleteId(null);
      showToast('Coupon deleted');
      await fetchCoupons();
    } catch {
      showToast('Failed to delete coupon', 'error');
    }
  };

  const now = new Date();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Coupons</h1>
          <p className="text-text-muted text-sm mt-1">Manage discount coupons and promos</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-white rounded-lg hover:bg-gold-dark transition-colors">
          <Plus size={18} />
          <span className="hidden sm:inline">Add Coupon</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2 text-sm">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm shadow-lg ${
            toast.type === 'error' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'
          }`}
        >
          {toast.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
          {toast.message}
        </motion.div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" /></div>
        ) : coupons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-text-muted">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold/10 to-amber-50 flex items-center justify-center mb-4">
              <Tag size={32} className="text-gold/40" />
            </div>
            <p className="text-lg font-semibold text-text mb-1">No coupons yet</p>
            <p className="text-sm mb-6">Create your first discount coupon</p>
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-white rounded-lg hover:bg-gold-dark text-sm font-medium transition-colors">
              <Plus size={16} /> Add Coupon
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-[#FFFCF7]">
                <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Code</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Discount</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Min Order</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Usage</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {coupons.map((coupon) => {
                const expired = new Date(coupon.end_date) < now;
                return (
                  <motion.tr key={coupon.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="hover:bg-[#FFFCF7]">
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gold/5 text-gold font-mono text-sm font-bold rounded-lg">{coupon.code}</span>
                      {coupon.description && <p className="text-xs text-text-muted mt-0.5">{coupon.description}</p>}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm font-semibold text-text">
                        {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `₹${coupon.discount_value}`}
                        {coupon.maximum_discount && <span className="text-xs text-text-muted font-normal"> (max ₹{coupon.maximum_discount})</span>}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-text-muted">
                      {coupon.minimum_order_value > 0 ? `₹${coupon.minimum_order_value}` : 'None'}
                    </td>
                    <td className="py-3 px-4 text-sm text-text-muted">
                      {coupon.usage_count}{coupon.max_usage ? ` / ${coupon.max_usage}` : ''}
                    </td>
                    <td className="py-3 px-4">
                      {expired ? (
                        <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Expired</span>
                      ) : coupon.is_active ? (
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Active</span>
                      ) : (
                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Inactive</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(coupon)} className="p-2 text-text-muted hover:text-gold hover:bg-gold/5 rounded-lg transition-colors" title="Edit"><Edit3 size={16} /></button>
                        <button onClick={() => confirmDelete(coupon.id)} className="p-2 text-text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => { if (!saving) setShowModal(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
                <h2 className="text-lg font-semibold text-text">{editingId ? 'Edit Coupon' : 'Add Coupon'}</h2>
                <button onClick={() => { if (!saving) setShowModal(false); }} className="p-1 text-text-muted hover:text-text rounded-lg hover:bg-gray-100 transition-colors"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">Coupon Code <span className="text-red-500">*</span></label>
                  <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SAVE20" className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold font-mono uppercase" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">Description</label>
                  <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="20% off on all orders" className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text mb-1.5">Discount Type</label>
                    <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold">
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-1.5">Discount Value <span className="text-red-500">*</span></label>
                    <input type="number" min="1" step="0.01" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} placeholder={form.discount_type === 'percentage' ? '20' : '100'} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text mb-1.5">Min Order Value</label>
                    <input type="number" min="0" value={form.minimum_order_value} onChange={(e) => setForm({ ...form, minimum_order_value: Number(e.target.value) })} placeholder="499" className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-1.5">Max Discount</label>
                    <input type="number" min="0" value={form.maximum_discount} onChange={(e) => setForm({ ...form, maximum_discount: e.target.value })} placeholder="500" className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">Max Usage (leave empty for unlimited)</label>
                  <input type="number" min="1" value={form.max_usage} onChange={(e) => setForm({ ...form, max_usage: e.target.value })} placeholder="100" className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text mb-1.5">Start Date <span className="text-red-500">*</span></label>
                    <input type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-1.5">End Date <span className="text-red-500">*</span></label>
                    <input type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold" />
                  </div>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 text-gold focus:ring-gold/30 border-border rounded" />
                  <span className="text-sm font-medium text-text">Active</span>
                </label>
              </div>
              <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-[#FFFCF7] shrink-0">
                <button onClick={() => setShowModal(false)} disabled={saving} className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text transition-colors disabled:opacity-50">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-gold text-white rounded-lg hover:bg-gold-dark text-sm font-medium transition-colors disabled:opacity-50">
                  {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> {editingId ? 'Update' : 'Create'}</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDeleteId(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-50 rounded-full"><AlertTriangle size={20} className="text-red-600" /></div>
                <h3 className="text-lg font-semibold text-text">Delete Coupon</h3>
              </div>
              <p className="text-sm text-text-muted mb-6">Are you sure you want to delete this coupon? This action cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text transition-colors">Cancel</button>
                <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Coupons;
