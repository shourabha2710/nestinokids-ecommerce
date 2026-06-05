import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { shoppingAPI } from '../api/endpoints';
import { clearCart, setCartItems } from '../store/slices/cartSlice';
import { motion } from 'framer-motion';

const PLACEHOLDER = '/images/placeholder-product.svg';

const CartPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imgErrors, setImgErrors] = useState({});

  const fetchCart = async () => {
    try {
      setLoading(true);
      const res = await shoppingAPI.getCart();
      setItems(res.data);
      dispatch(setCartItems(res.data));
      setError(null);
    } catch (err) {
      setError('Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchCart();
  }, [isAuthenticated]);

  const handleQuantityChange = async (productId, newQty) => {
    if (newQty < 1) return;
    try {
      await shoppingAPI.updateCartItem(productId, newQty);
      setItems((prev) =>
        prev.map((item) =>
          item.id === productId
            ? { ...item, quantity: newQty, total: item.price * newQty }
            : item
        )
      );
    } catch {
      fetchCart();
    }
  };

  const handleRemove = async (productId) => {
    try {
      await shoppingAPI.removeFromCart(productId);
      setItems((prev) => prev.filter((item) => item.id !== productId));
    } catch {
      fetchCart();
    }
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-text mb-4">Please Login</h2>
        <p className="text-gray-600 mb-6">You need to be logged in to view your cart.</p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/login')}
          className="bg-gold text-white px-8 py-3 rounded-lg font-semibold"
        >
          Login
        </motion.button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-text mb-8">Shopping Cart</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 p-4 bg-white rounded-lg shadow animate-pulse">
              <div className="w-24 h-24 bg-gray-200 rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/4" />
                <div className="h-8 bg-gray-200 rounded w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-text mb-8">Shopping Cart</h1>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{error}</div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-16">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h2 className="text-xl font-semibold text-text mb-2">Your cart is empty</h2>
          <p className="text-gray-500 mb-6">Looks like you haven't added anything yet.</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/')}
            className="bg-gold text-white px-8 py-3 rounded-lg font-semibold"
          >
            Continue Shopping
          </motion.button>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-4 p-4 bg-white rounded-lg shadow"
            >
              <img
                src={imgErrors[item.id] ? PLACEHOLDER : (item.images?.[0]?.image_url || PLACEHOLDER)}
                alt={item.name}
                className="w-24 h-24 object-cover rounded"
                onError={() => setImgErrors((prev) => ({ ...prev, [item.id]: true }))}
              />
              <div className="flex-1">
                <h3 className="font-semibold text-text">{item.name}</h3>
                <p className="text-gold font-bold mt-1">₹{item.price}</p>
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                    className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-semibold">{item.quantity}</span>
                  <button
                    onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                    className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-text">₹{item.total}</p>
                <button
                  onClick={() => handleRemove(item.id)}
                  className="text-sm text-red-500 hover:text-red-700 mt-2"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          ))}

          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <div className="flex justify-between items-center text-lg">
              <span className="font-semibold text-text">Subtotal</span>
              <span className="font-bold text-gold">₹{subtotal}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Shipping calculated at checkout</p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/checkout')}
              className="w-full bg-gold text-white py-3 rounded-lg font-semibold mt-4 hover:bg-opacity-90"
            >
              Proceed to Checkout
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
