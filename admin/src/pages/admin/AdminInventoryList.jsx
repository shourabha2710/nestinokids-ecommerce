import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminAPI } from '../../services/adminApi';
import { usePermissions } from '../../hooks/usePermissions';
import { Permissions } from '../../constants/permissions';
import {
  ClipboardList,
  Search,
  Edit3,
  AlertTriangle,
  Package,
  ShoppingBag,
  Archive,
  X,
  Save,
} from 'lucide-react';

const AdminInventoryList = () => {
  const { hasPermission } = usePermissions();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchInventory = useCallback(async (searchTerm) => {
    try {
      setLoading(true);
      const params = searchTerm ? { search: searchTerm } : {};
      const res = await adminAPI.getInventory(params);
      setInventory(res.data);
    } catch (err) {
      setError('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInventory(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fetchInventory]);

  const openEdit = (item) => {
    setError('');
    setEditItem(item);
    setEditForm({
      total_quantity: item.total_quantity,
      available_quantity: item.available_quantity,
      reserved_quantity: item.reserved_quantity,
      low_stock_threshold: item.low_stock_threshold,
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {};
      if (editForm.total_quantity !== editItem.total_quantity) {
        payload.total_quantity = editForm.total_quantity;
      }
      if (editForm.available_quantity !== editItem.available_quantity) {
        payload.available_quantity = editForm.available_quantity;
      }
      if (editForm.reserved_quantity !== editItem.reserved_quantity) {
        payload.reserved_quantity = editForm.reserved_quantity;
      }
      if (editForm.low_stock_threshold !== editItem.low_stock_threshold) {
        payload.low_stock_threshold = editForm.low_stock_threshold;
      }
      if (Object.keys(payload).length === 0) {
        setEditItem(null);
        return;
      }
      await adminAPI.updateInventory(editItem.product_id, payload);
      setEditItem(null);
      fetchInventory(search);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update inventory');
    } finally {
      setSaving(false);
    }
  };

  const StockBadge = ({ item }) => {
    if (item.available_quantity <= 0) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg text-xs font-medium whitespace-nowrap bg-red-50 text-red-600">
          <Archive className="w-3 h-3" />
          <span>Out of Stock</span>
        </span>
      );
    }
    if (item.low_stock) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg text-xs font-medium whitespace-nowrap bg-yellow-50 text-yellow-700">
          <AlertTriangle className="w-3 h-3" />
          <span>Low Stock</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg text-xs font-medium whitespace-nowrap bg-green-50 text-green-600">
        <ShoppingBag className="w-3 h-3" />
        <span>In Stock</span>
      </span>
    );
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage stock levels</p>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by product name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all bg-white"
          />
        </div>
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
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Product</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Total</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Available</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Reserved</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Status</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Threshold</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Last Restocked</th>
                <th className="text-right px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8}>
                    <div className="flex items-center justify-center py-12">
                      <div className="flex items-center space-x-3">
                        <div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-gray-400">Loading inventory...</span>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : inventory.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                      <ClipboardList className="w-12 h-12 mb-3 text-gray-200" />
                      <p className="text-sm font-medium text-gray-500 mb-1">No inventory records found</p>
                      <p className="text-xs text-gray-400">
                        {search ? 'Try a different search term' : 'Add products to see inventory data'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                inventory.map((item, index) => (
                  <motion.tr
                    key={item.product_id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                          <Package className="w-4 h-4 text-gray-400" />
                        </div>
                        <span className="font-medium text-gray-900">{item.product_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{item.total_quantity}</td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${
                        item.available_quantity <= 0
                          ? 'text-red-600'
                          : item.low_stock
                          ? 'text-yellow-600'
                          : 'text-green-600'
                      }`}>
                        {item.available_quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{item.reserved_quantity}</td>
                    <td className="px-4 py-3">
                      <StockBadge item={item} />
                    </td>
                    <td className="px-4 py-3 text-gray-500">{item.low_stock_threshold}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {item.last_restocked
                        ? new Date(item.last_restocked).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {hasPermission(Permissions.INVENTORY_UPDATE) ? (
                        item.has_variants ? (
                          <span
                            className="inline-flex p-2 text-gray-300 cursor-not-allowed rounded-lg"
                            title="Inventory is managed via variant CRUD for products with variants"
                          >
                            <Edit3 className="w-4 h-4" />
                          </span>
                        ) : (
                          <button
                            onClick={() => openEdit(item)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )
                      ) : null}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit inventory modal */}
      <AnimatePresence>
        {editItem && (
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
              className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-auto max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-gray-900">Edit Inventory</h3>
                  <p className="text-sm text-gray-500 mt-0.5 truncate">{editItem.product_name}</p>
                </div>
                <button
                  onClick={() => { setEditItem(null); setError(''); }}
                  className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 ml-3"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-xl mb-4 text-sm">
                  {error}
                </div>
              )}

              {editItem?.has_variants ? (
                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl text-sm">
                  This product has variants. Inventory is managed automatically through variant CRUD operations.
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Total Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.total_quantity}
                      onChange={(e) =>
                        setEditForm({ ...editForm, total_quantity: parseInt(e.target.value) || 0 })
                      }
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Available Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.available_quantity}
                      onChange={(e) =>
                        setEditForm({ ...editForm, available_quantity: parseInt(e.target.value) || 0 })
                      }
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Reserved Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.reserved_quantity}
                      onChange={(e) =>
                        setEditForm({ ...editForm, reserved_quantity: parseInt(e.target.value) || 0 })
                      }
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Low Stock Threshold
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.low_stock_threshold}
                      onChange={(e) =>
                        setEditForm({ ...editForm, low_stock_threshold: parseInt(e.target.value) || 0 })
                      }
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 justify-end mt-6">
                <button
                  onClick={() => { setEditItem(null); setError(''); }}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all text-sm w-full sm:w-auto"
                >
                  Cancel
                </button>
                {!editItem?.has_variants && (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all text-sm w-full sm:w-auto disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminInventoryList;
