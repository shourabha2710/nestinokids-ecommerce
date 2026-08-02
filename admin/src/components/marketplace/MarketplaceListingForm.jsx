import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react';
import marketplaceService from '../../services/marketplaceService';
import { adminAPI } from '../../services/adminApi';
import { getErrorMessage } from '../../utils/errorUtils';

const MARKETPLACES = ['AMAZON', 'FLIPKART', 'MYNTRA', 'FIRSTCRY', 'MEESHO'];

const emptyForm = {
  product_id: '',
  variant_id: '',
  marketplace: 'AMAZON',
  external_product_id: '',
  external_url: '',
  display_label: '',
  priority: '0',
  allow_variant_fallback: false,
  is_active: true,
};

const MarketplaceListingForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    let active = true;
    adminAPI.getProducts({ limit: 200 })
      .then((res) => {
        if (active) setProducts(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (active) setProducts([]);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        if (isEditing) {
          const res = await marketplaceService.getListing(id);
          const l = res.data;
          setForm({
            product_id: l.product_id != null ? String(l.product_id) : '',
            variant_id: l.variant_id != null ? String(l.variant_id) : '',
            marketplace: l.marketplace || 'AMAZON',
            external_product_id: l.external_product_id || '',
            external_url: l.external_url || '',
            display_label: l.display_label || '',
            priority: String(l.priority ?? 0),
            allow_variant_fallback: !!l.allow_variant_fallback,
            is_active: l.is_active !== false,
          });
        }
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load listing'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isEditing]);

  const selectedProduct = products.find((p) => String(p.id) === form.product_id);
  const variants = selectedProduct?.variants || [];

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

  const handleProductChange = (e) => {
    setForm((prev) => ({
      ...prev,
      product_id: e.target.value,
      variant_id: '',
    }));
    if (errors.product_id) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.product_id;
        return next;
      });
    }
    if (error) setError('');
  };

  const validate = () => {
    const next = {};
    if (!form.product_id) next.product_id = 'Product is required';
    if (!form.marketplace) next.marketplace = 'Marketplace is required';
    if (!form.external_product_id.trim()) next.external_product_id = 'External Product ID is required';
    if (!form.external_url.trim()) {
      next.external_url = 'Marketplace URL is required';
    } else {
      let parsed;
      try {
        parsed = new URL(form.external_url.trim());
      } catch {
        parsed = null;
      }
      if (!parsed || parsed.protocol !== 'https:') next.external_url = 'URL must start with https://';
    }
    if (form.priority !== '') {
      const priority = Number(form.priority);
      if (!Number.isInteger(priority) || priority < 0) {
        next.priority = 'Priority must be an integer greater than or equal to 0';
      }
    }
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const payload = {
      variant_id: form.variant_id ? Number(form.variant_id) : null,
      marketplace: form.marketplace,
      external_product_id: form.external_product_id.trim(),
      external_url: form.external_url.trim(),
      display_label: form.display_label.trim() || null,
      allow_variant_fallback: form.allow_variant_fallback,
      is_active: form.is_active,
      priority: Number(form.priority) || 0,
    };
    if (!isEditing) {
      payload.product_id = Number(form.product_id);
    }

    setSaving(true);
    try {
      if (isEditing) {
        await marketplaceService.updateListing(id, payload);
      } else {
        await marketplaceService.createListing(payload);
      }
      navigate('/marketplace');
    } catch (err) {
      setError(getErrorMessage(err, isEditing ? 'Failed to update listing' : 'Failed to create listing'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Marketplace Listing' : 'Add Marketplace Listing'}
          </h1>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-10 bg-gray-50 rounded-xl" />
            <div className="h-10 bg-gray-50 rounded-xl" />
            <div className="h-10 bg-gray-50 rounded-xl" />
            <div className="h-10 bg-gray-50 rounded-xl" />
            <div className="md:col-span-2 h-24 bg-gray-50 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0">
        <div className="flex-1 min-w-0">
          <button
            onClick={() => navigate('/marketplace')}
            className="inline-flex items-center space-x-1.5 text-sm text-gray-500 hover:text-gray-700 mb-1 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Marketplace Listings</span>
          </button>
          <h1 className="text-xl font-bold text-gray-900 truncate">
            {isEditing ? 'Edit Marketplace Listing' : 'Add Marketplace Listing'}
          </h1>
        </div>
        <div className="flex items-center space-x-3 flex-shrink-0">
          <button
            type="button"
            onClick={() => navigate('/marketplace')}
            className="px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="marketplaceForm"
            disabled={saving}
            className="inline-flex items-center space-x-2 bg-gray-900 text-white px-5 py-2 rounded-xl font-medium hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all text-sm"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : isEditing ? 'Update Listing' : 'Create Listing'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <form id="marketplaceForm" onSubmit={handleSubmit}>
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Target Product</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Product <span className="text-red-400">*</span>
                </label>
                <select
                  name="product_id"
                  value={form.product_id}
                  onChange={handleProductChange}
                  disabled={isEditing}
                  className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed ${
                    errors.product_id ? 'border-red-300' : 'border-gray-200'
                  }`}
                >
                  <option value="">Select a product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {isEditing && (
                  <p className="text-xs text-gray-400 mt-1">Product cannot be changed after creation.</p>
                )}
                {errors.product_id && <p className="text-xs text-red-500 mt-1">{errors.product_id}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Variant</label>
                <select
                  name="variant_id"
                  value={form.variant_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm"
                >
                  <option value="">Product Level (All Variants)</option>
                  {variants.map((v) => {
                    const label = v.size
                      ? (v.sku ? `${v.size} — ${v.sku}` : v.size)
                      : (v.sku || `#${v.id}`);
                    return (
                      <option key={v.id} value={v.id}>{label}</option>
                    );
                  })}
                </select>
                {errors.variant_id && <p className="text-xs text-red-500 mt-1">{errors.variant_id}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Marketplace <span className="text-red-400">*</span>
                </label>
                <select
                  name="marketplace"
                  value={form.marketplace}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm ${
                    errors.marketplace ? 'border-red-300' : 'border-gray-200'
                  }`}
                >
                  {MARKETPLACES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                {errors.marketplace && <p className="text-xs text-red-500 mt-1">{errors.marketplace}</p>}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">External Link</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  External Product ID <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="external_product_id"
                  value={form.external_product_id}
                  onChange={handleChange}
                  maxLength={255}
                  className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm ${
                    errors.external_product_id ? 'border-red-300' : 'border-gray-200'
                  }`}
                  placeholder="e.g. B0H6J3JRWT"
                />
                {errors.external_product_id && <p className="text-xs text-red-500 mt-1">{errors.external_product_id}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Marketplace URL <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  name="external_url"
                  value={form.external_url}
                  onChange={handleChange}
                  maxLength={2048}
                  className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm ${
                    errors.external_url ? 'border-red-300' : 'border-gray-200'
                  }`}
                  placeholder="https://..."
                />
                {errors.external_url && <p className="text-xs text-red-500 mt-1">{errors.external_url}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Display Label</label>
                <input
                  type="text"
                  name="display_label"
                  value={form.display_label}
                  onChange={handleChange}
                  maxLength={255}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm"
                  placeholder="e.g. Buy on Amazon"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Optional. If left empty, the storefront shows "Buy on {form.marketplace}".
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
                <input
                  type="number"
                  name="priority"
                  value={form.priority}
                  onChange={handleChange}
                  min="0"
                  step="1"
                  className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm ${
                    errors.priority ? 'border-red-300' : 'border-gray-200'
                  }`}
                  placeholder="0"
                />
                <p className="text-xs text-gray-400 mt-1">Higher values appear first on the storefront.</p>
                {errors.priority && <p className="text-xs text-red-500 mt-1">{errors.priority}</p>}
              </div>

              <div className="flex flex-wrap items-end gap-4 sm:gap-6 pb-1">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    name="allow_variant_fallback"
                    checked={form.allow_variant_fallback}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-gray-300 text-gold focus:ring-gold/40"
                  />
                  <span className="text-sm font-medium text-gray-700">Allow Variant Fallback</span>
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
        </div>
      </form>
    </div>
  );
};

export default MarketplaceListingForm;
