import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Loader2, AlertTriangle } from 'lucide-react';

const ALLOWED_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'support', label: 'Support' },
  { value: 'inventory_manager', label: 'Inventory Manager' },
];

const StaffFormModal = ({ isOpen, onClose, onSave, editingStaff }) => {
  const [form, setForm] = useState({
    first_name: editingStaff?.first_name || '',
    last_name: editingStaff?.last_name || '',
    email: editingStaff?.email || '',
    password: '',
    role: editingStaff?.role || 'support',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setForm({
        first_name: editingStaff?.first_name || '',
        last_name: editingStaff?.last_name || '',
        email: editingStaff?.email || '',
        password: '',
        role: editingStaff?.role || 'support',
      });
      setError('');
    }
  }, [isOpen, editingStaff]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('First name and last name are required');
      return;
    }
    if (!form.email.trim()) {
      setError('Email is required');
      return;
    }
    if (!editingStaff && !form.password) {
      setError('Password is required for new staff');
      return;
    }
    if (!editingStaff && form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role,
      };
      if (!editingStaff) {
        payload.password = form.password;
      }
      await onSave(payload);
      onClose();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(Array.isArray(detail) ? detail.map((e) => e.msg).join(', ') : (detail || 'Failed to save staff user'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={() => { if (!saving) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
          <h2 className="text-lg font-semibold text-text">
            {editingStaff ? 'Edit Staff User' : 'Add Staff User'}
          </h2>
          <button
            onClick={() => { if (!saving) onClose(); }}
            className="p-1 text-text-muted hover:text-text rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2 text-sm">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                placeholder="John"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                placeholder="Doe"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="john@example.com"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
            />
          </div>

          {!editingStaff && (
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min 8 characters"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
            >
              {ALLOWED_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-[#FFFCF7] shrink-0">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-gold text-white rounded-lg hover:bg-gold-dark text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? (
              <><Loader2 size={16} className="animate-spin" /> Saving...</>
            ) : (
              <><Save size={16} /> {editingStaff ? 'Update' : 'Create'}</>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default StaffFormModal;
