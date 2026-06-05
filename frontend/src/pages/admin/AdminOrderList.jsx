import React, { useEffect, useState, useCallback } from 'react';
import { adminAPI } from '../../api/endpoints';

const STATUS_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['packed', 'cancelled'],
  packed: ['shipped'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
  returned: [],
};

const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  packed: 'bg-indigo-100 text-indigo-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  returned: 'bg-gray-100 text-gray-700',
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

  useEffect(() => {
    const timer = setTimeout(fetchOrders, 300);
    return () => clearTimeout(timer);
  }, [fetchOrders]);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const openDetail = async (orderId) => {
    try {
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
      await adminAPI.updateOrderStatus(orderId, { status: newStatus });
      if (detailOrder?.id === orderId) {
        setDetailOrder({ ...detailOrder, order_status: newStatus });
      }
      fetchOrders();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update status');
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Orders</h1>
        <div className="bg-white rounded-lg shadow p-6 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded mb-3" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Orders</h1>
        <div className="flex space-x-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="packed">Packed</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <input
            type="text"
            placeholder="Search by order number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-gold"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Order #</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Customer</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Items</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Total</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Payment</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-400">
                    No orders found
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-800">
                      {order.order_number}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-800">{order.customer_name}</div>
                      <div className="text-gray-400 text-xs">{order.customer_email}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{order.item_count}</td>
                    <td className="px-4 py-3 font-medium">
                      ₹{order.final_amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        order.payment_status === 'completed'
                          ? 'bg-green-100 text-green-600'
                          : order.payment_status === 'failed'
                          ? 'bg-red-100 text-red-600'
                          : 'bg-yellow-100 text-yellow-600'
                      }`}>
                        {order.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_STYLES[order.order_status] || 'bg-gray-100 text-gray-600'}`}>
                        {order.order_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openDetail(order.id)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-xs"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detailOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  Order {detailOrder.order_number}
                </h3>
                <p className="text-sm text-gray-500">
                  {new Date(detailOrder.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => { setDetailOrder(null); setError(''); }}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>

            {detailLoading ? (
              <div className="p-6 text-center text-gray-400">Loading...</div>
            ) : (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Customer</h4>
                    <p className="text-sm text-gray-800">{detailOrder.customer_name}</p>
                    <p className="text-sm text-gray-500">{detailOrder.customer_email}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Status</h4>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_STYLES[detailOrder.order_status] || 'bg-gray-100 text-gray-600'}`}>
                        {detailOrder.order_status}
                      </span>
                      {STATUS_TRANSITIONS[detailOrder.order_status]?.length > 0 && (
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              updateStatus(detailOrder.id, e.target.value);
                            }
                          }}
                          className="border border-gray-300 rounded text-xs px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gold"
                        >
                          <option value="">Change...</option>
                          {STATUS_TRANSITIONS[detailOrder.order_status].map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Payment</h4>
                    <p className="text-sm text-gray-800 capitalize">{detailOrder.payment_status}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Items</h4>
                    <p className="text-sm text-gray-800">{detailOrder.item_count} item(s)</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Order Items</h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="text-left px-3 py-2 font-semibold text-gray-600">Product</th>
                        <th className="text-right px-3 py-2 font-semibold text-gray-600">Qty</th>
                        <th className="text-right px-3 py-2 font-semibold text-gray-600">Price</th>
                        <th className="text-right px-3 py-2 font-semibold text-gray-600">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailOrder.items?.map((item) => (
                        <tr key={item.id} className="border-b">
                          <td className="px-3 py-2 text-gray-800">{item.product_name || `Product #${item.product_id}`}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{item.quantity}</td>
                          <td className="px-3 py-2 text-right text-gray-600">₹{item.price}</td>
                          <td className="px-3 py-2 text-right font-medium">₹{item.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Subtotal</span>
                    <span>₹{detailOrder.total_amount?.toLocaleString()}</span>
                  </div>
                  {detailOrder.discount_amount > 0 && (
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">Discount</span>
                      <span className="text-red-500">-₹{detailOrder.discount_amount?.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Tax</span>
                    <span>₹{detailOrder.tax_amount?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Shipping</span>
                    <span>₹{detailOrder.shipping_amount?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base mt-2 pt-2 border-t">
                    <span>Total</span>
                    <span>₹{detailOrder.final_amount?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrderList;
