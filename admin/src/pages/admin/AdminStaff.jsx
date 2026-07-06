import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { staffApi } from '../../services/staffApi';
import { usePermissions } from '../../hooks/usePermissions';
import { Permissions } from '../../constants/permissions';
import StaffRoleBadge from '../../components/staff/StaffRoleBadge';
import StaffFormModal from '../../components/staff/StaffFormModal';
import ResetPasswordModal from '../../components/staff/ResetPasswordModal';
import {
  Users, Plus, Edit3, X, CheckCircle, AlertTriangle,
  KeyRound, ToggleLeft, ToggleRight, Search,
} from 'lucide-react';

const AdminStaff = () => {
  const { hasPermission } = usePermissions();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [resetPasswordStaff, setResetPasswordStaff] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      const res = await staffApi.getStaff();
      setStaff(res.data);
    } catch {
      setError('Failed to load staff users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const openAdd = () => {
    setEditingStaff(null);
    setError('');
    setShowFormModal(true);
  };

  const openEdit = (user) => {
    setEditingStaff(user);
    setError('');
    setShowFormModal(true);
  };

  const handleSave = async (data) => {
    if (editingStaff) {
      await staffApi.updateStaff(editingStaff.id, data);
      showToast('Staff user updated');
    } else {
      await staffApi.createStaff(data);
      showToast('Staff user created');
    }
    setShowFormModal(false);
    await fetchStaff();
  };

  const handleDeactivate = async (user) => {
    try {
      await staffApi.deactivateStaff(user.id);
      showToast(user.is_active ? 'Staff user deactivated' : 'Staff user activated');
      await fetchStaff();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to update staff status', 'error');
    }
  };

  const handleResetPassword = async (password) => {
    await staffApi.resetPassword(resetPasswordStaff.id, password);
    showToast('Password reset successfully');
    setResetPasswordStaff(null);
  };

  const filteredStaff = staff.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.first_name?.toLowerCase().includes(q) ||
      u.last_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage admin and support staff</p>
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Staff Management</h1>
          <p className="text-text-muted text-sm mt-1">Manage admin and support staff</p>
        </div>
        {hasPermission(Permissions.USER_MANAGE) && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-gold text-white rounded-lg hover:bg-gold-dark transition-colors"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Add Staff</span>
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2 text-sm">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm shadow-lg ${
            toast.type === 'error'
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-green-50 border border-green-200 text-green-700'
          }`}
        >
          {toast.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
          {toast.message}
        </motion.div>
      )}

      {/* Search */}
      <div className="relative mb-4 w-full sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search staff..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all bg-white"
        />
      </div>

      {/* Desktop Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hidden sm:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Name</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Email</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Role</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Status</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Created</th>
                <th className="text-right px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                      <Users className="w-12 h-12 mb-3 text-gray-200" />
                      <p className="text-sm font-medium text-gray-500 mb-1">No staff users found</p>
                      <p className="text-xs text-gray-400">
                        {searchQuery ? 'Try a different search' : 'Staff users will appear here once added'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((user, index) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-gold">
                            {user.first_name?.[0]}{user.last_name?.[0]}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {user.first_name} {user.last_name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{user.email}</td>
                    <td className="px-4 py-3"><StaffRoleBadge role={user.role} /></td>
                    <td className="px-4 py-3">
                      {user.is_active ? (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-green-50 text-green-700 border border-green-200">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-50 text-red-700 border border-red-200">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {hasPermission(Permissions.USER_MANAGE) && (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(user)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Edit"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeactivate(user)}
                            className={`p-2 rounded-lg transition-all ${
                              user.is_active
                                ? 'text-gray-400 hover:text-orange-600 hover:bg-orange-50'
                                : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                            }`}
                            title={user.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {user.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                          </button>
                          <button
                            onClick={() => setResetPasswordStaff(user)}
                            className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                            title="Reset Password"
                          >
                            <KeyRound size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="sm:hidden space-y-3">
        {filteredStaff.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Users className="w-12 h-12 mb-3 text-gray-200" />
            <p className="text-sm font-medium text-gray-500 mb-1">No staff users found</p>
            <p className="text-xs text-gray-400">
              {searchQuery ? 'Try a different search' : 'Staff users will appear here once added'}
            </p>
          </div>
        ) : (
          filteredStaff.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              className="bg-white rounded-xl border border-gray-100 p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-gold">
                      {user.first_name?.[0]}{user.last_name?.[0]}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                </div>
                <StaffRoleBadge role={user.role} />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center gap-3">
                  <span>
                    {user.is_active ? (
                      <span className="text-green-600 font-medium">Active</span>
                    ) : (
                      <span className="text-red-600 font-medium">Inactive</span>
                    )}
                  </span>
                  {user.created_at && (
                    <span>
                      {new Date(user.created_at).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                </div>
                {hasPermission(Permissions.USER_MANAGE) && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(user)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-all"
                      title="Edit"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeactivate(user)}
                      className={`p-1.5 rounded-lg transition-all ${
                        user.is_active
                          ? 'text-gray-400 hover:text-orange-600 hover:bg-orange-50'
                          : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                      }`}
                      title={user.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {user.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                    </button>
                    <button
                      onClick={() => setResetPasswordStaff(user)}
                      className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                      title="Reset Password"
                    >
                      <KeyRound size={14} />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {showFormModal && (
          <StaffFormModal
            isOpen={showFormModal}
            onClose={() => setShowFormModal(false)}
            onSave={handleSave}
            editingStaff={editingStaff}
          />
        )}
      </AnimatePresence>

      {/* Reset Password Modal */}
      <AnimatePresence>
        {resetPasswordStaff && (
          <ResetPasswordModal
            isOpen={!!resetPasswordStaff}
            onClose={() => setResetPasswordStaff(null)}
            onReset={handleResetPassword}
            staffName={`${resetPasswordStaff.first_name} ${resetPasswordStaff.last_name}`}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminStaff;
