import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminAPI } from '../../api/endpoints';
import { productsAPI } from '../../api/endpoints';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  Upload,
  Trash2,
  Star,
  ImageOff,
  AlertTriangle,
} from 'lucide-react';

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
  });

  const [images, setImages] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState('');
  const [deletingImageId, setDeletingImageId] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const catRes = await productsAPI.getCategories({ limit: 100 });
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
          });
          setImages(p.images || []);
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
        quantity: Number(form.quantity),
        is_featured: form.is_featured,
        is_active: form.is_active,
      };

      if (isEditing) {
        await adminAPI.updateProduct(id, payload);
      } else {
        await adminAPI.createProduct(payload);
      }

      navigate('/admin/products');
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
            onClick={() => navigate('/admin/products')}
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
            onClick={() => navigate('/admin/products')}
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
            <span>{loading ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}</span>
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
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
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
                  value={form.quantity}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm"
                  placeholder="0"
                />
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
                    : 'Images can be added after the product is created'}
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
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 sm:p-12 text-center">
                <Upload className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-500">Create product first, then add images</p>
                <p className="text-xs text-gray-400 mt-1">
                  Product images can be uploaded after the product is saved
                </p>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default AdminProductForm;
