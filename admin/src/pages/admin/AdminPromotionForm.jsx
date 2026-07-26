import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Save, AlertTriangle, Plus, Trash2, GripVertical } from 'lucide-react';
import promotionService from '../../services/promotionService';
import { validatePromotionForm } from '../../utils/PromotionFormValidation';

const RULE_TYPES = [
  { value: 'MINIMUM_CART_VALUE', label: 'Minimum Cart Value' },
  { value: 'BUY_X_GET_Y', label: 'Buy X Get Y' },
  { value: 'QUANTITY_BASED', label: 'Quantity Based' },
  { value: 'CATEGORY_BASED', label: 'Category Based' },
  { value: 'PRODUCT_BASED', label: 'Product Based' },
  { value: 'FREE_SHIPPING', label: 'Free Shipping' },
];

const emptyRule = () => ({
  _key: Date.now() + Math.random(),
  rule_type: 'MINIMUM_CART_VALUE',
  minimum_cart_amount: '',
  minimum_quantity: '',
  buy_quantity: '',
  get_quantity: '',
  category_id: '',
  product_id: '',
  target_product_id: '',
  discount_type: '',
  discount_value: '',
  priority: '0',
  is_active: true,
});

const AdminPromotionForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isEditing = Boolean(id);
  const duplicateData = location.state?.duplicate;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [rules, setRules] = useState([]);

  const [form, setForm] = useState({
    name: '',
    description: '',
    promotion_type: 'PERCENTAGE',
    discount_value: '',
    minimum_order_amount: '',
    maximum_discount_amount: '',
    priority: '0',
    is_stackable: false,
    is_active: true,
    start_date: '',
    end_date: '',
    banner_text: '',
    badge_text: '',
    scope: 'global',
    category_id: '',
    product_id: '',
  });

  useEffect(() => {
    const loadData = async () => {
      // Clear duplicate state from navigation after reading
      if (duplicateData && location.state) {
        window.history.replaceState({}, document.title);
      }
      try {
        const catRes = await promotionService.getCategories({ limit: 100 });
        setCategories(catRes.data);
      } catch {
        // categories may not load
      }

      try {
        const prodRes = await promotionService.getProducts({ limit: 100 });
        setProducts(prodRes.data);
      } catch {
        // products may not load
      }

      if (duplicateData) {
        let scope = 'global';
        if (duplicateData.category_id) scope = 'category';
        if (duplicateData.product_id) scope = 'product';
        setForm({
          name: duplicateData.name || '',
          description: duplicateData.description || '',
          promotion_type: duplicateData.promotion_type || 'PERCENTAGE',
          discount_value: String(duplicateData.discount_value || ''),
          minimum_order_amount: duplicateData.minimum_order_amount ? String(duplicateData.minimum_order_amount) : '',
          maximum_discount_amount: duplicateData.maximum_discount_amount ? String(duplicateData.maximum_discount_amount) : '',
          priority: String(duplicateData.priority ?? 0),
          is_stackable: duplicateData.is_stackable || false,
          is_active: duplicateData.is_active ?? true,
          start_date: duplicateData.start_date ? new Date(duplicateData.start_date).toISOString().slice(0, 16) : '',
          end_date: duplicateData.end_date ? new Date(duplicateData.end_date).toISOString().slice(0, 16) : '',
          banner_text: duplicateData.banner_text || '',
          badge_text: duplicateData.badge_text || '',
          scope,
          category_id: duplicateData.category_id ? String(duplicateData.category_id) : '',
          product_id: duplicateData.product_id ? String(duplicateData.product_id) : '',
        });
        if (duplicateData.rules?.length) {
          setRules(duplicateData.rules.map((r) => ({
            ...r,
            _key: Date.now() + Math.random(),
            minimum_cart_amount: r.minimum_cart_amount != null ? String(r.minimum_cart_amount) : '',
            minimum_quantity: r.minimum_quantity != null ? String(r.minimum_quantity) : '',
            buy_quantity: r.buy_quantity != null ? String(r.buy_quantity) : '',
            get_quantity: r.get_quantity != null ? String(r.get_quantity) : '',
            category_id: r.category_id != null ? String(r.category_id) : '',
            product_id: r.product_id != null ? String(r.product_id) : '',
            target_product_id: r.target_product_id != null ? String(r.target_product_id) : '',
            discount_value: r.discount_value != null ? String(r.discount_value) : '',
            priority: String(r.priority ?? 0),
          })));
        }
        return;
      }

      if (isEditing) {
        try {
          const res = await promotionService.getPromotion(id);
          const p = res.data;
          let scope = 'global';
          if (p.category_id) scope = 'category';
          if (p.product_id) scope = 'product';

          setForm({
            name: p.name,
            description: p.description || '',
            promotion_type: p.promotion_type,
            discount_value: String(p.discount_value),
            minimum_order_amount: p.minimum_order_amount ? String(p.minimum_order_amount) : '',
            maximum_discount_amount: p.maximum_discount_amount ? String(p.maximum_discount_amount) : '',
            priority: String(p.priority),
            is_stackable: p.is_stackable,
            is_active: p.is_active,
            start_date: p.start_date ? new Date(p.start_date).toISOString().slice(0, 16) : '',
            end_date: p.end_date ? new Date(p.end_date).toISOString().slice(0, 16) : '',
            banner_text: p.banner_text || '',
            badge_text: p.badge_text || '',
            scope,
            category_id: p.category_id ? String(p.category_id) : '',
            product_id: p.product_id ? String(p.product_id) : '',
          });
          if (p.rules?.length) {
            setRules(p.rules.map((r) => ({
              ...r,
              _key: Date.now() + Math.random(),
              minimum_cart_amount: r.minimum_cart_amount != null ? String(r.minimum_cart_amount) : '',
              minimum_quantity: r.minimum_quantity != null ? String(r.minimum_quantity) : '',
              buy_quantity: r.buy_quantity != null ? String(r.buy_quantity) : '',
              get_quantity: r.get_quantity != null ? String(r.get_quantity) : '',
              category_id: r.category_id != null ? String(r.category_id) : '',
              product_id: r.product_id != null ? String(r.product_id) : '',
              target_product_id: r.target_product_id != null ? String(r.target_product_id) : '',
              discount_value: r.discount_value != null ? String(r.discount_value) : '',
              priority: String(r.priority ?? 0),
            })));
          }
        } catch (err) {
          setError('Failed to load promotion');
        }
      }
    };

    loadData().finally(() => setFetching(false));
  }, [id, isEditing, duplicateData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    if (error) setError('');
  };

  const handleRuleChange = (key, field, value) => {
    setRules((prev) =>
      prev.map((r) => (r._key === key ? { ...r, [field]: value } : r))
    );
  };

  const addRule = () => {
    setRules((prev) => [...prev, emptyRule()]);
  };

  const removeRule = (key) => {
    setRules((prev) => prev.filter((r) => r._key !== key));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validationErrors = validatePromotionForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        promotion_type: form.promotion_type,
        discount_value: Number(form.discount_value),
        minimum_order_amount: form.minimum_order_amount ? Number(form.minimum_order_amount) : 0,
        maximum_discount_amount: form.maximum_discount_amount ? Number(form.maximum_discount_amount) : null,
        priority: Number(form.priority) || 0,
        is_stackable: form.is_stackable,
        is_active: form.is_active,
        start_date: new Date(form.start_date).toISOString(),
        end_date: new Date(form.end_date).toISOString(),
        banner_text: form.banner_text.trim() || null,
        badge_text: form.badge_text.trim() || null,
        category_id: form.scope === 'category' && form.category_id ? Number(form.category_id) : null,
        product_id: form.scope === 'product' && form.product_id ? Number(form.product_id) : null,
        rules: rules.map((r) => ({
          rule_type: r.rule_type,
          minimum_cart_amount: r.rule_type === 'MINIMUM_CART_VALUE' || r.rule_type === 'FREE_SHIPPING' ? (r.minimum_cart_amount ? Number(r.minimum_cart_amount) : null) : null,
          minimum_quantity: r.rule_type === 'QUANTITY_BASED' ? (r.minimum_quantity ? Number(r.minimum_quantity) : null) : null,
          buy_quantity: r.rule_type === 'BUY_X_GET_Y' ? (r.buy_quantity ? Number(r.buy_quantity) : null) : null,
          get_quantity: r.rule_type === 'BUY_X_GET_Y' ? (r.get_quantity ? Number(r.get_quantity) : null) : null,
          category_id: r.rule_type === 'CATEGORY_BASED' && r.category_id ? Number(r.category_id) : null,
          product_id: (r.rule_type === 'PRODUCT_BASED' || r.rule_type === 'BUY_X_GET_Y') && r.product_id ? Number(r.product_id) : null,
          target_product_id: r.rule_type === 'BUY_X_GET_Y' && r.target_product_id ? Number(r.target_product_id) : null,
          discount_type: r.discount_type || null,
          discount_value: r.discount_value ? Number(r.discount_value) : null,
          priority: Number(r.priority) || 0,
          is_active: r.is_active,
        })),
      };

      if (isEditing) {
        await promotionService.updatePromotion(id, payload);
        navigate('/promotions');
      } else {
        const res = await promotionService.createPromotion(payload);
        navigate(`/promotions/${res.data.id}/edit`);
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map((d) => d.msg || d.message).join(', '));
      } else if (detail) {
        setError(detail);
      } else {
        setError(isEditing ? 'Failed to update promotion' : 'Failed to create promotion');
      }
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Promotion' : 'Add Promotion'}
          </h1>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <div className="h-10 bg-gray-50 rounded-xl" />
            </div>
            <div className="h-10 bg-gray-50 rounded-xl" />
            <div className="h-10 bg-gray-50 rounded-xl" />
            <div className="md:col-span-2">
              <div className="h-24 bg-gray-50 rounded-xl" />
            </div>
            <div className="h-10 bg-gray-50 rounded-xl" />
            <div className="h-10 bg-gray-50 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Action bar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0">
        <div className="flex-1 min-w-0">
          <button
            onClick={() => navigate('/promotions')}
            className="inline-flex items-center space-x-1.5 text-sm text-gray-500 hover:text-gray-700 mb-1 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Promotions</span>
          </button>
          <h1 className="text-xl font-bold text-gray-900 truncate">
            {isEditing ? 'Edit Promotion' : 'Add Promotion'}
          </h1>
        </div>
        <div className="flex items-center space-x-3 flex-shrink-0">
          <button
            type="button"
            onClick={() => navigate('/promotions')}
            className="px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="promotionForm"
            disabled={loading}
            className="inline-flex items-center space-x-2 bg-gray-900 text-white px-5 py-2 rounded-xl font-medium hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all text-sm"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving...' : isEditing ? 'Update Promotion' : 'Create Promotion'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <form id="promotionForm" onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Promotion Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm ${
                    errors.name ? 'border-red-300' : 'border-gray-200'
                  }`}
                  placeholder="e.g. Summer Sale 20% Off"
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm resize-y"
                  placeholder="Describe this promotion..."
                />
              </div>
            </div>
          </div>

          {/* Discount Settings */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Discount Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Promotion Type <span className="text-red-400">*</span>
                </label>
                <select
                  name="promotion_type"
                  value={form.promotion_type}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm ${
                    errors.promotion_type ? 'border-red-300' : 'border-gray-200'
                  }`}
                >
                  <option value="PERCENTAGE">Percentage</option>
                  <option value="FIXED_AMOUNT">Fixed Amount</option>
                </select>
                {errors.promotion_type && <p className="text-xs text-red-500 mt-1">{errors.promotion_type}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Discount Value <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="discount_value"
                    value={form.discount_value}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    max={form.promotion_type === 'PERCENTAGE' ? '100' : undefined}
                    className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm ${
                      errors.discount_value ? 'border-red-300' : 'border-gray-200'
                    }`}
                    placeholder={form.promotion_type === 'PERCENTAGE' ? '20' : '100'}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                    {form.promotion_type === 'PERCENTAGE' ? '%' : '₹'}
                  </span>
                </div>
                {errors.discount_value && <p className="text-xs text-red-500 mt-1">{errors.discount_value}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Minimum Order Amount</label>
                <input
                  type="number"
                  name="minimum_order_amount"
                  value={form.minimum_order_amount}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm ${
                    errors.minimum_order_amount ? 'border-red-300' : 'border-gray-200'
                  }`}
                  placeholder="0.00"
                />
                {errors.minimum_order_amount && <p className="text-xs text-red-500 mt-1">{errors.minimum_order_amount}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Maximum Discount Amount</label>
                <input
                  type="number"
                  name="maximum_discount_amount"
                  value={form.maximum_discount_amount}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm ${
                    errors.maximum_discount_amount ? 'border-red-300' : 'border-gray-200'
                  }`}
                  placeholder="0.00"
                />
                {errors.maximum_discount_amount && <p className="text-xs text-red-500 mt-1">{errors.maximum_discount_amount}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
                <input
                  type="number"
                  name="priority"
                  value={form.priority}
                  onChange={handleChange}
                  min="0"
                  className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm ${
                    errors.priority ? 'border-red-300' : 'border-gray-200'
                  }`}
                  placeholder="0"
                />
                {errors.priority && <p className="text-xs text-red-500 mt-1">{errors.priority}</p>}
              </div>

              <div className="flex flex-wrap items-end gap-4 sm:gap-6 pb-1">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_stackable"
                    checked={form.is_stackable}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-gray-300 text-gold focus:ring-gold/40"
                  />
                  <span className="text-sm font-medium text-gray-700">Stackable</span>
                </label>

                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={form.is_active}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-gray-300 text-gold focus:ring-gold/40"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>
            </div>
          </div>

          {/* Date Range */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Date Range</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Start Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="datetime-local"
                  name="start_date"
                  value={form.start_date}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm ${
                    errors.start_date ? 'border-red-300' : 'border-gray-200'
                  }`}
                />
                {errors.start_date && <p className="text-xs text-red-500 mt-1">{errors.start_date}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  End Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="datetime-local"
                  name="end_date"
                  value={form.end_date}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm ${
                    errors.end_date ? 'border-red-300' : 'border-gray-200'
                  }`}
                />
                {errors.end_date && <p className="text-xs text-red-500 mt-1">{errors.end_date}</p>}
              </div>
            </div>
          </div>

          {/* Promotion Scope */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Promotion Scope</h2>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    value="global"
                    checked={form.scope === 'global'}
                    onChange={handleChange}
                    className="w-4 h-4 text-gold focus:ring-gold/40 border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">Global</span>
                </label>
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    value="category"
                    checked={form.scope === 'category'}
                    onChange={handleChange}
                    className="w-4 h-4 text-gold focus:ring-gold/40 border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">Category</span>
                </label>
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    value="product"
                    checked={form.scope === 'product'}
                    onChange={handleChange}
                    className="w-4 h-4 text-gold focus:ring-gold/40 border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">Product</span>
                </label>
              </div>

              {form.scope === 'category' && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Category</label>
                  <select
                    name="category_id"
                    value={form.category_id}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm"
                  >
                    <option value="">Select a category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </motion.div>
              )}

              {form.scope === 'product' && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Product</label>
                  <select
                    name="product_id"
                    value={form.product_id}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm"
                  >
                    <option value="">Select a product</option>
                    {products.map((prod) => (
                      <option key={prod.id} value={prod.id}>{prod.name}</option>
                    ))}
                  </select>
                </motion.div>
              )}
            </div>
          </div>

          {/* Display Settings */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Display Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Banner Text</label>
                <input
                  type="text"
                  name="banner_text"
                  value={form.banner_text}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm"
                  placeholder="e.g. Get 20% off on all items!"
                  maxLength={500}
                />
                <p className="text-xs text-gray-400 mt-1">{form.banner_text.length}/500</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Badge Text</label>
                <input
                  type="text"
                  name="badge_text"
                  value={form.badge_text}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm"
                  placeholder="e.g. SALE"
                  maxLength={100}
                />
                <p className="text-xs text-gray-400 mt-1">{form.badge_text.length}/100</p>
              </div>
            </div>
          </div>

          {/* Promotion Rules */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Promotion Rules</h2>
                <p className="text-xs text-gray-500 mt-0.5">Define conditions that must be met for this promotion to apply. All rules must pass (AND logic).</p>
              </div>
              <button
                type="button"
                onClick={addRule}
                className="inline-flex items-center space-x-1.5 bg-gold text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gold/90 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Rule</span>
              </button>
            </div>

            {rules.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                <p>No rules added. This promotion will apply to all carts when active.</p>
                <p className="text-xs mt-1">Click "Add Rule" to set specific conditions.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {rules.map((rule, idx) => (
                    <motion.div
                      key={rule._key}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="border border-gray-200 rounded-xl p-4 bg-gray-50/50"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <GripVertical className="w-4 h-4 text-gray-300 mt-2 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-0.5 rounded">Rule {idx + 1}</span>
                            <label className="flex items-center space-x-1.5 cursor-pointer ml-auto">
                              <input
                                type="checkbox"
                                checked={rule.is_active}
                                onChange={(e) => handleRuleChange(rule._key, 'is_active', e.target.checked)}
                                className="w-3.5 h-3.5 rounded border-gray-300 text-gold focus:ring-gold/40"
                              />
                              <span className="text-xs text-gray-600">Active</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => removeRule(rule._key)}
                              className="text-gray-400 hover:text-red-500 transition-colors p-1"
                              aria-label="Remove rule"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {/* Rule Type */}
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Rule Type</label>
                              <select
                                value={rule.rule_type}
                                onChange={(e) => handleRuleChange(rule._key, 'rule_type', e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
                              >
                                {RULE_TYPES.map((rt) => (
                                  <option key={rt.value} value={rt.value}>{rt.label}</option>
                                ))}
                              </select>
                            </div>

                            {/* MINIMUM_CART_VALUE / FREE_SHIPPING fields */}
                            {(rule.rule_type === 'MINIMUM_CART_VALUE' || rule.rule_type === 'FREE_SHIPPING') && (
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Minimum Cart Amount</label>
                                <input
                                  type="number"
                                  value={rule.minimum_cart_amount}
                                  onChange={(e) => handleRuleChange(rule._key, 'minimum_cart_amount', e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
                                  placeholder="999"
                                  min="0"
                                  step="0.01"
                                />
                              </div>
                            )}

                            {/* QUANTITY_BASED fields */}
                            {rule.rule_type === 'QUANTITY_BASED' && (
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Minimum Quantity</label>
                                <input
                                  type="number"
                                  value={rule.minimum_quantity}
                                  onChange={(e) => handleRuleChange(rule._key, 'minimum_quantity', e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
                                  placeholder="5"
                                  min="1"
                                />
                              </div>
                            )}

                            {/* CATEGORY_BASED fields */}
                            {rule.rule_type === 'CATEGORY_BASED' && (
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                                <select
                                  value={rule.category_id}
                                  onChange={(e) => handleRuleChange(rule._key, 'category_id', e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
                                >
                                  <option value="">Select category</option>
                                  {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {/* PRODUCT_BASED fields */}
                            {rule.rule_type === 'PRODUCT_BASED' && (
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Product</label>
                                <select
                                  value={rule.product_id}
                                  onChange={(e) => handleRuleChange(rule._key, 'product_id', e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
                                >
                                  <option value="">Select product</option>
                                  {products.map((prod) => (
                                    <option key={prod.id} value={prod.id}>{prod.name}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {/* BUY_X_GET_Y fields */}
                            {rule.rule_type === 'BUY_X_GET_Y' && (
                              <>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">Buy Quantity</label>
                                  <input
                                    type="number"
                                    value={rule.buy_quantity}
                                    onChange={(e) => handleRuleChange(rule._key, 'buy_quantity', e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
                                    placeholder="2"
                                    min="1"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">Get Quantity (Free)</label>
                                  <input
                                    type="number"
                                    value={rule.get_quantity}
                                    onChange={(e) => handleRuleChange(rule._key, 'get_quantity', e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
                                    placeholder="1"
                                    min="1"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">Buy Product</label>
                                  <select
                                    value={rule.product_id}
                                    onChange={(e) => handleRuleChange(rule._key, 'product_id', e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
                                  >
                                    <option value="">Select product</option>
                                    {products.map((prod) => (
                                      <option key={prod.id} value={prod.id}>{prod.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">Get Product (Free)</label>
                                  <select
                                    value={rule.target_product_id}
                                    onChange={(e) => handleRuleChange(rule._key, 'target_product_id', e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
                                  >
                                    <option value="">Select product</option>
                                    {products.map((prod) => (
                                      <option key={prod.id} value={prod.id}>{prod.name}</option>
                                    ))}
                                  </select>
                                </div>
                              </>
                            )}

                            {/* Priority */}
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                              <input
                                type="number"
                                value={rule.priority}
                                onChange={(e) => handleRuleChange(rule._key, 'priority', e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
                                min="0"
                              />
                            </div>

                            {/* Optional discount override */}
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Override Discount Type</label>
                              <select
                                value={rule.discount_type}
                                onChange={(e) => handleRuleChange(rule._key, 'discount_type', e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
                              >
                                <option value="">Inherit from promotion</option>
                                <option value="percentage">Percentage</option>
                                <option value="fixed">Fixed Amount</option>
                              </select>
                            </div>
                            {rule.discount_type && (
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Override Discount Value</label>
                                <input
                                  type="number"
                                  value={rule.discount_value}
                                  onChange={(e) => handleRuleChange(rule._key, 'discount_value', e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
                                  placeholder={rule.discount_type === 'percentage' ? '20' : '100'}
                                  min="0"
                                  step="0.01"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default AdminPromotionForm;
