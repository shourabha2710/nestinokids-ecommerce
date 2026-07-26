import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import couponService from '../../services/couponService';
import { ArrowLeft, Save, Loader2, AlertTriangle, Tag } from 'lucide-react';

const emptyForm = {
  code: '',
  name: '',
  description: '',
  discount_type: 'percentage',
  discount_value: '',
  minimum_order_value: '',
  maximum_discount: '',
  max_usage: '',
  per_user_limit: '',
  applicable_scope: 'GLOBAL',
  priority: 0,
  category_id: '',
  product_id: '',
  start_date: '',
  end_date: '',
  is_active: true,
};

const validateForm = (form) => {
  const errors = {};
  if (!form.code.trim()) errors.code = 'Coupon code is required';
  if (!form.discount_value || Number(form.discount_value) <= 0) errors.discount_value = 'Discount value must be > 0';
  if (form.discount_type === 'percentage' && Number(form.discount_value) > 100) errors.discount_value = 'Percentage cannot exceed 100';
  if (!form.start_date) errors.start_date = 'Start date is required';
  if (!form.end_date) errors.end_date = 'End date is required';
  if (form.start_date && form.end_date && new Date(form.end_date) < new Date(form.start_date)) errors.end_date = 'End date must be after start date';
  return errors;
};

const AdminCouponForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEditing = Boolean(id);
  const duplicate = location.state?.duplicate;

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (duplicate) {
      setForm({
        code: '',
        name: duplicate.name || '',
        description: duplicate.description || '',
        discount_type: duplicate.discount_type,
        discount_value: String(duplicate.discount_value),
        minimum_order_value: String(duplicate.minimum_order_value || ''),
        maximum_discount: duplicate.maximum_discount ? String(duplicate.maximum_discount) : '',
        max_usage: duplicate.max_usage ? String(duplicate.max_usage) : '',
        per_user_limit: duplicate.per_user_limit ? String(duplicate.per_user_limit) : '',
        applicable_scope: duplicate.applicable_scope || 'GLOBAL',
        priority: duplicate.priority || 0,
        category_id: duplicate.category_id ? String(duplicate.category_id) : '',
        product_id: duplicate.product_id ? String(duplicate.product_id) : '',
        start_date: '',
        end_date: '',
        is_active: true,
      });
    } else if (id) {
      (async () => {
        try {
          const res = await couponService.getCoupon(id);
          const c = res.data;
          setForm({
            code: c.code,
            name: c.name || '',
            description: c.description || '',
            discount_type: c.discount_type,
            discount_value: String(c.discount_value),
            minimum_order_value: String(c.minimum_order_value || ''),
            maximum_discount: c.maximum_discount ? String(c.maximum_discount) : '',
            max_usage: c.max_usage ? String(c.max_usage) : '',
            per_user_limit: c.per_user_limit ? String(c.per_user_limit) : '',
            applicable_scope: c.applicable_scope || 'GLOBAL',
            priority: c.priority || 0,
            category_id: c.category_id ? String(c.category_id) : '',
            product_id: c.product_id ? String(c.product_id) : '',
            start_date: c.start_date ? c.start_date.slice(0, 16) : '',
            end_date: c.end_date ? c.end_date.slice(0, 16) : '',
            is_active: c.is_active,
          });
        } catch {
          setToast({ message: 'Failed to load coupon', type: 'error' });
        } finally {
          setFetching(false);
        }
      })();
    }
  }, [id, duplicate]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setLoading(true);
      setErrors({});
      const payload = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim() || null,
        description: form.description.trim() || null,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        minimum_order_value: Number(form.minimum_order_value) || 0,
        maximum_discount: form.maximum_discount ? Number(form.maximum_discount) : null,
        max_usage: form.max_usage ? Number(form.max_usage) : null,
        per_user_limit: form.per_user_limit ? Number(form.per_user_limit) : null,
        applicable_scope: form.applicable_scope,
        priority: Number(form.priority) || 0,
        category_id: form.category_id ? Number(form.category_id) : null,
        product_id: form.product_id ? Number(form.product_id) : null,
        start_date: new Date(form.start_date).toISOString(),
        end_date: new Date(form.end_date).toISOString(),
        is_active: form.is_active,
      };

      if (isEditing) {
        await couponService.updateCoupon(id, payload);
        setToast({ message: 'Coupon updated successfully', type: 'success' });
      } else {
        const res = await couponService.createCoupon(payload);
        setToast({ message: 'Coupon created successfully', type: 'success' });
        setTimeout(() => navigate(`/coupons/${res.data.id}/edit`), 500);
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      setErrors({ submit: Array.isArray(detail) ? detail.map((e) => e.msg).join(', ') : (detail || 'Failed to save coupon') });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => navigate('/coupons')} className="inline-flex items-center space-x-1.5 text-sm text-gray-500 hover:text-gray-700 mb-1 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Coupons</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{isEditing ? 'Edit Coupon' : 'Create Coupon'}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/coupons')} className="px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all text-sm">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading} className="inline-flex items-center space-x-2 bg-gray-900 text-white px-5 py-2 rounded-xl font-medium hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all text-sm">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isEditing ? 'Update' : 'Create'}</span>
          </button>
        </div>
      </div>

      {errors.submit && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {errors.submit}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Coupon Code <span className="text-red-500">*</span></label>
                <input type="text" value={form.code} onChange={(e) => handleChange('code', e.target.value.toUpperCase())} placeholder="SAVE20" className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all font-mono uppercase ${errors.code ? 'border-red-300' : 'border-gray-200'}`} />
                {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
                <input type="text" value={form.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="Summer Sale" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <input type="text" value={form.description} onChange={(e) => handleChange('description', e.target.value)} placeholder="20% off on all orders" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Discount Settings</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
                <select value={form.discount_type} onChange={(e) => handleChange('discount_type', e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 transition-all">
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Value <span className="text-red-500">*</span></label>
                <input type="number" min="0" step="0.01" value={form.discount_value} onChange={(e) => handleChange('discount_value', e.target.value)} placeholder={form.discount_type === 'percentage' ? '20' : '100'} className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 transition-all ${errors.discount_value ? 'border-red-300' : 'border-gray-200'}`} />
                {errors.discount_value && <p className="text-xs text-red-500 mt-1">{errors.discount_value}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Max Discount</label>
                <input type="number" min="0" value={form.maximum_discount} onChange={(e) => handleChange('maximum_discount', e.target.value)} placeholder="500" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 transition-all" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Min Order Value</label>
                <input type="number" min="0" value={form.minimum_order_value} onChange={(e) => handleChange('minimum_order_value', e.target.value)} placeholder="499" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Max Usage</label>
                <input type="number" min="1" value={form.max_usage} onChange={(e) => handleChange('max_usage', e.target.value)} placeholder="Unlimited" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Per User Limit</label>
                <input type="number" min="1" value={form.per_user_limit} onChange={(e) => handleChange('per_user_limit', e.target.value)} placeholder="Unlimited" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 transition-all" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Scope & Schedule</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Applicable Scope</label>
                <select value={form.applicable_scope} onChange={(e) => handleChange('applicable_scope', e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 transition-all">
                  <option value="GLOBAL">Global</option>
                  <option value="CATEGORY">Category</option>
                  <option value="PRODUCT">Product</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
                <input type="number" min="0" value={form.priority} onChange={(e) => handleChange('priority', e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 transition-all" />
              </div>
              <div />
            </div>
            {form.applicable_scope === 'CATEGORY' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Category ID</label>
                <input type="number" min="1" value={form.category_id} onChange={(e) => handleChange('category_id', e.target.value)} placeholder="Category ID" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 transition-all" />
              </div>
            )}
            {form.applicable_scope === 'PRODUCT' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Product ID</label>
                <input type="number" min="1" value={form.product_id} onChange={(e) => handleChange('product_id', e.target.value)} placeholder="Product ID" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 transition-all" />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date <span className="text-red-500">*</span></label>
                <input type="datetime-local" value={form.start_date} onChange={(e) => handleChange('start_date', e.target.value)} className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 transition-all ${errors.start_date ? 'border-red-300' : 'border-gray-200'}`} />
                {errors.start_date && <p className="text-xs text-red-500 mt-1">{errors.start_date}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date <span className="text-red-500">*</span></label>
                <input type="datetime-local" value={form.end_date} onChange={(e) => handleChange('end_date', e.target.value)} className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 transition-all ${errors.end_date ? 'border-red-300' : 'border-gray-200'}`} />
                {errors.end_date && <p className="text-xs text-red-500 mt-1">{errors.end_date}</p>}
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={(e) => handleChange('is_active', e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-gold focus:ring-gold/40" />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AdminCouponForm;
