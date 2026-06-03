import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminAPI } from '../../api/endpoints';
import { productsAPI } from '../../api/endpoints';

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
      const res = await adminAPI.setProductImagePrimary(id, imageId);
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
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          {isEditing ? 'Edit Product' : 'Add Product'}
        </h1>
        <div className="bg-white rounded-lg shadow p-6 animate-pulse">
          <div className="h-10 bg-gray-100 rounded mb-4" />
          <div className="h-10 bg-gray-100 rounded mb-4" />
          <div className="h-24 bg-gray-100 rounded mb-4" />
          <div className="h-10 bg-gray-100 rounded mb-4" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {isEditing ? 'Edit Product' : 'Add Product'}
        </h1>
        <button
          onClick={() => navigate('/admin/products')}
          className="text-gray-500 hover:text-gray-700 text-sm font-medium"
        >
          &larr; Back to Products
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gold transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              name="category_id"
              value={form.category_id}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gold transition bg-white"
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">SKU</label>
            <input
              type="text"
              name="sku"
              value={form.sku}
              onChange={handleChange}
              placeholder="Auto-generated if empty"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gold transition"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gold transition resize-y"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Short Description</label>
            <textarea
              name="short_description"
              value={form.short_description}
              onChange={handleChange}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gold transition resize-y"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Price (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="price"
              value={form.price}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gold transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Discount Price (₹)</label>
            <input
              type="number"
              name="discount_price"
              value={form.discount_price}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gold transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Quantity</label>
            <input
              type="number"
              name="quantity"
              value={form.quantity}
              onChange={handleChange}
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gold transition"
            />
          </div>

          <div className="flex items-end space-x-6 pb-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                name="is_featured"
                checked={form.is_featured}
                onChange={handleChange}
                className="w-4 h-4 rounded border-gray-300 text-gold focus:ring-gold"
              />
              <span className="text-sm font-medium text-gray-700">Featured</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                name="is_active"
                checked={form.is_active}
                onChange={handleChange}
                className="w-4 h-4 rounded border-gray-300 text-gold focus:ring-gold"
              />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>
          </div>
        </div>

        {isEditing && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Product Images</h2>
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
                  className="bg-gold text-gray-900 px-4 py-2 rounded-lg font-semibold hover:bg-opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition text-sm"
                >
                  {uploadingImage ? 'Uploading...' : '+ Upload Image'}
                </button>
              </div>
            </div>

            {imageError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
                {imageError}
              </div>
            )}

            {images.length === 0 ? (
              <p className="text-gray-400 text-sm">No images uploaded yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className={`relative group rounded-lg overflow-hidden border-2 ${
                      img.is_primary ? 'border-gold' : 'border-gray-200'
                    }`}
                  >
                    <img
                      src={img.image_url}
                      alt={img.alt_text || ''}
                      className="w-full h-32 object-cover bg-gray-100"
                      onError={(e) => { e.target.src = '/images/placeholder-product.svg'; }}
                    />
                    {img.is_primary && (
                      <span className="absolute top-1 left-1 bg-gold text-gray-900 text-xs font-bold px-2 py-0.5 rounded">
                        Primary
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition flex items-center justify-center space-x-2 opacity-0 group-hover:opacity-100">
                      {!img.is_primary && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(img.id)}
                          className="bg-white text-gray-800 text-xs font-semibold px-2 py-1 rounded hover:bg-gray-100 transition"
                        >
                          Set Primary
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(img.id)}
                        disabled={deletingImageId === img.id}
                        className="bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded hover:bg-red-700 transition disabled:opacity-50"
                      >
                        {deletingImageId === img.id ? '...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!isEditing && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-400">
              Images can be added after the product is created.
            </p>
          </div>
        )}

        <div className="mt-8 flex space-x-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-gold text-gray-900 px-6 py-2 rounded-lg font-semibold hover:bg-opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/products')}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminProductForm;
