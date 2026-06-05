import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { shoppingAPI } from '../api/endpoints';
import { addToCart } from '../store/slices/cartSlice';
import { motion } from 'framer-motion';

const PLACEHOLDER = '/images/placeholder-product.svg';

const WishlistPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imgErrors, setImgErrors] = useState({});

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    fetchWishlist();
  }, [isAuthenticated]);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const res = await shoppingAPI.getWishlist();
      setItems(res.data);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (productId) => {
    try {
      await shoppingAPI.removeFromWishlist(productId);
      setItems((prev) => prev.filter((item) => item.id !== productId));
    } catch {
      fetchWishlist();
    }
  };

  const handleAddToCart = (item) => {
    dispatch(addToCart(item));
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-text mb-8">My Wishlist</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow animate-pulse">
              <div className="h-48 bg-gray-200 rounded-t-lg" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/4" />
                <div className="h-8 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-text mb-8">My Wishlist</h1>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <h2 className="text-xl font-semibold text-text mb-2">Your wishlist is empty</h2>
          <p className="text-gray-500 mb-6">Save your favorite items here.</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/')}
            className="bg-gold text-white px-8 py-3 rounded-lg font-semibold"
          >
            Browse Products
          </motion.button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow overflow-hidden"
            >
              <img
                src={imgErrors[item.id] ? PLACEHOLDER : (item.images?.[0]?.image_url || PLACEHOLDER)}
                alt={item.name}
                className="w-full h-48 object-cover cursor-pointer"
                onClick={() => navigate(`/products/${item.slug}`)}
                onError={() => setImgErrors((prev) => ({ ...prev, [item.id]: true }))}
              />
              <div className="p-4">
                <h3 className="font-semibold text-text mb-2">{item.name}</h3>
                <p className="text-gold font-bold mb-3">
                  ₹{item.discount_price || item.price}
                  {item.discount_price && (
                    <span className="text-sm text-gray-400 line-through ml-2">₹{item.price}</span>
                  )}
                </p>
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleAddToCart(item)}
                    className="flex-1 bg-gold text-white py-2 rounded-lg font-semibold hover:bg-opacity-90"
                  >
                    Add to Cart
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleRemove(item.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WishlistPage;
