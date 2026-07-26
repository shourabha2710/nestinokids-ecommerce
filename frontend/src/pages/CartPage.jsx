import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { shoppingAPI } from '../api/endpoints';
import { clearCart, setCartItems, applyCoupon, removeCoupon, setPromotion } from '../store/slices/cartSlice';
import promotionService from '../services/promotionService';
import MobilePageHeader from '../components/MobilePageHeader';
import { motion, AnimatePresence } from 'framer-motion';
import ProductImage from '../components/ProductImage';
import { Tag, X, CheckCircle, Zap, Truck } from 'lucide-react';

const PLACEHOLDER = '/images/placeholder-product.svg';

const CartPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const cartCoupon = useSelector((state) => state.cart.coupon);
  const cartCouponDiscount = useSelector((state) => state.cart.couponDiscount);
  const cartPromotion = useSelector((state) => state.cart.promotion);
  const cartPromotionDiscount = useSelector((state) => state.cart.promotionDiscount);
  const cartFreeShipping = useSelector((state) => state.cart.freeShipping);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState(null);
  const [couponSuccess, setCouponSuccess] = useState(null);

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

  useEffect(() => {
    if (!items.length) return;
    let cancelled = false;
    const subtotal = items.reduce((sum, item) => sum + (item.total || item.price * item.quantity), 0);
    promotionService.evaluateCart(items, subtotal).then((res) => {
      if (cancelled) return;
      const d = res.data;
      dispatch(setPromotion({
        promotion: d.eligible ? d : null,
        discount: d.discount_amount || 0,
        freeShipping: d.free_shipping || false,
      }));
    }).catch(() => {
      if (!cancelled) dispatch(setPromotion(null));
    });
    return () => { cancelled = true; };
  }, [items]);

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
    } catch {
      fetchCart();
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      setCouponLoading(true);
      setCouponError(null);
      setCouponSuccess(null);
      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      const res = await shoppingAPI.validateCoupon(couponCode.trim(), { total_amount: subtotal });
      const data = res.data;
      const discount = data.discount_type === 'percentage'
        ? Math.min((subtotal * data.discount_value) / 100, data.maximum_discount || Infinity)
        : data.discount_value;
      dispatch(applyCoupon({ coupon: data, discount }));
      setCouponSuccess('Coupon applied successfully!');
      setCouponError(null);
    } catch (err) {
      dispatch(removeCoupon());
      setCouponError(err.response?.data?.detail || 'Invalid coupon');
      setCouponSuccess(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    dispatch(removeCoupon());
    setCouponCode('');
    setCouponError(null);
    setCouponSuccess(null);
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);

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

          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <div className="flex justify-between items-center text-lg mb-4">
              <span className="font-semibold text-text">Subtotal</span>
              <span className="font-bold text-gold">₹{subtotal}</span>
            </div>

            {/* Coupon Section */}
            <div className="border-t pt-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4 text-gold" />
                <span className="text-sm font-semibold text-text">Coupon Code</span>
              </div>
              {cartCoupon ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-mono font-bold text-green-700">{cartCoupon.code}</span>
                    <span className="text-sm text-green-600">-{cartCouponDiscount > 0 ? `₹${cartCouponDiscount}` : ''} applied</span>
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
                      onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(null); }}
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
                  {couponError && <p className="text-red-500 text-xs mt-1.5">{couponError}</p>}
                  {couponSuccess && <p className="text-green-600 text-xs mt-1.5">{couponSuccess}</p>}
                </>
              )}
            </div>

            {/* Active Promotion */}
            {cartPromotion?.eligible && (
              <div className="border-t pt-4 mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-semibold text-text">Active Promotion</span>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-indigo-700">{cartPromotion.name}</p>
                      {cartPromotion.badge_text && (
                        <p className="text-xs text-indigo-500">{cartPromotion.badge_text}</p>
                      )}
                    </div>
                    {cartPromotionDiscount > 0 && (
                      <span className="text-sm font-bold text-green-600">-₹{cartPromotionDiscount}</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Free Shipping Badge */}
            {cartFreeShipping && (
              <div className="flex items-center gap-2 text-green-600 text-sm font-semibold mb-2">
                <Truck className="w-4 h-4" />
                <span>Free shipping on this order!</span>
              </div>
            )}

            <p className="text-sm text-gray-500 mt-1">
              {cartFreeShipping ? (
                <span className="text-green-600 font-medium">Free shipping applied</span>
              ) : (
                'Shipping calculated at checkout'
              )}
            </p>
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
