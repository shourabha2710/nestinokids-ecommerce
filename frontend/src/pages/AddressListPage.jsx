import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { shoppingAPI } from '../api/endpoints';
import { motion, AnimatePresence } from 'framer-motion';
import MobilePageHeader from '../components/MobilePageHeader';
import { AlertTriangle } from 'lucide-react';

const AddressListPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    address_line_1: '', address_line_2: '',
    city: '', state: '', postal_code: '',
    country: 'India', address_type: 'residential', is_default: false,
  });

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    fetchAddresses();
  }, [isAuthenticated]);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const res = await shoppingAPI.getAddresses();
      setAddresses(res.data);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  const openCreateForm = () => {
    setEditingId(null);
    setForm({ first_name: '', last_name: '', email: '', phone: '', address_line_1: '', address_line_2: '', city: '', state: '', postal_code: '', country: 'India', address_type: 'residential', is_default: false });
    setShowForm(true);
  };

  const openEditForm = (addr) => {
    setEditingId(addr.id);
    setForm({
      first_name: addr.first_name, last_name: addr.last_name, email: addr.email || '', phone: addr.phone,
      address_line_1: addr.address_line_1, address_line_2: addr.address_line_2 || '',
      city: addr.city, state: addr.state, postal_code: addr.postal_code,
      country: addr.country || 'India', address_type: addr.address_type || 'residential', is_default: addr.is_default,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await shoppingAPI.updateAddress(editingId, form);
      } else {
        await shoppingAPI.createAddress(form);
      }
      setShowForm(false);
      fetchAddresses();
    } catch {
      // handled
    }
  };

  const handleDelete = async (id) => {
    try {
      await shoppingAPI.deleteAddress(id);
      setDeleteId(null);
      fetchAddresses();
    } catch {
      // handled
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <MobilePageHeader title="My Addresses" />
        <h1 className="hidden md:block text-2xl font-bold text-text mb-8">My Addresses</h1>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <MobilePageHeader title="My Addresses" className="mb-4 -mx-4 -mt-2" />
      <div className="flex justify-between items-center mb-8">
        <h1 className="hidden md:block text-2xl font-bold text-text">My Addresses</h1>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={openCreateForm}
          className="ml-auto bg-gold text-white px-4 py-2 rounded-lg font-semibold"
        >
          + Add Address
        </motion.button>
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow p-6 mb-6"
        >
          <h2 className="text-lg font-semibold text-text mb-4">{editingId ? 'Edit Address' : 'New Address'}</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="First Name" value={form.first_name} onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))} />
              <input required placeholder="Last Name" value={form.last_name} onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))} />
              <input required placeholder="Email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className="col-span-2 p-2 border rounded" />
              <input required placeholder="Phone" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className="col-span-2 p-2 border rounded" />
              <input required placeholder="Address Line 1" value={form.address_line_1} onChange={(e) => setForm((p) => ({ ...p, address_line_1: e.target.value }))} className="col-span-2 p-2 border rounded" />
              <input placeholder="Address Line 2" value={form.address_line_2} onChange={(e) => setForm((p) => ({ ...p, address_line_2: e.target.value }))} className="col-span-2 p-2 border rounded" />
              <input required placeholder="City" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
              <input required placeholder="State" value={form.state} onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))} />
              <input required placeholder="Postal Code" value={form.postal_code} onChange={(e) => setForm((p) => ({ ...p, postal_code: e.target.value }))} />
              <input placeholder="Country" value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_default} onChange={(e) => setForm((p) => ({ ...p, is_default: e.target.checked }))} />
              <span className="text-sm">Set as default address</span>
            </label>
            <div className="flex gap-3">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="bg-gold text-white px-4 py-2 rounded-lg font-semibold">
                {editingId ? 'Update' : 'Save'}
              </motion.button>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-500 px-4 py-2">Cancel</button>
            </div>
          </form>
        </motion.div>
      )}

      {addresses.length === 0 && !showForm ? (
        <div className="text-center py-16">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h2 className="text-xl font-semibold text-text mb-2">No addresses saved</h2>
          <p className="text-gray-500 mb-6">Add a shipping address for your orders.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {addresses.map((addr) => (
            <motion.div
              key={addr.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow p-6"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-text">{addr.first_name} {addr.last_name}</p>
                  <p className="text-sm text-gray-600 mt-1">{addr.address_line_1}{addr.address_line_2 ? `, ${addr.address_line_2}` : ''}</p>
                  <p className="text-sm text-gray-600">{addr.city}, {addr.state} - {addr.postal_code}</p>
                  <p className="text-sm text-gray-600">Phone: {addr.phone}</p>
                  {addr.is_default && (
                    <span className="inline-block mt-2 px-2 py-0.5 bg-gold bg-opacity-20 text-gold text-xs font-semibold rounded">Default</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEditForm(addr)} className="text-gold text-sm font-semibold hover:underline">Edit</button>
                  <button onClick={() => setDeleteId(addr.id)} className="text-red-500 text-sm font-semibold hover:underline">Delete</button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 py-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-auto"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Confirm Delete</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete this address?
              </p>
              <div className="flex flex-col-reverse sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 justify-end">
                <button
                  onClick={() => setDeleteId(null)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all text-sm w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteId)}
                  className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all text-sm w-full sm:w-auto"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AddressListPage;
