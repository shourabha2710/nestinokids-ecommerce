import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminAPI } from '../../services/adminApi';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  Upload,
  Trash2,
  Star,
  ImageOff,
  AlertTriangle,
  Plus,
  Pencil,
  Search,
} from 'lucide-react';
import CharCounter from '../../components/settings/CharCounter';
import SeoPreview from '../../components/settings/SeoPreview';

const PREDEFINED_SIZES = [
  'Newborn',
  '0-6M',
  '6-9M',
  '9-12M',
  '12-18M',
  '18-24M',
  '1-2Y',
  '2-3Y',
  '3-4Y',
  '4-5Y',
  '5-6Y',
  '6-7Y',
  '7-8Y',
  '8-9Y',
  '9-10Y',
  '10-11Y',
  '11-12Y',
];

const buildCategoryTree = (categories) => {
  if (!categories.length) return [];
  const map = {};
  categories.forEach((cat) => { map[cat.id] = { ...cat, children: [] }; });
  const roots = [];
  categories.forEach((cat) => {
    if (cat.parent_id && map[cat.parent_id]) {
      map[cat.parent_id].children.push(map[cat.id]);
    } else {
      roots.push(map[cat.id]);
    }
  });
  const sortNodes = (nodes) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach((n) => sortNodes(n.children));
  };
  sortNodes(roots);
  const flatten = (nodes, depth) => {
    const result = [];
    for (const node of nodes) {
      result.push({ ...node, depth });
      if (node.children.length > 0) {
        result.push(...flatten(node.children, depth + 1));
      }
    }
    return result;
  };
  return flatten(roots, 0);
};

const AdminProductForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const fileInputRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    category_id: '',
    description: '',
    short_description: '',
    price: '',
    discount_price: '',
    quantity: '0',
    sku: '',
    is_featured: false,
    is_active: true,
    meta_title: '',
    meta_description: '',
    meta_keywords: '',
  });

  const [images, setImages] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState('');
  const [deletingImageId, setDeletingImageId] = useState(null);

  const [pendingImages, setPendingImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const createFileInputRef = useRef(null);

  const [variants, setVariants] = useState([]);
  const [variantForm, setVariantForm] = useState({ size: '', sku: '', quantity: '0', price_modifier: '0' });
  const [editingVariantIndex, setEditingVariantIndex] = useState(null);
  const [variantError, setVariantError] = useState('');
  const [useCustomSize, setUseCustomSize] = useState(false);
  const initialVariants = useRef([]);

  const flatCategories = React.useMemo(() => buildCategoryTree(categories), [categories]);
  const hasVariants = variants.length > 0;
  const totalVariantStock = variants.reduce((sum, v) => sum + Number(v.quantity), 0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const catRes = await adminAPI.getCategories({ limit: 100 });
        setCategories(catRes.data);

        if (isEditing) {
          const prodRes = await adminAPI.getProduct(id);
          const p = prodRes.data;
          setForm({
            name: p.name,
            category_id: String(p.category_id),
            description: p.description,
            short_description: p.short_description || '',
            price: String(p.price),
            discount_price: p.discount_price ? String(p.discount_price) : '',
            quantity: String(p.quantity),
            sku: p.sku,
            is_featured: p.is_featured,
            is_active: p.is_active,
            meta_title: p.meta_title || '',
            meta_description: p.meta_description || '',
            meta_keywords: p.meta_keywords || '',
          });
          setImages(p.images || []);
          const loadedVariants = (p.variants || []).map((v) => ({
            id: v.id,
            size: v.size || '',
            sku: v.sku,
            quantity: String(v.quantity),
            price_modifier: String(v.price_modifier),
          }));
          setVariants(loadedVariants);
          initialVariants.current = loadedVariants;
        }
      } catch (err) {
        setError('Failed to load data');
      } finally {
        setFetching(false);
      }
    };

    loadData();
  }, [id, isEditing]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (error) setError('');
  };

  const resetVariantForm = () => {
    setVariantForm({ size: '', sku: '', quantity: '0', price_modifier: '0' });
    setEditingVariantIndex(null);
    setVariantError('');
    setUseCustomSize(false);
  };

  const handleVariantChange = (e) => {
    const { name, value } = e.target;
    setVariantForm((prev) => ({ ...prev, [name]: value }));
    if (variantError) setVariantError('');
  };

  const handleSizeChange = (e) => {
    const val = e.target.value;
    if (val === 'CUSTOM') {
      setUseCustomSize(true);
      setVariantForm((prev) => ({ ...prev, size: '' }));
    } else {
      setUseCustomSize(false);
      setVariantForm((prev) => ({ ...prev, size: val }));
    }
    if (variantError) setVariantError('');
  };

  const handleAddVariant = () => {
    if (!variantForm.size) {
      setVariantError('Size is required');
      return;
    }
    if (!variantForm.sku) {
      setVariantError('SKU is required');
      return;
    }
    if (Number(variantForm.quantity) < 0) {
      setVariantError('Quantity must be >= 0');
      return;
    }
    const dupe = variants.find(
      (v) => v.size.toLowerCase() === variantForm.size.toLowerCase()
    );
    if (dupe) {
      setVariantError(`Variant with size '${variantForm.size}' already exists`);
      return;
    }
    setVariants((prev) => [
      ...prev,
      { ...variantForm, quantity: String(Number(variantForm.quantity)) },
    ]);
    resetVariantForm();
  };

  const handleEditVariant = (index) => {
    const v = variants[index];
    const isCustom = !PREDEFINED_SIZES.includes(v.size);
    setUseCustomSize(isCustom);
    setVariantForm({ ...v });
    setEditingVariantIndex(index);
    setVariantError('');
  };

  const handleUpdateVariant = () => {
    if (!variantForm.size) {
      setVariantError('Size is required');
      return;
    }
    if (!variantForm.sku) {
      setVariantError('SKU is required');
      return;
    }
    if (Number(variantForm.quantity) < 0) {
      setVariantError('Quantity must be >= 0');
      return;
    }
    const dupe = variants.find(
      (v, i) => i !== editingVariantIndex && v.size.toLowerCase() === variantForm.size.toLowerCase()
    );
    if (dupe) {
      setVariantError(`Variant with size '${variantForm.size}' already exists`);
      return;
    }
    setVariants((prev) =>
      prev.map((v, i) =>
        i === editingVariantIndex
          ? { ...variantForm, id: v.id, quantity: String(Number(variantForm.quantity)) }
          : v
      )
    );
    resetVariantForm();
  };

  const handleDeleteVariant = (index) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
    if (editingVariantIndex === index) resetVariantForm();
  };

  const handlePendingImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024;
    const validFiles = [];

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        setImageError(`${file.name}: only JPG, PNG, WebP allowed`);
        if (createFileInputRef.current) createFileInputRef.current.value = '';
        return;
      }
      if (file.size > maxSize) {
        setImageError(`${file.name}: file too large (max 5MB)`);
        if (createFileInputRef.current) createFileInputRef.current.value = '';
        return;
      }
      validFiles.push(file);
    }

    setImageError('');

    const newPending = validFiles.map((file, i) => ({
      file,
      preview: URL.createObjectURL(file),
      is_primary: pendingImages.length === 0 && i === 0,
    }));

    const maxSlots = 5;
    setPendingImages((prev) => [...prev, ...newPending].slice(0, maxSlots));

    if (createFileInputRef.current) {
      createFileInputRef.current.value = '';
    }
  };

  const handleRemovePendingImage = (index) => {
    setPendingImages((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.preview);
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length > 0 && !updated.some((img) => img.is_primary)) {
        updated[0].is_primary = true;
      }
      return updated;
    });
  };

  const handleSetPendingPrimary = (index) => {
    setPendingImages((prev) =>
      prev.map((img, i) => ({ ...img, is_primary: i === index }))
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name || !form.category_id || !form.description || !form.price) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: form.name,
        slug: form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        category_id: Number(form.category_id),
        description: form.description,
        short_description: form.short_description || undefined,
        price: Number(form.price),
        discount_price: form.discount_price ? Number(form.discount_price) : undefined,
        sku: form.sku || undefined,
        quantity: hasVariants ? 0 : Number(form.quantity),
        is_featured: form.is_featured,
        is_active: form.is_active,
        meta_title: form.meta_title || undefined,
        meta_description: form.meta_description || undefined,
        meta_keywords: form.meta_keywords || undefined,
      };

      if (isEditing) {
        await adminAPI.updateProduct(id, payload);

        const oldMap = new Map(initialVariants.current.map((v) => [v.id, v]));
        const newMap = new Map(variants.filter((v) => v.id).map((v) => [v.id, v]));

        for (const v of variants) {
          if (v.id) {
            const old = oldMap.get(v.id);
            if (
              old.size !== v.size ||
              old.sku !== v.sku ||
              Number(old.quantity) !== Number(v.quantity) ||
              Number(old.price_modifier) !== Number(v.price_modifier)
            ) {
              await adminAPI.updateVariant(id, v.id, {
                size: v.size,
                sku: v.sku,
                quantity: Number(v.quantity),
                price_modifier: Number(v.price_modifier),
              });
            }
          } else {
            await adminAPI.createVariant(id, {
              size: v.size,
              sku: v.sku,
              quantity: Number(v.quantity),
              price_modifier: Number(v.price_modifier),
            });
          }
        }

        for (const v of initialVariants.current) {
          if (!newMap.has(v.id)) {
            await adminAPI.deleteVariant(id, v.id);
          }
        }
      } else {
        payload.variants = variants.map((v) => ({
          size: v.size,
          sku: v.sku,
          quantity: Number(v.quantity),
          price_modifier: Number(v.price_modifier),
        }));
        const res = await adminAPI.createProduct(payload);
        const newProductId = res.data.id;

        if (pendingImages.length > 0) {
          setUploadingImages(true);
          for (const pImg of pendingImages) {
            const fd = new FormData();
            fd.append('file', pImg.file);
            fd.append('is_primary', pImg.is_primary ? 'true' : 'false');
            try {
              await adminAPI.uploadProductImage(newProductId, fd);
            } catch (imgErr) {
              console.error(`Image upload failed: ${pImg.file.name}`, imgErr);
            }
          }
          pendingImages.forEach((pImg) => URL.revokeObjectURL(pImg.preview));
          setUploadingImages(false);
        }

        navigate(`/products/${newProductId}/edit`);
        return;
      }

      navigate('/products');
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map((d) => d.msg || d.message).join(', '));
      } else if (detail) {
        setError(detail);
      } else {
        setError('Failed to save product');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setImageError('Only JPG, PNG, and WebP images are allowed');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageError('File too large. Maximum size is 5MB');
      return;
    }

    setUploadingImage(true);
    setImageError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('is_primary', images.length === 0 ? 'true' : 'false');

      const res = await adminAPI.uploadProductImage(id, formData);
      setImages((prev) => [...prev, res.data]);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setImageError(detail || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteImage = async (imageId) => {
    setDeletingImageId(imageId);
    try {
      await adminAPI.deleteProductImage(id, imageId);
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch (err) {
      setImageError('Failed to delete image');
    } finally {
      setDeletingImageId(null);
    }
  };

  const handleSetPrimary = async (imageId) => {
    try {
      await adminAPI.setProductImagePrimary(id, imageId);
      setImages((prev) =>
        prev.map((img) => ({
          ...img,
          is_primary: img.id === imageId,
        }))
      );
    } catch {
      setImageError('Failed to set primary image');
    }
  };

  if (fetching) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Product' : 'Add Product'}
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
            onClick={() => navigate('/products')}
            className="inline-flex items-center space-x-1.5 text-sm text-gray-500 hover:text-gray-700 mb-1 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Products</span>
          </button>
          <h1 className="text-xl font-bold text-gray-900 truncate">
            {isEditing ? 'Edit Product' : 'Add Product'}
          </h1>
        </div>
        <div className="flex items-center space-x-3 flex-shrink-0">
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="productForm"
            disabled={loading}
            className="inline-flex items-center space-x-2 bg-gray-900 text-white px-5 py-2 rounded-xl font-medium hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all text-sm"
          >
            <Save className="w-4 h-4" />
            <span>{loading && uploadingImages ? 'Uploading Images...' : loading ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <form id="productForm" onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Main details card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Product Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm"
                  placeholder="e.g. Summer Floral Dress"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Category <span className="text-red-400">*</span>
                </label>
                <select
                  name="category_id"
                  value={form.category_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm"
                >
                  <option value="">Select category</option>
                  {flatCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {'\u00A0\u00A0'.repeat(cat.depth)}{cat.depth > 0 ? '\u2514\u2500 ' : ''}{cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">SKU</label>
                <input
                  type="text"
                  name="sku"
                  value={form.sku}
                  onChange={handleChange}
                  placeholder="Auto-generated if empty"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm resize-y"
                  placeholder="Detailed product description..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Short Description</label>
                <textarea
                  name="short_description"
                  value={form.short_description}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm resize-y"
                  placeholder="Brief description for cards and snippets..."
                />
              </div>
            </div>
          </div>

          {/* Pricing & Stock card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Pricing & Stock</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Price (₹) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Discount Price (₹)</label>
                <input
                  type="number"
                  name="discount_price"
                  value={form.discount_price}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm"
                  placeholder="Discounted price"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity</label>
                <input
                  type="number"
                  name="quantity"
                  value={hasVariants ? totalVariantStock : form.quantity}
                  onChange={handleChange}
                  min="0"
                  disabled={hasVariants}
                  className={`w-full px-4 py-2.5 border rounded-xl text-gray-900 transition-all text-sm ${
                    hasVariants
                      ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-50 border-gray-200 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold'
                  }`}
                  placeholder="0"
                />
                {hasVariants && (
                  <p className="text-xs text-amber-600 mt-1.5 flex items-center space-x-1">
                    <span>Stock is derived from variant quantities below</span>
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-end gap-4 sm:gap-6 pb-1">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_featured"
                    checked={form.is_featured}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-gray-300 text-gold focus:ring-gold/40"
                  />
                  <div className="flex items-center space-x-1.5">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium text-gray-700">Featured</span>
                  </div>
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

          {/* Images card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Product Images</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {isEditing
                    ? 'Upload and manage product images'
                    : 'Select images to upload after the product is created'}
                </p>
              </div>
              {isEditing && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="inline-flex items-center space-x-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all text-sm w-full sm:w-auto justify-center"
                  >
                    {uploadingImage ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Upload Image</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {imageError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm">
                {imageError}
              </div>
            )}

            {isEditing ? (
              images.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-2 border-dashed border-gray-200 rounded-xl p-8 sm:p-12 text-center"
                >
                  <ImageOff className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-500">No images uploaded yet</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Click the upload button above to add product images
                  </p>
                </motion.div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {images.map((img) => (
                    <motion.div
                      key={img.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`relative group rounded-xl overflow-hidden border-2 ${
                        img.is_primary ? 'border-gold' : 'border-gray-100'
                      }`}
                    >
                      <img
                        src={img.image_url}
                        alt={img.alt_text || ''}
                        className="w-full h-36 object-cover bg-gray-50"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      {img.is_primary && (
                        <div className="absolute top-2 left-2 bg-gold text-gray-900 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                          Primary
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center space-x-2 opacity-0 group-hover:opacity-100">
                        {!img.is_primary && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimary(img.id)}
                            className="bg-white text-gray-800 text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-all"
                          >
                            Set Primary
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteImage(img.id)}
                          disabled={deletingImageId === img.id}
                          className="bg-red-600 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:bg-red-700 transition-all disabled:opacity-50"
                        >
                          {deletingImageId === img.id ? (
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )
            ) : (
              <>
                <input
                  ref={createFileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  multiple
                  onChange={handlePendingImageSelect}
                  className="hidden"
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {[...Array(5)].map((_, slotIndex) => {
                    const pendingImg = pendingImages[slotIndex];
                    if (pendingImg) {
                      return (
                        <motion.div
                          key={slotIndex}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`relative group rounded-xl overflow-hidden border-2 ${
                            pendingImg.is_primary ? 'border-gold' : 'border-gray-100'
                          }`}
                        >
                          <img
                            src={pendingImg.preview}
                            alt=""
                            className="w-full h-36 object-cover bg-gray-50"
                          />
                          {pendingImg.is_primary && (
                            <div className="absolute top-2 left-2 bg-gold text-gray-900 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                              Primary
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center space-x-2 opacity-0 group-hover:opacity-100">
                            {!pendingImg.is_primary && (
                              <button
                                type="button"
                                onClick={() => handleSetPendingPrimary(slotIndex)}
                                className="bg-white text-gray-800 text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-all"
                              >
                                Set Primary
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemovePendingImage(slotIndex)}
                              className="bg-red-600 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:bg-red-700 transition-all"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    }
                    return (
                      <motion.button
                        key={slotIndex}
                        type="button"
                        onClick={() => createFileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-200 rounded-xl h-36 flex flex-col items-center justify-center text-gray-300 hover:text-gray-400 hover:border-gray-300 hover:bg-gray-50/50 transition-all cursor-pointer"
                      >
                        <Upload className="w-6 h-6 mb-1" />
                        <span className="text-xs font-medium">Add Image</span>
                      </motion.button>
                    );
                  })}
                </div>
                {pendingImages.length > 0 && (
                  <p className="text-xs text-gray-400 mt-3">
                    Images will be uploaded after the product is created
                  </p>
                )}
              </>
            )}
          </div>

          {/* Variants card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Product Variants</h2>
                <p className="text-sm text-gray-500 mt-0.5">Manage sizes and stock levels</p>
              </div>
            </div>

            {variantError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm">
                {variantError}
              </div>
            )}

            {variants.length > 0 && (
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2.5 px-3 font-medium text-gray-500">Size</th>
                      <th className="text-left py-2.5 px-3 font-medium text-gray-500">SKU</th>
                      <th className="text-left py-2.5 px-3 font-medium text-gray-500">Qty</th>
                      <th className="text-left py-2.5 px-3 font-medium text-gray-500">Price Mod</th>
                      <th className="text-right py-2.5 px-3 font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((v, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="py-2.5 px-3 font-medium text-gray-900">{v.size}</td>
                        <td className="py-2.5 px-3 font-mono text-gray-600 text-xs">{v.sku}</td>
                        <td className="py-2.5 px-3 text-gray-600">{v.quantity}</td>
                        <td className="py-2.5 px-3 text-gray-600">
                          {Number(v.price_modifier) === 0
                            ? '—'
                            : `${Number(v.price_modifier) > 0 ? '+' : ''}₹${v.price_modifier}`}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              type="button"
                              onClick={() => handleEditVariant(i)}
                              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                              title="Edit variant"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteVariant(i)}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Delete variant"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-lg mt-2">
                  <span className="text-sm font-medium text-gray-700">Total Variant Stock</span>
                  <span className="text-sm font-bold text-gray-900">{totalVariantStock}</span>
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-xl p-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Size</label>
                  <select
                    value={useCustomSize ? 'CUSTOM' : variantForm.size}
                    onChange={handleSizeChange}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm"
                  >
                    <option value="">Select size</option>
                    {PREDEFINED_SIZES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                    <option value="CUSTOM">Custom Size</option>
                  </select>
                  {useCustomSize && (
                    <input
                      type="text"
                      name="size"
                      value={variantForm.size}
                      onChange={handleVariantChange}
                      placeholder="Enter custom size"
                      className="w-full px-3 py-2 mt-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm"
                      autoFocus
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">SKU</label>
                  <input
                    type="text"
                    name="sku"
                    value={variantForm.sku}
                    onChange={handleVariantChange}
                    placeholder="Unique SKU"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    value={variantForm.quantity}
                    onChange={handleVariantChange}
                    min="0"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Price Mod (₹)</label>
                  <input
                    type="number"
                    name="price_modifier"
                    value={variantForm.price_modifier}
                    onChange={handleVariantChange}
                    step="0.01"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm"
                    placeholder="0.00"
                  />
                  <div className="mt-1.5 text-xs text-gray-400 space-y-0.5 leading-relaxed">
                    <p>Base Price: <span className="font-medium text-gray-600">₹{Number(form.price || 0).toFixed(2)}</span></p>
                    <p>Modifier: <span className={`font-medium ${Number(variantForm.price_modifier) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {Number(variantForm.price_modifier) >= 0 ? '+' : ''}₹{Number(variantForm.price_modifier || 0).toFixed(2)}
                    </span></p>
                    <p className="border-t border-gray-200 pt-0.5 mt-0.5">Final Price: <span className="font-semibold text-gray-700">
                      ₹{(Number(form.price || 0) + Number(variantForm.price_modifier || 0)).toFixed(2)}
                    </span></p>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 mt-3">
                {editingVariantIndex === null ? (
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="inline-flex items-center space-x-1.5 bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition-all text-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Variant</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleUpdateVariant}
                      className="inline-flex items-center space-x-1.5 bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition-all text-sm"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Update Variant</span>
                    </button>
                    <button
                      type="button"
                      onClick={resetVariantForm}
                      className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 font-medium hover:bg-gray-100 transition-all text-sm"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>

            {!isEditing && variants.length > 0 && (
              <p className="text-xs text-gray-400 mt-3">
                Variants will be saved when the product is created
              </p>
            )}
          </div>

          {/* SEO card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">SEO</h2>
                <p className="text-sm text-gray-500 mt-0.5">Search engine optimization settings</p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Meta Title <CharCounter current={form.meta_title} max={60} />
                  </label>
                  <input
                    type="text"
                    name="meta_title"
                    value={form.meta_title}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm"
                    placeholder="e.g. Summer Floral Dress for Kids | NestinoKids"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Meta Description <CharCounter current={form.meta_description} max={160} />
                  </label>
                  <textarea
                    name="meta_description"
                    value={form.meta_description}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm resize-y"
                    placeholder="Brief description for search engine results..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Meta Keywords</label>
                  <input
                    type="text"
                    name="meta_keywords"
                    value={form.meta_keywords}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm"
                    placeholder="kids dress, summer collection, floral"
                  />
                </div>
              </div>
              <div>
                <SeoPreview
                  title={form.meta_title}
                  url={`nestinokids.com/products/${form.name ? form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : '...'}`}
                  description={form.meta_description}
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AdminProductForm;
