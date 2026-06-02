import React, { useState } from 'react';
import { motion } from 'framer-motion';

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    discount_price: '',
    sku: '',
    category_id: '',
    quantity: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // API call to create product
    console.log('Creating product:', formData);
    setShowForm(false);
    setFormData({});
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-text">Product Management</h1>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(!showForm)}
          className="bg-gold text-white px-6 py-2 rounded-lg font-semibold"
        >
          {showForm ? 'Cancel' : 'Add Product'}
        </motion.button>
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-md p-6 mb-8"
        >
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-text mb-2">Product Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-2">SKU</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-text mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                rows="4"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-2">Price</label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-2">Discount Price</label>
              <input
                type="number"
                step="0.01"
                value={formData.discount_price}
                onChange={(e) => setFormData({ ...formData, discount_price: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-2">Quantity</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div className="md:col-span-2 flex space-x-4">
              <button
                type="submit"
                className="flex-1 bg-gold text-white py-2 rounded-lg font-semibold hover:bg-opacity-90"
              >
                Create Product
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-300 text-text py-2 rounded-lg font-semibold hover:bg-opacity-90"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-text">Product</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-text">SKU</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-text">Price</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-text">Stock</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-text">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                  No products found. Create your first product!
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="border-b hover:bg-ivory">
                  <td className="px-6 py-3 text-sm font-medium">{product.name}</td>
                  <td className="px-6 py-3 text-sm">{product.sku}</td>
                  <td className="px-6 py-3 text-sm">₹{product.price}</td>
                  <td className="px-6 py-3 text-sm">{product.quantity}</td>
                  <td className="px-6 py-3 text-sm space-x-2">
                    <button className="text-blue-600 hover:text-blue-800">Edit</button>
                    <button className="text-red-600 hover:text-red-800">Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductManagement;
