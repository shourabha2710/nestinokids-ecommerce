import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Plus, Minus, Trash2, Truck, Loader2 } from 'lucide-react';
import { closeCartDrawer } from '../store/slices/uiSlice';
import { shoppingAPI, productsAPI, settingsAPI } from '../api/endpoints';

const PLACEHOLDER = '/images/placeholder-product.svg';

const CartDrawer = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { cartDrawerOpen } = useSelector((state) => state.ui);
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [freeThreshold, setFreeThreshold] = useState(999);
  const [updatingId, setUpdatingId] = useState(null);
  const [addingRecId, setAddingRecId] = useState(null);

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const res = await shoppingAPI.getCart();
      setItems(res.data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (cartDrawerOpen) {
      fetchCart();
      settingsAPI.getPublic().then((res) => {
        if (res.data?.free_shipping_threshold) setFreeThreshold(res.data.free_shipping_threshold);
      }).catch(() => {});
      productsAPI.getProducts({ limit: 4, sort: 'bestseller' })
        .then((res) => setRecommendations(Array.isArray(res.data) ? res.data.slice(0, 4) : []))
        .catch(() => {});
    }
  }, [cartDrawerOpen, fetchCart]);

  const handleQuantity = async (item, delta) => {
    const newQty = item.quantity + delta;
    if (newQty < 1) return;
    setUpdatingId(item.id);
    const prev = items;
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, quantity: newQty, total: i.price * newQty } : i));
    try {
      await shoppingAPI.updateCartItem(item.product_id || item.id, newQty);
    } catch {
      setItems(prev);
      fetchCart();
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (item) => {
    setUpdatingId(item.id);
    const prev = items;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    try {
      await shoppingAPI.removeFromCart(item.product_id || item.id);
    } catch {
      setItems(prev);
      fetchCart();
    } finally {
      setUpdatingId(null);
    }
  };

  const handleQuickAdd = async (product) => {
    setAddingRecId(product.id);
    try {
      await shoppingAPI.addToCart(product.id, { quantity: 1 });
      fetchCart();
    } catch {
      // silently fail
    } finally {
      setAddingRecId(null);
    }
  };

  const subtotal = items.reduce((sum, i) => sum + i.total, 0);
  const remaining = Math.max(0, freeThreshold - subtotal);
  const progressPct = Math.min(100, (subtotal / freeThreshold) * 100);
  const shipping = subtotal >= freeThreshold ? 0 : remaining;

  const closeAndNavigate = (path) => {
    dispatch(closeCartDrawer());
    navigate(path);
  };

  return (
    <AnimatePresence>
      {cartDrawerOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => dispatch(closeCartDrawer())}
            className="fixed inset-0 z-50 bg-black/40"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-gold" />
                <h2 className="text-lg font-bold text-text">Cart</h2>
                <span className="text-sm text-text-muted">({items.length})</span>
              </div>
              <button
                onClick={() => dispatch(closeCartDrawer())}
                className="p-1.5 text-text-muted hover:text-text rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Free shipping progress */}
            <div className="px-5 py-3 border-b border-gray-50 shrink-0">
              {remaining > 0 ? (
                <div>
                  <p className="text-xs text-text-muted mb-1.5">
                    <Truck size={12} className="inline mr-1 text-gold" />
                    Add <span className="font-semibold text-gold">₹{remaining.toFixed(0)}</span> more for FREE Shipping
                  </p>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(progressPct, 100)}%` }}
                      transition={{ duration: 0.5 }}
                      className="h-full bg-gold rounded-full"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                  <Truck size={12} />
                  You qualify for FREE Shipping!
                </p>
              )}
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
              {!isAuthenticated ? (
                <div className="text-center py-12">
                  <p className="text-text-muted text-sm mb-4">Login to view your cart</p>
                  <button
                    onClick={() => closeAndNavigate('/login')}
                    className="px-6 py-2 bg-gold text-white rounded-lg text-sm font-semibold"
                  >
                    Login
                  </button>
                </div>
              ) : loading && items.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-gold" />
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-text-muted text-sm mb-4">Your cart is empty</p>
                  <button
                    onClick={() => closeAndNavigate('/')}
                    className="px-6 py-2 bg-gold text-white rounded-lg text-sm font-semibold"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                items.map((item) => {
                  const imgUrl = item.images?.[0]?.image_url || PLACEHOLDER;
                  const productId = item.product_id || item.id;
                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex gap-3 p-3 bg-gray-50 rounded-xl"
                    >
                      <img
                        src={imgUrl}
                        alt={item.name}
                        className="w-16 h-16 rounded-lg object-cover bg-white flex-shrink-0"
                        onError={(e) => { e.target.src = PLACEHOLDER; }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text truncate">{item.name}</p>
                        <p className="text-xs text-text-muted mt-0.5">₹{item.price}</p>
                        {(item.stock_quantity !== undefined && item.stock_quantity <= 5) && (
                          <p className="text-[10px] text-red-500 font-medium mt-0.5">
                            Only {item.stock_quantity} left
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleQuantity(item, -1)}
                              disabled={item.quantity <= 1 || updatingId === item.id}
                              className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center hover:bg-white transition-colors disabled:opacity-40"
                            >
                              <Minus size={10} />
                            </button>
                            <span className="w-6 text-center text-xs font-semibold">{item.quantity}</span>
                            <button
                              onClick={() => handleQuantity(item, 1)}
                              disabled={updatingId === item.id}
                              className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center hover:bg-white transition-colors disabled:opacity-40"
                            >
                              <Plus size={10} />
                            </button>
                          </div>
                          <button
                            onClick={() => handleRemove(item)}
                            className="p-1 text-text-muted hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-text">₹{item.total}</p>
                      </div>
                    </motion.div>
                  );
                })
              )}

              {/* Recommendations */}
              {recommendations.length > 0 && items.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                    Frequently Bought Together
                  </p>
                  <div className="space-y-2">
                    {recommendations.map((rec) => {
                      const recImg = rec.images?.find((i) => i.is_primary)?.image_url || rec.images?.[0]?.image_url || PLACEHOLDER;
                      return (
                        <div key={rec.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                          <img src={recImg} alt={rec.name} className="w-10 h-10 rounded-lg object-cover bg-white" onError={(e) => { e.target.src = PLACEHOLDER; }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-text truncate">{rec.name}</p>
                            <p className="text-xs text-gold font-semibold">₹{rec.discount_price || rec.price}</p>
                          </div>
                          <button
                            onClick={() => handleQuickAdd(rec)}
                            disabled={addingRecId === rec.id}
                            className="px-3 py-1.5 bg-gold/10 text-gold rounded-lg text-xs font-semibold hover:bg-gold/20 transition-colors disabled:opacity-50 whitespace-nowrap"
                          >
                            {addingRecId === rec.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              '+ Add'
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Summary */}
            {items.length > 0 && (
              <div className="border-t border-gray-100 px-5 py-4 space-y-2 shrink-0 bg-white">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Subtotal</span>
                  <span className="font-semibold text-text">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Shipping</span>
                  <span className={`font-semibold ${shipping === 0 ? 'text-green-600' : 'text-text'}`}>
                    {shipping === 0 ? 'FREE' : `₹${shipping.toFixed(0)}`}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span className="text-gold">₹{(subtotal + shipping).toFixed(0)}</span>
                </div>
                <button
                  onClick={() => closeAndNavigate('/checkout')}
                  className="w-full mt-2 h-11 bg-gold text-white rounded-xl font-semibold text-sm shadow-premium hover:bg-gold-dark transition-colors"
                >
                  Checkout
                </button>
                <button
                  onClick={() => closeAndNavigate('/cart')}
                  className="w-full text-center text-xs text-text-muted hover:text-text transition-colors py-1"
                >
                  View Full Cart
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;
