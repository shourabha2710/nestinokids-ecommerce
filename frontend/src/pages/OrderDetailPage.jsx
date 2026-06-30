import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { shoppingAPI, orderTrackingAPI, settingsAPI } from '../api/endpoints';
import MobilePageHeader from '../components/MobilePageHeader';
import { motion } from 'framer-motion';
import ProductImage from '../components/ProductImage';

const PLACEHOLDER = '/images/placeholder-product.svg';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  packed: 'bg-purple-100 text-purple-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  returned: 'bg-gray-100 text-gray-800',
};

const STATUS_STEPS = ['pending', 'confirmed', 'packed', 'shipped', 'delivered'];

const OrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [order, setOrder] = useState(null);
  const [tracking, setTracking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [whatsappNumber, setWhatsappNumber] = useState('');

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    fetchOrder();
    settingsAPI.getPublic().then((res) => {
      if (res.data?.whatsapp_number) setWhatsappNumber(res.data.whatsapp_number);
    }).catch(() => {});
  }, [id, isAuthenticated]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await shoppingAPI.getOrder(id);
      setOrder(res.data);
      const trackRes = await orderTrackingAPI.getTracking(id);
      setTracking(trackRes.data || []);
    } catch {
      setError('Order not found');
    } finally {
      setLoading(false);
    }
  };

  const currentStepIndex = STATUS_STEPS.indexOf(order?.status);
  const isTerminal = order?.status === 'cancelled' || order?.status === 'returned';
  const waNumber = whatsappNumber.replace(/[^0-9]/g, '');

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          <div className="h-32 bg-gray-200 rounded-lg" />
          <div className="h-40 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold text-text mb-4">{error || 'Order not found'}</h2>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/orders')}
          className="bg-gold text-white px-6 py-2 rounded-lg font-semibold"
        >
          Back to Orders
        </motion.button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <MobilePageHeader title={`Order #${order.order_number}`} className="mb-4 -mx-4 -mt-2" />
      <button onClick={() => navigate('/orders')} className="hidden md:inline-block text-gold font-semibold mb-6 hover:underline">
        &larr; Back to Orders
      </button>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Order #{order.order_number}</h1>
          <p className="text-gray-500 text-sm mt-1">
            Placed on {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <span className={`px-4 py-2 rounded-full text-sm font-semibold ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'}`}>
          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </span>
      </div>

      {/* Status Tracker */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        {!isTerminal ? (
          <div className="flex justify-between">
            {STATUS_STEPS.map((step, i) => (
              <div key={step} className="flex flex-col items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  i <= currentStepIndex ? 'bg-gold text-white' : 'bg-gray-200 text-gray-400'
                }`}>
                  {i < currentStepIndex ? '\u2713' : i + 1}
                </div>
                <p className={`text-xs mt-1 capitalize ${i <= currentStepIndex ? 'text-gold font-semibold' : 'text-gray-400'}`}>
                  {step}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-red-600 font-semibold">
            Order {order.status === 'cancelled' ? 'Cancelled' : 'Returned'}
          </p>
        )}
      </div>

      {/* Tracking Timeline */}
      {tracking.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-text mb-4">Tracking History</h2>
          <div className="space-y-0">
            {tracking.map((event, i) => (
              <div key={event.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full mt-1.5 ${
                    i === 0 ? 'bg-gold' : 'bg-gray-300'
                  }`} />
                  {i < tracking.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 my-0.5" />}
                </div>
                <div className={`pb-4 ${i === tracking.length - 1 ? 'pb-0' : ''}`}>
                  <p className="text-sm font-medium text-text">{event.status}</p>
                  {event.note && <p className="text-xs text-gray-500">{event.note}</p>}
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {new Date(event.created_at).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WhatsApp Support */}
      {waNumber && (
        <a
          href={`https://wa.me/${waNumber}?text=${encodeURIComponent(`Hello, I need help with Order #${order.order_number}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-green-600 font-medium mb-6 hover:underline"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Get help on WhatsApp
        </a>
      )}

      {/* Items */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-text mb-4">Items ({order.items?.length || 0})</h2>
        <div className="space-y-4">
          {order.items?.map((item) => (
            <div key={item.id} className="flex gap-4 pb-4 border-b last:border-0 last:pb-0">
              <ProductImage
                variant="cart"
                src={PLACEHOLDER}
                alt={item.product_name}
                className="w-16 h-16 rounded"
              />
              <div className="flex-1">
                <p className="font-medium text-text">{item.product_name}</p>
                {item.variant_size && <p className="text-xs text-text-muted">Size: {item.variant_size}</p>}
                {item.variant_sku && <p className="text-xs text-text-muted">SKU: {item.variant_sku}</p>}
                <p className="text-sm text-gray-500">Qty: {item.quantity} x ₹{item.price}</p>
              </div>
              <p className="font-semibold">₹{item.total}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-text mb-4">Payment Summary</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span>₹{order.total_amount}</span>
          </div>
          {order.discount_amount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>-₹{order.discount_amount}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Shipping</span>
            <span>{order.shipping_amount === 0 ? 'FREE' : `₹${order.shipping_amount}`}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Tax</span>
            <span>₹{order.tax_amount}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>Total</span>
            <span className="text-gold">₹{order.final_amount}</span>
          </div>
          <div className="flex justify-between text-gray-600 pt-2 border-t">
            <span>Payment</span>
            <span className="capitalize">{order.payment_status}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;
