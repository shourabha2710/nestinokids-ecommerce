import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { adminAPI } from '../../services/adminApi';
import { usePermissions } from '../../hooks/usePermissions';
import { Permissions } from '../../constants/permissions';
import {
  Package,
  Plus,
  Search,
  Edit3,
  Trash2,
  AlertTriangle,
  ImageOff,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

const AdminProductList = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [imgErrors, setImgErrors] = useState({});
  const [expandedRowId, setExpandedRowId] = useState(null);

  const toggleRow = (productId) => {
    setExpandedRowId((prev) => (prev === productId ? null : productId));
  };

  const getComputedStock = (product) => {
    if (product.variants?.length > 0) {
      return product.variants.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0);
    }
    return product.quantity || 0;
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getProducts({ limit: 200 });
      setProducts(res.data);
      setFilteredProducts(res.data);
    } catch (err) {
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    let result = [...products];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.category?.name?.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      let aVal, bVal;
      if (sortField === 'price' || sortField === 'discount_price') {
        aVal = Number(a[sortField]) || 0;
        bVal = Number(b[sortField]) || 0;
      } else if (sortField === 'quantity') {
        aVal = getComputedStock(a);
        bVal = getComputedStock(b);
      } else {
        aVal = String(a[sortField] || '').toLowerCase();
        bVal = String(b[sortField] || '').toLowerCase();
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    setFilteredProducts(result);
  }, [searchQuery, products, sortField, sortDir]);

  const handleDelete = async (id) => {
    try {
      await adminAPI.deleteProduct(id);
      setDeleteId(null);
      fetchProducts();
    } catch (err) {
      setError('Failed to delete product');
    }
  };

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 text-gray-300" />;
    return (
      <ChevronDown
        className={`w-3 h-3 transition-transform ${sortDir === 'desc' ? 'rotate-180' : ''} ${
          sortField === field ? 'text-gold' : ''
        }`}
      />
    );
  };

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your product catalog</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your product catalog</p>
        </div>
        {hasPermission(Permissions.PRODUCT_CREATE) && (
          <button
            onClick={() => navigate('/products/new')}
            className="inline-flex items-center justify-center space-x-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-gray-800 transition-all text-sm w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all bg-white"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Product</th>
                <th
                  className="text-left px-4 py-3.5 font-semibold text-gray-600 cursor-pointer select-none whitespace-nowrap"
                  onClick={() => toggleSort('sku')}
                >
                  <div className="flex items-center space-x-1">
                    <span>SKU</span>
                    <SortIcon field="sku" />
                  </div>
                </th>
                <th
                  className="text-left px-4 py-3.5 font-semibold text-gray-600 cursor-pointer select-none whitespace-nowrap"
                  onClick={() => toggleSort('price')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Price</span>
                    <SortIcon field="price" />
                  </div>
                </th>
                <th
                  className="text-left px-4 py-3.5 font-semibold text-gray-600 cursor-pointer select-none whitespace-nowrap"
                  onClick={() => toggleSort('quantity')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Stock</span>
                    <SortIcon field="quantity" />
                  </div>
                </th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Featured</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Active</th>
                <th className="text-right px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                      <Package className="w-12 h-12 mb-3 text-gray-200" />
                      <p className="text-sm font-medium text-gray-500 mb-1">No products found</p>
                      <p className="text-xs text-gray-400">
                        {searchQuery ? 'Try a different search term' : 'Get started by adding your first product'}
                      </p>
                      {!searchQuery && hasPermission(Permissions.PRODUCT_CREATE) && (
                        <button
                          onClick={() => navigate('/products/new')}
                          className="mt-4 inline-flex items-center space-x-1.5 text-sm font-medium text-gold hover:text-yellow-600 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Product</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.flatMap((product, index) => {
                  const isExpanded = expandedRowId === product.id;
                  const rows = [
                    <motion.tr
                      key={product.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      onClick={() => toggleRow(product.id)}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3 min-w-0">
                          <button
                            type="button"
                            className="p-0.5 text-gray-300 hover:text-gray-600 transition-colors flex-shrink-0"
                            tabIndex={-1}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {product.images?.[0] && !imgErrors[product.id] ? (
                              <img
                                src={product.images[0].image_url}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={() => setImgErrors((prev) => ({ ...prev, [product.id]: true }))}
                              />
                            ) : (
                              <ImageOff className="w-5 h-5 text-gray-300" />
                            )}
                          </div>
                          <div className="min-w-0 max-w-[120px] sm:max-w-[200px]">
                            <p className="font-medium text-gray-900 truncate">{product.name}</p>
                            {product.category?.name && (
                              <p className="text-xs text-gray-400 truncate">{product.category.name}</p>
                            )}
                            {product.variants?.length > 0 && (
                              <p className="text-xs text-blue-600 font-medium truncate">
                                {product.variants.length} {product.variants.length === 1 ? 'Variant' : 'Variants'}
                                {product.variants.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0) > 0 && (
                                  <> &bull; {product.variants.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0)} Units</>
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-500">{product.sku || '-'}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-semibold text-gray-900">
                          ₹{product.discount_price || product.price}
                        </span>
                        {product.discount_price && (
                          <span className="text-gray-400 line-through text-xs ml-1.5">
                            ₹{product.price}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                            (() => {
                              const stock = getComputedStock(product);
                              return stock <= 0
                                ? 'bg-red-50 text-red-600'
                                : stock <= 10
                                ? 'bg-yellow-50 text-yellow-700'
                                : 'bg-green-50 text-green-600';
                            })()
                          }`}
                        >
                          {(() => {
                            const stock = getComputedStock(product);
                            return stock <= 0 ? 'Out of stock' : `${stock} units`;
                          })()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {product.is_featured ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-gold/10 text-gold whitespace-nowrap">
                            Featured
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                            product.is_active
                              ? 'bg-green-50 text-green-600'
                              : 'bg-gray-50 text-gray-400'
                          }`}
                        >
                          {product.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {hasPermission(Permissions.PRODUCT_UPDATE) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/products/${product.id}/edit`); }}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              title="Edit"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                          {hasPermission(Permissions.PRODUCT_DELETE) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteId(product.id); }}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>,
                  ];

                  if (isExpanded) {
                    const variantStock =
                      product.variants?.length > 0
                        ? product.variants.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0)
                        : 0;

                    rows.push(
                      <tr key={`expanded-${product.id}`}>
                        <td colSpan={7} className="p-0 border-0">
                          <motion.div
                            initial={{ maxHeight: 0, opacity: 0 }}
                            animate={{ maxHeight: 500, opacity: 1 }}
                            exit={{ maxHeight: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="bg-gray-50 rounded-xl mx-4 mb-3 p-4">
                              {product.variants?.length > 0 ? (
                                <>
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    Variant Details
                                  </h4>
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="border-b border-gray-200">
                                        <th className="text-left py-1.5 pr-3 font-medium text-gray-500">Size</th>
                                        <th className="text-left py-1.5 pr-3 font-medium text-gray-500">SKU</th>
                                        <th className="text-left py-1.5 pr-3 font-medium text-gray-500">Quantity</th>
                                        <th className="text-left py-1.5 font-medium text-gray-500">Price Modifier</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {product.variants.map((v) => (
                                        <tr key={v.id} className="border-b border-gray-100 last:border-0">
                                          <td className="py-1.5 pr-3 font-medium text-gray-900">{v.size || '—'}</td>
                                          <td className="py-1.5 pr-3 font-mono text-gray-600">{v.sku}</td>
                                          <td className="py-1.5 pr-3 text-gray-600">{v.quantity}</td>
                                          <td className="py-1.5 text-gray-600">
                                            {Number(v.price_modifier) ? `${Number(v.price_modifier) > 0 ? '+' : ''}₹${v.price_modifier}` : '—'}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                  <div className="flex items-center justify-end mt-2 pt-2 border-t border-gray-200">
                                    <span className="text-xs font-medium text-gray-500">Total Stock: </span>
                                    <span className="text-sm font-bold text-gray-900 ml-1">{variantStock} units</span>
                                  </div>
                                </>
                              ) : (
                                <p className="text-sm text-gray-400 text-center py-2">No variants configured</p>
                              )}
                            </div>
                          </motion.div>
                        </td>
                      </tr>,
                    );
                  }

                  return rows;
                })
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
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete this product? All associated data will be permanently removed.
              </p>
              <div className="flex flex-col-reverse sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 justify-end">
                <button
                  onClick={() => setDeleteId(null)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all text-sm w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteId)}
                  className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all text-sm w-full sm:w-auto"
                >
                  Delete Product
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminProductList;
