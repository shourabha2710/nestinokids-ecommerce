import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminAPI } from '../../services/adminApi';
import {
  ShoppingCart,
  Search,
  Eye,
  X,
  Clock,
  MapPin,
  User,
  CreditCard,
  Package,
  Truck,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

const STATUS_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['packed', 'cancelled'],
  packed: ['shipped'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
  returned: [],
};

const STATUS_CONFIG = {
  pending: { icon: Clock, bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500', label: 'Pending' },
  confirmed: { icon: CheckCircle, bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Confirmed' },
  packed: { icon: Package, bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500', label: 'Packed' },
  shipped: { icon: Truck, bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500', label: 'Shipped' },
  delivered: { icon: CheckCircle, bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500', label: 'Delivered' },
  cancelled: { icon: AlertCircle, bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', label: 'Cancelled' },
  returned: { icon: AlertCircle, bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-500', label: 'Returned' },
};

const AdminOrderList = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [detailOrder, setDetailOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await adminAPI.getOrders(params);
      setOrders(res.data);
    } catch (err) {
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  const fetchOnMount = useRef(true);

  useEffect(() => {
    if (fetchOnMount.current) {
      fetchOnMount.current = false;
      fetchOrders();
      return;
    }
    const timer = setTimeout(fetchOrders, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const openDetail = async (orderId) => {
    try {
      setError('');
      setDetailLoading(true);
      const res = await adminAPI.getOrder(orderId);
      setDetailOrder(res.data);
    } catch (err) {
      setError('Failed to load order details');
    } finally {
      setDetailLoading(false);
    }
  };

  const updateStatus = async (orderId, newStatus) => {
    try {
      setError('');
      await adminAPI.updateOrderStatus(orderId, { status: newStatus });
      if (detailOrder?.id === orderId) {
        setDetailOrder({ ...detailOrder, order_status: newStatus });
      }
      fetchOrders();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update status');
    }
  };

  const StatusBadge = ({ status }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg text-xs font-medium whitespace-nowrap ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3" />
        <span>{config.label}</span>
      </span>
    );
  };

  const PaymentBadge = ({ status }) => {
    const colors = {
      completed: 'bg-green-50 text-green-600',
      pending: 'bg-yellow-50 text-yellow-700',
      failed: 'bg-red-50 text-red-600',
      refunded: 'bg-gray-50 text-gray-600',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium whitespace-nowrap ${colors[status] || 'bg-gray-50 text-gray-500'}`}>
        {status}
      </span>
    );
  };

  if (loading && orders.length === 0) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage customer orders</p>
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="text-sm text-gray-500 mt-1">Track and manage customer orders</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm flex items-center space-x-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by order number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all bg-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all bg-white w-full sm:w-auto"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
      </div>

      {/* Orders table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Order #</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Customer</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Items</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Total</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Payment</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Status</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Date</th>
                <th className="text-right px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                      <ShoppingCart className="w-12 h-12 mb-3 text-gray-200" />
                      <p className="text-sm font-medium text-gray-500 mb-1">No orders found</p>
                      <p className="text-xs text-gray-400">
                        {search || statusFilter ? 'Try different filters' : 'Orders will appear here once customers start purchasing'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((order, index) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-gray-900 whitespace-nowrap">
                        {order.order_number}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="min-w-0 max-w-[120px] sm:max-w-[180px]">
                        <div className="text-gray-900 font-medium text-sm truncate">{order.customer_name}</div>
                        <div className="text-gray-400 text-xs truncate">{order.customer_email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-600">{order.item_count}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                      ₹{order.final_amount?.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <PaymentBadge status={order.payment_status} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.order_status} />
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(order.created_at).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openDetail(order.id)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order detail modal */}
      <AnimatePresence>
        {detailOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-50 px-0 sm:px-4 py-0 sm:py-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-none sm:rounded-2xl shadow-xl max-w-3xl w-full h-full sm:h-auto sm:max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="px-4 sm:px-6 py-4 sm:py-6 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      Order {detailOrder.order_number}
                    </h3>
                    <StatusBadge status={detailOrder.order_status} />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(detailOrder.created_at).toLocaleString('en-IN')}
                  </p>
                </div>
                <button
                  onClick={() => { setDetailOrder(null); setError(''); }}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 flex-shrink-0 ml-3"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {detailLoading ? (
                <div className="flex-1 flex items-center justify-center p-12">
                  <div className="text-center">
                    <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-gray-400">Loading order details...</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
                  <div className="space-y-6">
                    {/* Customer & Status info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center space-x-2 mb-3">
                          <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</h4>
                        </div>
                        <p className="text-sm font-medium text-gray-900 break-words">{detailOrder.customer_name}</p>
                        <p className="text-sm text-gray-500 break-words">{detailOrder.customer_email}</p>
                        {detailOrder.shipping_address && (
                          <div className="flex items-start space-x-2 mt-3 text-xs text-gray-500">
                            <MapPin className="w-3 h-3 mt-0.5 text-gray-400 flex-shrink-0" />
                            <span className="break-words">{detailOrder.shipping_address}</span>
                          </div>
                        )}
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center space-x-2 mb-3">
                          <CreditCard className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment & Status</h4>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-sm gap-2">
                            <span className="text-gray-500 flex-shrink-0">Payment</span>
                            <PaymentBadge status={detailOrder.payment_status} />
                          </div>
                          <div className="flex justify-between items-center text-sm gap-2">
                            <span className="text-gray-500 flex-shrink-0">Status</span>
                            <div className="flex items-center gap-2">
                              <StatusBadge status={detailOrder.order_status} />
                              {STATUS_TRANSITIONS[detailOrder.order_status]?.length > 0 && (
                                <select
                                  value=""
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      updateStatus(detailOrder.id, e.target.value);
                                    }
                                  }}
                                  className="border border-gray-200 rounded-lg text-xs px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gold/40 bg-white"
                                >
                                  <option value="">Change...</option>
                                  {STATUS_TRANSITIONS[detailOrder.order_status].map((s) => (
                                    <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Items</span>
                            <span className="text-gray-900">{detailOrder.item_count} item(s)</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Order items */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Order Items</h4>
                      <div className="bg-gray-50 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-gray-100">
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs whitespace-nowrap">Product</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs whitespace-nowrap">Size</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs whitespace-nowrap">SKU</th>
                                    <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs whitespace-nowrap">Qty</th>
                                    <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs whitespace-nowrap">Price</th>
                                    <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs whitespace-nowrap">Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {detailOrder.items?.map((item) => (
                                    <tr key={item.id} className="border-b border-gray-100 last:border-0">
                                      <td className="px-4 py-3 text-gray-900 break-words">
                                        {item.product_name || `Product #${item.product_id}`}
                                      </td>
                                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{item.variant_size || '-'}</td>
                                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{item.variant_sku || '-'}</td>
                                      <td className="px-4 py-3 text-right text-gray-600 whitespace-nowrap">{item.quantity}</td>
                                      <td className="px-4 py-3 text-right text-gray-600 whitespace-nowrap">₹{item.price}</td>
                                      <td className="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">₹{item.total}</td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* Order summary */}
                      <div className="bg-gray-50 rounded-xl p-4">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Order Summary</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm gap-2">
                            <span className="text-gray-500">Subtotal</span>
                            <span className="text-gray-900 whitespace-nowrap">₹{detailOrder.total_amount?.toLocaleString()}</span>
                          </div>
                          {detailOrder.discount_amount > 0 && (
                            <div className="flex justify-between text-sm gap-2">
                              <span className="text-gray-500">Discount</span>
                              <span className="text-red-500 whitespace-nowrap">-₹{detailOrder.discount_amount?.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm gap-2">
                            <span className="text-gray-500">Tax</span>
                            <span className="text-gray-900 whitespace-nowrap">₹{detailOrder.tax_amount?.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm gap-2">
                            <span className="text-gray-500">Shipping</span>
                            <span className="text-gray-900 whitespace-nowrap">₹{detailOrder.shipping_amount?.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between font-bold text-base pt-3 border-t border-gray-200 gap-2">
                            <span className="text-gray-900">Total</span>
                            <span className="text-gray-900 whitespace-nowrap">₹{detailOrder.final_amount?.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  export default AdminOrderList;
