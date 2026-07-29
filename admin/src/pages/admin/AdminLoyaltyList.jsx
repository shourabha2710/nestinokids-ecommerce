import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminAPI } from '../../services/adminApi';
import { usePermissions } from '../../hooks/usePermissions';
import { Permissions } from '../../constants/permissions';
import {
  Award,
  Search,
  Eye,
  X,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';

const TIER_CONFIG = {
  bronze: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Bronze' },
  silver: { color: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-300', label: 'Silver' },
  gold: { color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-300', label: 'Gold' },
  platinum: { color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-300', label: 'Platinum' },
};

const TX_TYPES = {
  earn: { label: 'Earned', color: 'text-green-600', bg: 'bg-green-50' },
  redeem: { label: 'Redeemed', color: 'text-red-600', bg: 'bg-red-50' },
  adjustment: { label: 'Adjustment', color: 'text-blue-600', bg: 'bg-blue-50' },
  refund: { label: 'Refund', color: 'text-green-600', bg: 'bg-green-50' },
  expire: { label: 'Expired', color: 'text-gray-500', bg: 'bg-gray-50' },
  referral_bonus: { label: 'Referral', color: 'text-purple-600', bg: 'bg-purple-50' },
  promotion_bonus: { label: 'Bonus', color: 'text-gold', bg: 'bg-amber-50' },
};

const AdminLoyaltyList = () => {
  const { hasPermission } = usePermissions();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [detailUser, setDetailUser] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ points: 0, reason: '' });
  const [adjusting, setAdjusting] = useState(false);
  const limit = 20;

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = { skip: (page - 1) * limit, limit };
      if (search) params.search = search;
      if (tierFilter) params.tier = tierFilter;
      const res = await adminAPI.getLoyaltyAccounts(params);
      setAccounts(res.data?.items || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load loyalty accounts');
    } finally {
      setLoading(false);
    }
  }, [page, search, tierFilter]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const handleViewUser = async (userId) => {
    try {
      setDetailUser(userId);
      setDetailLoading(true);
      const res = await adminAPI.getUserLoyalty(userId);
      setDetailData(res.data);
    } catch {
      setDetailData(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAdjust = async () => {
    if (!detailUser || !adjustForm.points) return;
    try {
      setAdjusting(true);
      await adminAPI.adjustLoyalty({
        user_id: detailUser,
        points: parseInt(adjustForm.points),
        reason: adjustForm.reason || 'Admin adjustment',
      });
      setShowAdjustModal(false);
      setAdjustForm({ points: 0, reason: '' });
      await handleViewUser(detailUser);
      await fetchAccounts();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to adjust points');
    } finally {
      setAdjusting(false);
    }
  };

  const handleExpire = async (userId) => {
    if (!window.confirm('Expire all points for this user?')) return;
    try {
      await adminAPI.expireUserLoyalty(userId);
      await handleViewUser(userId);
      await fetchAccounts();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to expire points');
    }
  };

  if (!hasPermission(Permissions.USER_MANAGE)) {
    return <div className="p-8 text-center text-gray-500">You don't have permission to manage loyalty.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Award className="w-8 h-8 text-gold" />
          <div>
            <h1 className="text-2xl font-bold text-text">Loyalty & Rewards</h1>
            <p className="text-sm text-text-muted">Manage customer loyalty points and tiers</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
        <select
          value={tierFilter}
          onChange={(e) => { setTierFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="">All Tiers</option>
          <option value="bronze">Bronze</option>
          <option value="silver">Silver</option>
          <option value="gold">Gold</option>
          <option value="platinum">Platinum</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-text">Customer</th>
              <th className="px-4 py-3 text-left font-semibold text-text">Tier</th>
              <th className="px-4 py-3 text-right font-semibold text-text">Points</th>
              <th className="px-4 py-3 text-right font-semibold text-text">Earned</th>
              <th className="px-4 py-3 text-right font-semibold text-text">Redeemed</th>
              <th className="px-4 py-3 text-center font-semibold text-text">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="6" className="p-8 text-center text-text-muted">Loading...</td></tr>
            ) : accounts.length === 0 ? (
              <tr><td colSpan="6" className="p-8 text-center text-text-muted">No loyalty accounts found</td></tr>
            ) : accounts.map((acc) => {
              const tier = TIER_CONFIG[acc.current_tier] || TIER_CONFIG.bronze;
              return (
                <tr key={acc.user_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-text">{acc.first_name} {acc.last_name}</p>
                      <p className="text-xs text-text-muted">{acc.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${tier.bg} ${tier.color} border ${tier.border}`}>
                      <Shield className="w-3 h-3" />
                      {tier.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gold">{acc.current_points}</td>
                  <td className="px-4 py-3 text-right text-green-600">{acc.lifetime_earned}</td>
                  <td className="px-4 py-3 text-right text-red-500">{acc.lifetime_redeemed}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleViewUser(acc.user_id)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-text-muted"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">
            Showing {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} of {total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded-lg disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page * limit >= total}
              className="px-3 py-1 border rounded-lg disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      <AnimatePresence>
        {detailUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => { setDetailUser(null); setDetailData(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold text-text">Loyalty Details</h3>
                <button onClick={() => { setDetailUser(null); setDetailData(null); }}>
                  <X className="w-5 h-5 text-text-muted" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh]">
                {detailLoading ? (
                  <div className="text-center py-8 text-text-muted">Loading...</div>
                ) : detailData ? (
                  <div className="space-y-4">
                    {/* Account Summary */}
                    <div className="grid grid-cols-4 gap-3">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-xl font-bold text-gold">{detailData.current_points}</p>
                        <p className="text-xs text-text-muted">Available</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-xl font-bold text-green-600">{detailData.lifetime_earned}</p>
                        <p className="text-xs text-text-muted">Earned</p>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <p className="text-xl font-bold text-red-500">{detailData.lifetime_redeemed}</p>
                        <p className="text-xs text-text-muted">Redeemed</p>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <p className={`text-xl font-bold ${TIER_CONFIG[detailData.current_tier]?.color || 'text-gray-600'}`}>
                          {TIER_CONFIG[detailData.current_tier]?.label || 'Bronze'}
                        </p>
                        <p className="text-xs text-text-muted">Tier</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowAdjustModal(true)}
                        className="px-4 py-2 bg-gold text-white rounded-lg text-sm font-semibold hover:bg-opacity-90"
                      >
                        Adjust Points
                      </button>
                      <button
                        onClick={() => handleExpire(detailUser)}
                        className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-semibold hover:bg-red-100"
                      >
                        Expire All Points
                      </button>
                    </div>

                    {/* Transactions */}
                    <div>
                      <h4 className="font-semibold text-text mb-2">Recent Transactions</h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {(detailData.transactions || []).map((tx) => {
                          const typeConfig = TX_TYPES[tx.transaction_type] || TX_TYPES.earn;
                          return (
                            <div key={tx.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${typeConfig.bg}`}>
                                {tx.points >= 0 ? <TrendingUp className={`w-4 h-4 ${typeConfig.color}`} /> : <TrendingDown className={`w-4 h-4 ${typeConfig.color}`} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-text truncate">{tx.description}</p>
                                <p className="text-xs text-text-muted">{tx.created_at ? new Date(tx.created_at).toLocaleDateString() : ''}</p>
                              </div>
                              <div className="text-right">
                                <p className={`text-sm font-semibold ${tx.points >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                  {tx.points >= 0 ? '+' : ''}{tx.points}
                                </p>
                                <p className="text-xs text-text-muted">Bal: {tx.balance_after}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-text-muted">No data</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Adjust Points Modal */}
      <AnimatePresence>
        {showAdjustModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAdjustModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-semibold text-text mb-4">Adjust Loyalty Points</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Points</label>
                  <input
                    type="number"
                    value={adjustForm.points}
                    onChange={(e) => setAdjustForm({ ...adjustForm, points: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="Positive = add, negative = deduct"
                  />
                  <p className="text-xs text-text-muted mt-1">Use negative value to deduct points</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Reason</label>
                  <input
                    type="text"
                    value={adjustForm.reason}
                    onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="Reason for adjustment"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowAdjustModal(false)}
                    className="px-4 py-2 border rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdjust}
                    disabled={adjusting || !adjustForm.points}
                    className="px-4 py-2 bg-gold text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                  >
                    {adjusting ? 'Adjusting...' : 'Apply'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminLoyaltyList;
