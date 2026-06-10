import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { adminAPI } from '../../api/endpoints';
import {
  FolderTree,
  Plus,
  Edit3,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

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
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
            <p className="text-sm text-gray-500 mt-1">Organize your products</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-50 rounded-xl mb-3 last:mb-0" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500 mt-1">Organize your products</p>
        </div>
        <button
          onClick={() => navigate('/admin/categories/new')}
          className="inline-flex items-center justify-center space-x-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-gray-800 transition-all text-sm w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Category</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Name</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Slug</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Parent</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Active</th>
                <th className="text-right px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                      <FolderTree className="w-12 h-12 mb-3 text-gray-200" />
                      <p className="text-sm font-medium text-gray-500 mb-1">No categories found</p>
                      <p className="text-xs text-gray-400">Get started by creating your first category</p>
                      <button
                        onClick={() => navigate('/admin/categories/new')}
                        className="mt-4 inline-flex items-center space-x-1.5 text-sm font-medium text-gold hover:text-yellow-600 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Category</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                categories.map((category, index) => (
                  <motion.tr
                    key={category.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{category.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{category.slug}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {category.parent_id ? (
                        <span className="text-gray-700">
                          {categories.find((c) => c.id === category.parent_id)?.name || `#${category.parent_id}`}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                          category.is_active
                            ? 'bg-green-50 text-green-600'
                            : 'bg-gray-50 text-gray-400'
                        }`}
                      >
                        {category.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => navigate(`/admin/categories/${category.id}/edit`)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteId(category.id);
                            setDeleteError('');
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 py-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-auto max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-gray-900">Confirm Delete</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to delete this category? Products under this category may become uncategorized.
              </p>

              {deleteError && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-xl mb-4 text-sm">
                  {deleteError.includes('contains') 
                    ? 'This category contains products. Move or delete the products first.'
                    : deleteError}
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 justify-end">
                <button
                  onClick={() => {
                    setDeleteId(null);
                    setDeleteError('');
                  }}
                  disabled={deleting}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all text-sm w-full sm:w-auto disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteId)}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all text-sm w-full sm:w-auto disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete Category'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminCategoryList;
