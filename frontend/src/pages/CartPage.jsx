import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { shoppingAPI } from '../api/endpoints';
import { clearCart, setCartItems, setCalculation } from '../store/slices/cartSlice';
import MobilePageHeader from '../components/MobilePageHeader';
import MarketplaceCartSection from '../components/marketplace/MarketplaceCartSection';
import { motion } from 'framer-motion';
import ProductImage from '../components/ProductImage';
import { Tag, X, CheckCircle, Zap, Truck } from 'lucide-react';

const PLACEHOLDER = '/images/placeholder-product.svg';

const CartPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const calc = useSelector((state) => state.cart.calculation);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  const runCalculation = useCallback(async (code) => {
    try {
      const res = await shoppingAPI.calculateCart({ coupon_code: code || null });
      dispatch(setCalculation(res.data));
    } catch {
      dispatch(setCalculation(null));
    }
  }, [dispatch]);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const res = await shoppingAPI.getCart();
      setItems(res.data);
      dispatch(setCartItems(res.data));
      setError(null);
      await runCalculation(null);
    } catch {
      setError('Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchCart();
  }, [isAuthenticated]);

  const getProductId = (item) => item.product_id || item.id;
  const getItemKey = (item) => `${item.product_id || item.id}_${item.variant_id ?? 'null'}`;

  const handleQuantityChange = async (item, newQty) => {
    if (newQty < 1) return;
    const prevItems = items;
    try {
      await shoppingAPI.updateCartItem(getProductId(item), newQty, item.variant_id);
      const updated = prevItems.map((i) =>
        getItemKey(i) === getItemKey(item)
          ? { ...i, quantity: newQty, total: i.price * newQty }
          : i
      );
      setItems(updated);
      dispatch(setCartItems(updated));
      await runCalculation(calc?.applied_coupon?.code || null);
    } catch {
      fetchCart();
    }
  };

  const handleRemove = async (item) => {
    const prevItems = items;
    try {
      await shoppingAPI.removeFromCart(getProductId(item), item.variant_id);
      const updated = prevItems.filter((i) => getItemKey(i) !== getItemKey(item));
      setItems(updated);
      dispatch(setCartItems(updated));
      await runCalculation(calc?.applied_coupon?.code || null);
    } catch {
      fetchCart();
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    await runCalculation(couponCode.trim());
    setCouponLoading(false);
  };

  const handleRemoveCoupon = async () => {
    setCouponCode('');
    await runCalculation(null);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-text mb-4">Please Login</h2>
        <p className="text-gray-600 mb-6">You need to be logged in to view your cart.</p>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate('/login')} className="bg-gold text-white px-8 py-3 rounded-lg font-semibold">
          Login
        </motion.button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <MobilePageHeader title="Shopping Cart" />
        <h1 className="hidden md:block text-2xl font-bold text-text mb-8">Shopping Cart</h1>
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
      <MobilePageHeader title="Shopping Cart" />
      <h1 className="hidden md:block text-2xl font-bold text-text mb-8">Shopping Cart</h1>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{error}</div>}

      {items.length === 0 ? (
        <div className="text-center py-16">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h2 className="text-xl font-semibold text-text mb-2">Your cart is empty</h2>
          <p className="text-gray-500 mb-6">Looks like you haven't added anything yet.</p>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate('/')} className="bg-gold text-white px-8 py-3 rounded-lg font-semibold">
            Continue Shopping
          </motion.button>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <motion.div key={getItemKey(item)} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4 p-4 bg-white rounded-lg shadow">
              <ProductImage variant="cart" src={item.images?.[0]?.image_url || PLACEHOLDER} alt={item.name} className="w-24 h-24 rounded" />
              <div className="flex-1">
                <h3 className="font-semibold text-text">{item.name}</h3>
                {item.variant_size && <p className="text-sm text-text-muted">Size: {item.variant_size}</p>}
                {item.variant_sku && <p className="text-sm text-text-muted">SKU: {item.variant_sku}</p>}
                <p className="text-gold font-bold mt-1">₹{item.price}</p>
                <div className="flex items-center gap-3 mt-3">
                  <button onClick={() => handleQuantityChange(item, item.quantity - 1)} className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100">-</button>
                  <span className="w-8 text-center font-semibold">{item.quantity}</span>
                  <button onClick={() => handleQuantityChange(item, item.quantity + 1)} className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100">+</button>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-text">₹{item.total}</p>
                <button onClick={() => handleRemove(item)} className="text-sm text-red-500 hover:text-red-700 mt-2">Remove</button>
              </div>
            </motion.div>
          ))}

          <MarketplaceCartSection items={items} />

          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <div className="flex justify-between items-center text-lg mb-4">
              <span className="font-semibold text-text">Subtotal ({calc?.item_count || 0} items)</span>
              <span className="font-bold text-gold">₹{calc?.subtotal || 0}</span>
            </div>

            {/* Coupon Section */}
            <div className="border-t pt-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4 text-gold" />
                <span className="text-sm font-semibold text-text">Coupon Code</span>
              </div>
              {calc?.applied_coupon ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-mono font-bold text-green-700">{calc.applied_coupon.code}</span>
                    <span className="text-sm text-green-600">-₹{calc.coupon_discount} applied</span>
                  </div>
                  <button onClick={handleRemoveCoupon} className="text-gray-400 hover:text-red-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Enter coupon code"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 font-mono uppercase"
                    />
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                      className="px-4 py-2 bg-text text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                    >
                      {couponLoading ? '...' : 'Apply'}
                    </motion.button>
                  </div>
                  {calc?.coupon_error && <p className="text-red-500 text-xs mt-1.5">{calc.coupon_error}</p>}
                </>
              )}
            </div>

            {/* Active Promotion */}
            {calc?.applied_promotions?.length > 0 && (
              <div className="border-t pt-4 mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-semibold text-text">Active Promotion</span>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-indigo-700">{calc.applied_promotions[0].name}</p>
                      {calc.applied_promotions[0].badge_text && (
                        <p className="text-xs text-indigo-500">{calc.applied_promotions[0].badge_text}</p>
                      )}
                    </div>
                    {calc.promotion_discount > 0 && (
                      <span className="text-sm font-bold text-green-600">-₹{calc.promotion_discount}</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Free Shipping Badge */}
            {calc?.free_shipping && (
              <div className="flex items-center gap-2 text-green-600 text-sm font-semibold mb-2">
                <Truck className="w-4 h-4" />
                <span>Free shipping on this order!</span>
              </div>
            )}

            {/* Free shipping threshold progress */}
            {!calc?.free_shipping && calc?.free_shipping_threshold != null && (
              calc.subtotal >= calc.free_shipping_threshold ? (
                <div className="flex items-center gap-2 text-green-600 text-sm font-semibold mb-2">
                  <Truck className="w-4 h-4" />
                  <span>Free shipping unlocked!</span>
                </div>
              ) : (
                <p className="text-sm text-gray-500 mb-2 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-gold" />
                  Add <span className="font-semibold text-gold">₹{Math.max(0, Math.ceil(calc.free_shipping_threshold - calc.subtotal)).toFixed(0)}</span> more for FREE shipping
                </p>
              )
            )}

            {/* Shipping */}
            {!calc?.free_shipping && (
              <p className="text-sm text-gray-500 mt-1">
                Shipping: {calc?.shipping === 0 ? 'FREE' : `₹${calc?.shipping}`}
              </p>
            )}

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
