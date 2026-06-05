import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { shoppingAPI } from '../api/endpoints';
import { motion } from 'framer-motion';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    fetchOrder();
  }, [id, isAuthenticated]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await shoppingAPI.getOrder(id);
      setOrder(res.data);
    } catch {
      setError('Order not found');
    } finally {
      setLoading(false);
    }
  };

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

  const currentStepIndex = STATUS_STEPS.indexOf(order.status);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button onClick={() => navigate('/orders')} className="text-gold font-semibold mb-6 hover:underline">
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
        {(order.status === 'cancelled' || order.status === 'returned') && (
          <p className="text-center text-red-600 font-semibold mt-4">
            Order {order.status === 'cancelled' ? 'Cancelled' : 'Returned'}
          </p>
        )}
      </div>

      {/* Items */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-text mb-4">Items ({order.items?.length || 0})</h2>
        <div className="space-y-4">
          {order.items?.map((item) => (
            <div key={item.id} className="flex gap-4 pb-4 border-b last:border-0 last:pb-0">
              <img
                src={PLACEHOLDER}
                alt={item.product_name}
                className="w-16 h-16 object-cover rounded"
              />
              <div className="flex-1">
                <p className="font-medium text-text">{item.product_name}</p>
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
