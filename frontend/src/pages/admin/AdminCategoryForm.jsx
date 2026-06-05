import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminAPI } from '../../api/endpoints';
import { ArrowLeft, Save } from 'lucide-react';

const AdminCategoryForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditing);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    description: '',
    is_active: true,
  });

  const [slug, setSlug] = useState('');

  useEffect(() => {
    if (isEditing) {
      const loadCategory = async () => {
        try {
          const res = await adminAPI.getCategories({ limit: 200 });
          const cat = res.data.find((c) => String(c.id) === id);
          if (cat) {
            setForm({
              name: cat.name,
              description: cat.description || '',
              is_active: cat.is_active,
            });
            setSlug(cat.slug);
          } else {
            setError('Category not found');
          }
        } catch (err) {
          setError('Failed to load category');
        } finally {
          setFetching(false);
        }
      };

      loadCategory();
    }
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

    if (!form.name) {
      setError('Category name is required');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: form.name,
        slug: slug || undefined,
        description: form.description || undefined,
        is_active: form.is_active,
      };

      if (isEditing) {
        await adminAPI.updateCategory(id, payload);
      } else {
        await adminAPI.createCategory(payload);
      }

      navigate('/admin/categories');
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map((d) => d.msg || d.message).join(', '));
      } else if (detail) {
        setError(detail);
      } else {
        setError('Failed to save category');
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
            {isEditing ? 'Edit Category' : 'Add Category'}
          </h1>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
          <div className="h-10 bg-gray-50 rounded-xl mb-4" />
          <div className="h-10 bg-gray-50 rounded-xl mb-4" />
          <div className="h-24 bg-gray-50 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/categories')}
          className="inline-flex items-center space-x-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Categories</span>
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Edit Category' : 'Add Category'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {isEditing ? 'Update category details' : 'Create a new product category'}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Category Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={(e) => {
                const value = e.target.value;
                setForm((prev) => ({ ...prev, name: value }));
                if (!isEditing || slug === '') {
                  setSlug(value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
                }
                if (error) setError('');
              }}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm"
              placeholder="e.g. Summer Collection"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Slug</label>
            <input
              type="text"
              name="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="Auto-generated from name"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm font-mono"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all text-sm resize-y"
              placeholder="Brief description of this category"
            />
          </div>

          <div>
            <label className="flex items-center space-x-2.5 cursor-pointer py-2">
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

        <div className="mt-8 pt-6 border-t border-gray-100 flex items-center space-x-3">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center space-x-2 bg-gray-900 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all text-sm"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving...' : isEditing ? 'Update Category' : 'Create Category'}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/categories')}
            className="px-6 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminCategoryForm;
