import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { shoppingAPI } from '../api/endpoints';
import { clearCart } from '../store/slices/cartSlice';
import { motion } from 'framer-motion';
import { ShieldCheck, Truck, RotateCcw, Sparkles, Check, Tag, X, CheckCircle, Zap } from 'lucide-react';
import ProductImage from '../components/ProductImage';

const PLACEHOLDER = '/images/placeholder-product.svg';

const steps = [
  { label: 'Cart', icon: Check },
  { label: 'Address', icon: Check },
  { label: 'Payment', icon: Check },
  { label: 'Review', icon: Check },
];

const CheckoutPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [addresses, setAddresses] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [calc, setCalc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    address_line_1: '', address_line_2: '',
    city: '', state: '', postal_code: '',
    country: 'India', address_type: 'residential', is_default: false,
  });

  const runCalculation = useCallback(async (code) => {
    try {
      const res = await shoppingAPI.calculateCart({ coupon_code: code || null });
      setCalc(res.data);
    } catch {
      setCalc(null);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    fetchData();
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [addressesRes, cartRes] = await Promise.all([
        shoppingAPI.getAddresses(),
        shoppingAPI.getCart(),
      ]);
      setAddresses(addressesRes.data);
      setCartItems(cartRes.data);
      const defaultAddr = addressesRes.data.find((a) => a.is_default);
      if (defaultAddr) setSelectedAddressId(defaultAddr.id);
      else if (addressesRes.data.length > 0) setSelectedAddressId(addressesRes.data[0].id);
      await runCalculation(null);
    } catch {
      setError('Failed to load checkout data');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    await runCalculation(couponCode.trim());
  };

  const handleRemoveCoupon = async () => {
    setCouponCode('');
    await runCalculation(null);
  };

  const handleCreateAddress = async (e) => {
    e.preventDefault();
    try {
      const res = await shoppingAPI.createAddress(addressForm);
      setAddresses((prev) => [...prev, res.data]);
      setSelectedAddressId(res.data.id);
      setShowAddressForm(false);
      setAddressForm({ first_name: '', last_name: '', email: '', phone: '', address_line_1: '', address_line_2: '', city: '', state: '', postal_code: '', country: 'India', address_type: 'residential', is_default: false });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create address');
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) { setError('Please select a shipping address'); return; }
    try {
      setPlacing(true);
      setError(null);
      const res = await shoppingAPI.checkout({
        shipping_address_id: selectedAddressId,
        coupon_code: calc?.applied_coupon?.code || null,
      });
      dispatch(clearCart());
      navigate(`/orders/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-text mb-8">Checkout</h1>
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-gray-200 rounded-lg" />
          <div className="h-48 bg-gray-200 rounded-lg" />
          <div className="h-40 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-text mb-6">Checkout</h1>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((step, i) => {
          const active = i <= 2;
          return (
            <div key={step.label} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                active ? 'bg-gold text-white' : 'bg-gray-100 text-gray-300'
              }`}>
                {i + 1}
              </div>
              <span className={`text-xs font-medium ${active ? 'text-text' : 'text-gray-300'}`}>
                {step.label}
              </span>
              {i < steps.length - 1 && (
                <div className={`w-8 h-0.5 ${active ? 'bg-gold' : 'bg-gray-100'}`} />
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-6">
          {/* Shipping Address */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-text mb-4">Shipping Address</h2>
            {addresses.length === 0 && !showAddressForm ? (
              <div>
                <p className="text-gray-500 mb-4">No addresses found.</p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowAddressForm(true)}
                  className="bg-gold text-white px-4 py-2 rounded-lg font-semibold"
                >
                  Add New Address
                </motion.button>
              </div>
            ) : (
              <div className="space-y-3">
                {addresses.map((addr) => (
                  <label
                    key={addr.id}
                    className={`block p-3 border rounded-lg cursor-pointer ${
                      selectedAddressId === addr.id ? 'border-gold bg-gold bg-opacity-5' : 'border-gray-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={selectedAddressId === addr.id}
                      onChange={() => setSelectedAddressId(addr.id)}
                      className="sr-only"
                    />
                    <p className="font-semibold text-text">{addr.first_name} {addr.last_name}</p>
                    <p className="text-sm text-gray-600">{addr.address_line_1}{addr.address_line_2 ? `, ${addr.address_line_2}` : ''}</p>
                    <p className="text-sm text-gray-600">{addr.city}, {addr.state} - {addr.postal_code}</p>
                    <p className="text-sm text-gray-600">Phone: {addr.phone}</p>
                  </label>
                ))}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowAddressForm(!showAddressForm)}
                  className="text-gold font-semibold text-sm"
                >
                  {showAddressForm ? 'Cancel' : '+ Add New Address'}
                </motion.button>
              </div>
            )}

            {showAddressForm && (
              <form onSubmit={handleCreateAddress} className="mt-4 space-y-3 border-t pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <input required placeholder="First Name" value={addressForm.first_name} onChange={(e) => setAddressForm((p) => ({ ...p, first_name: e.target.value }))} />
                  <input required placeholder="Last Name" value={addressForm.last_name} onChange={(e) => setAddressForm((p) => ({ ...p, last_name: e.target.value }))} />
                  <input required placeholder="Email" type="email" value={addressForm.email} onChange={(e) => setAddressForm((p) => ({ ...p, email: e.target.value }))} className="col-span-2 p-2 border rounded" />
                  <input required placeholder="Phone" value={addressForm.phone} onChange={(e) => setAddressForm((p) => ({ ...p, phone: e.target.value }))} className="col-span-2 p-2 border rounded" />
                  <input required placeholder="Address Line 1" value={addressForm.address_line_1} onChange={(e) => setAddressForm((p) => ({ ...p, address_line_1: e.target.value }))} className="col-span-2 p-2 border rounded" />
                  <input placeholder="Address Line 2" value={addressForm.address_line_2} onChange={(e) => setAddressForm((p) => ({ ...p, address_line_2: e.target.value }))} className="col-span-2 p-2 border rounded" />
                  <input required placeholder="City" value={addressForm.city} onChange={(e) => setAddressForm((p) => ({ ...p, city: e.target.value }))} />
                  <input required placeholder="State" value={addressForm.state} onChange={(e) => setAddressForm((p) => ({ ...p, state: e.target.value }))} />
                  <input required placeholder="Postal Code" value={addressForm.postal_code} onChange={(e) => setAddressForm((p) => ({ ...p, postal_code: e.target.value }))} />
                  <input placeholder="Country" value={addressForm.country} onChange={(e) => setAddressForm((p) => ({ ...p, country: e.target.value }))} />
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="bg-gold text-white px-4 py-2 rounded-lg font-semibold"
                >
                  Save Address
                </motion.button>
              </form>
            )}
          </div>

          {/* Coupon */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="w-4 h-4 text-gold" />
              <h2 className="text-lg font-semibold text-text">Coupon Code</h2>
            </div>
            {calc?.applied_coupon ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-mono font-bold text-green-700">{calc.applied_coupon.code}</span>
                  {calc.coupon_discount > 0 && <span className="text-sm text-green-600">-₹{calc.coupon_discount} applied</span>}
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
                    className="flex-1 p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 font-mono uppercase"
                  />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleApplyCoupon}
                    className="bg-text text-white px-4 py-2 rounded-lg font-semibold text-sm"
                  >
                    Apply
                  </motion.button>
                </div>
                {calc?.coupon_error && <p className="text-red-500 text-xs mt-1.5">{calc.coupon_error}</p>}
              </>
            )}
          </div>

          {/* Free Shipping Badge */}
          {calc?.free_shipping && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
              <Truck className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Free shipping applied from active promotion!</span>
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6 sticky top-24">
            <h2 className="text-lg font-semibold text-text mb-4">Order Summary</h2>

            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
              {cartItems.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <ProductImage
                    variant="cart"
                    src={item.images?.[0]?.image_url || PLACEHOLDER}
                    alt={item.name}
                    className="w-12 h-12 rounded"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text">{item.name}</p>
                    {item.variant_size && <p className="text-xs text-text-muted">Size: {item.variant_size}</p>}
                    {item.variant_sku && <p className="text-xs text-text-muted">SKU: {item.variant_sku}</p>}
                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold">₹{item.price} x {item.quantity}</p>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>₹{calc?.subtotal || 0}</span>
              </div>
              {calc?.promotion_discount > 0 && (
                <div className="flex justify-between text-indigo-600">
                  <div className="flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    <span>Promotion ({calc?.applied_promotions?.[0]?.name})</span>
                  </div>
                  <span>-₹{calc.promotion_discount}</span>
                </div>
              )}
              {calc?.coupon_discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <div className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    <span>Coupon ({calc?.applied_coupon?.code})</span>
                  </div>
                  <span>-₹{calc.coupon_discount}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span>{calc?.shipping === 0 ? 'FREE' : `₹${calc?.shipping || 0}`}</span>
              </div>
              {(calc?.tax || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span>₹{calc.tax}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total</span>
                <span className="text-gold">₹{calc?.grand_total || 0}</span>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handlePlaceOrder}
              disabled={placing || cartItems.length === 0}
              className="w-full bg-gold text-white py-3 rounded-lg font-semibold mt-6 hover:bg-opacity-90 disabled:opacity-50"
            >
              {placing ? 'Placing Order...' : 'Place Order'}
            </motion.button>

            {/* Trust Signals */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: ShieldCheck, label: 'Secure Checkout', sub: '100% safe payment' },
                  { icon: Truck, label: 'Fast Shipping', sub: 'Free on orders ₹499+' },
                  { icon: RotateCcw, label: '7-Day Returns', sub: 'Easy & hassle-free' },
                  { icon: Sparkles, label: 'Premium Quality', sub: 'Handpicked fabrics' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-start gap-2">
                      <Icon className="w-4 h-4 text-gold mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-text">{item.label}</p>
                        <p className="text-[10px] text-text-muted">{item.sub}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
