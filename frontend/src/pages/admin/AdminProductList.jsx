import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../api/endpoints';

const AdminProductList = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getProducts({ limit: 200 });
      setProducts(res.data);
    } catch (err) {
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = async (id) => {
    try {
      await adminAPI.deleteProduct(id);
      setDeleteId(null);
      fetchProducts();
    } catch (err) {
      setError('Failed to delete product');
    }
  };

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Products</h1>
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
        <h1 className="text-2xl font-bold text-gray-800">Products</h1>
        <button
          onClick={() => navigate('/admin/products/new')}
          className="bg-gold text-gray-900 px-4 py-2 rounded-lg font-semibold hover:bg-opacity-90 transition text-sm"
        >
          + Add Product
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
                <th className="text-left px-4 py-3 font-semibold text-gray-600">SKU</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Price</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Stock</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Featured</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Active</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">
                    No products found
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-3">
                        {product.images?.[0] && (
                          <img
                            src={product.images[0].image_url}
                            alt=""
                            className="w-10 h-10 rounded object-cover bg-gray-100"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        )}
                        <span className="font-medium text-gray-800 truncate max-w-[200px]">
                          {product.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{product.sku}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium">₹{product.discount_price || product.price}</span>
                      {product.discount_price && (
                        <span className="text-gray-400 line-through text-xs ml-1">₹{product.price}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        product.quantity <= 0 ? 'bg-red-100 text-red-600' :
                        product.quantity <= 10 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-600'
                      }`}>
                        {product.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {product.is_featured ? (
                        <span className="text-green-500 font-medium">Yes</span>
                      ) : (
                        <span className="text-gray-400">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {product.is_active ? (
                        <span className="text-green-500 font-medium">Active</span>
                      ) : (
                        <span className="text-red-500 font-medium">Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => navigate(`/admin/products/${product.id}/edit`)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-xs mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteId(product.id)}
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

      {/* Delete confirmation modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Confirm Delete</h3>
            <p className="text-gray-600 text-sm mb-6">
              Are you sure you want to delete this product? This action cannot be undone.
            </p>
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProductList;
