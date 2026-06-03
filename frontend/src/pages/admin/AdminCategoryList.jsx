import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../api/endpoints';

const AdminCategoryList = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getCategories({ limit: 200 });
      setCategories(res.data);
    } catch (err) {
      setError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleDelete = async (id) => {
    try {
      setDeleting(true);
      setDeleteError('');
      await adminAPI.deleteCategory(id);
      setDeleteId(null);
      fetchCategories();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setDeleteError(detail || 'Failed to delete category');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Categories</h1>
        </div>
        <div className="bg-white rounded-lg shadow p-6 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded mb-3" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Categories</h1>
        <button
          onClick={() => navigate('/admin/categories/new')}
          className="bg-gold text-gray-900 px-4 py-2 rounded-lg font-semibold hover:bg-opacity-90 transition text-sm"
        >
          + Add Category
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Slug</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Parent</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Active</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">
                    No categories found
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr key={category.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{category.name}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{category.slug}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {category.parent_id
                        ? categories.find((c) => c.id === category.parent_id)?.name || `#${category.parent_id}`
                        : <span className="text-gray-400">&mdash;</span>}
                    </td>
                    <td className="px-4 py-3">
                      {category.is_active ? (
                        <span className="text-green-500 font-medium">Active</span>
                      ) : (
                        <span className="text-red-500 font-medium">Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => navigate(`/admin/categories/${category.id}/edit`)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-xs mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setDeleteId(category.id);
                          setDeleteError('');
                        }}
                        className="text-red-600 hover:text-red-800 font-medium text-xs"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deleteId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Confirm Delete</h3>
            <p className="text-gray-600 text-sm mb-4">
              Are you sure you want to delete this category? This action cannot be undone.
            </p>

            {deleteError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg mb-4 text-sm">
                {deleteError}
              </div>
            )}

            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => {
                  setDeleteId(null);
                  setDeleteError('');
                }}
                disabled={deleting}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition text-sm disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCategoryList;
