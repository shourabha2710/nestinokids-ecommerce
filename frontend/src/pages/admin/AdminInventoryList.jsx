import React, { useEffect, useState, useCallback } from 'react';
import { adminAPI } from '../../api/endpoints';

const AdminInventoryList = () => {
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
    setEditItem(item);
    setEditForm({
      available_quantity: item.available_quantity,
      reserved_quantity: item.reserved_quantity,
      low_stock_threshold: item.low_stock_threshold,
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {};
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Inventory</h1>
        <input
          type="text"
          placeholder="Search by product name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-gold"
        />
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
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Product</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Total</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Available</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Reserved</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Threshold</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Last Restocked</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                      <span className="text-gray-400">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : inventory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-400">
                    No inventory records found
                  </td>
                </tr>
              ) : (
                inventory.map((item) => (
                  <tr key={item.product_id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{item.product_name}</td>
                    <td className="px-4 py-3">{item.total_quantity}</td>
                    <td className="px-4 py-3">{item.available_quantity}</td>
                    <td className="px-4 py-3">{item.reserved_quantity}</td>
                    <td className="px-4 py-3">
                      {item.available_quantity <= 0 ? (
                        <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-medium">
                          Out of Stock
                        </span>
                      ) : item.low_stock ? (
                        <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-medium">
                          Low Stock
                        </span>
                      ) : (
                        <span className="bg-green-100 text-green-600 px-2 py-1 rounded text-xs font-medium">
                          In Stock
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{item.low_stock_threshold}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {item.last_restocked
                        ? new Date(item.last_restocked).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEdit(item)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-xs"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Edit Inventory</h3>
            <p className="text-sm text-gray-500 mb-4">{editItem.product_name}</p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Available Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  value={editForm.available_quantity}
                  onChange={(e) =>
                    setEditForm({ ...editForm, available_quantity: parseInt(e.target.value) || 0 })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reserved Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  value={editForm.reserved_quantity}
                  onChange={(e) =>
                    setEditForm({ ...editForm, reserved_quantity: parseInt(e.target.value) || 0 })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Low Stock Threshold
                </label>
                <input
                  type="number"
                  min="0"
                  value={editForm.low_stock_threshold}
                  onChange={(e) =>
                    setEditForm({ ...editForm, low_stock_threshold: parseInt(e.target.value) || 0 })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>
            </div>

            <div className="flex space-x-3 justify-end mt-6">
              <button
                onClick={() => {
                  setEditItem(null);
                  setError('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-gold text-gray-900 rounded-lg font-medium hover:bg-opacity-90 transition text-sm disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInventoryList;
