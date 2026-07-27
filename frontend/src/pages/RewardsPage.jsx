import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { loyaltyAPI } from '../api/endpoints';
import MobilePageHeader from '../components/MobilePageHeader';
import { Award, TrendingUp, Gift, Star, Clock, ChevronDown, ChevronUp } from 'lucide-react';

const TIER_CONFIG = {
  bronze: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Bronze' },
  silver: { color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-300', label: 'Silver' },
  gold: { color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-300', label: 'Gold' },
  platinum: { color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-300', label: 'Platinum' },
};

const TX_TYPE_LABELS = {
  earn: { label: 'Earned', color: 'text-green-600', icon: TrendingUp },
  redeem: { label: 'Redeemed', color: 'text-red-600', icon: Gift },
  expire: { label: 'Expired', color: 'text-gray-400', icon: Clock },
  adjustment: { label: 'Adjustment', color: 'text-blue-600', icon: Award },
  refund: { label: 'Refunded', color: 'text-green-600', icon: TrendingUp },
  referral_bonus: { label: 'Referral', color: 'text-purple-600', icon: Star },
  promotion_bonus: { label: 'Bonus', color: 'text-gold', icon: Star },
};

const RewardsPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    fetchData();
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [accRes, histRes] = await Promise.all([
        loyaltyAPI.getSummary(),
        loyaltyAPI.getHistory({ limit: 20 }),
      ]);
      setAccount(accRes.data);
      setTransactions(histRes.data?.items || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <MobilePageHeader title="Rewards" />
        <div className="animate-pulse space-y-4 mt-6">
          <div className="h-40 bg-gray-200 rounded-xl" />
          <div className="h-24 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  const tier = TIER_CONFIG[account?.current_tier || 'bronze'];
  const progress = account?.tier_progress || {};

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <MobilePageHeader title="Rewards" />

      {/* Tier Card */}
      <div className={`rounded-xl border-2 ${tier.border} ${tier.bg} p-6 mb-6`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-text-muted">Your Tier</p>
            <h2 className={`text-2xl font-bold ${tier.color}`}>{tier.label}</h2>
          </div>
          <div className={`w-16 h-16 rounded-full ${tier.bg} border-2 ${tier.border} flex items-center justify-center`}>
            <Award className={`w-8 h-8 ${tier.color}`} />
          </div>
        </div>

        {progress.next_tier && (
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-text-muted">{TIER_CONFIG[progress.current_tier]?.label}</span>
              <span className="text-text-muted">{TIER_CONFIG[progress.next_tier]?.label}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gold rounded-full transition-all"
                style={{ width: `${progress.progress_percent || 0}%` }}
              />
            </div>
            <p className="text-xs text-text-muted mt-1">
              {progress.next_threshold ? `${progress.next_threshold - progress.current_points} pts to ${TIER_CONFIG[progress.next_tier]?.label}` : 'Maximum tier reached'}
            </p>
          </div>
        )}
      </div>

      {/* Points Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-3xl font-bold text-gold">{account?.current_points || 0}</p>
          <p className="text-xs text-text-muted mt-1">Available Points</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{account?.lifetime_earned || 0}</p>
          <p className="text-xs text-text-muted mt-1">Lifetime Earned</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-3xl font-bold text-red-500">{account?.lifetime_redeemed || 0}</p>
          <p className="text-xs text-text-muted mt-1">Lifetime Redeemed</p>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
        <h3 className="font-semibold text-text mb-4">How Points Work</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-text">Earn Points</p>
              <p className="text-xs text-text-muted">Get 1 point per ₹10 spent on delivered orders</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Award className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-text">Level Up</p>
              <p className="text-xs text-text-muted">Earn more to unlock Silver, Gold, and Platinum tiers</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
              <Gift className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-text">Redeem</p>
              <p className="text-xs text-text-muted">Use points at checkout for up to 50% off your order</p>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-xl border border-gray-100">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between p-4"
        >
          <span className="font-semibold text-text">Transaction History</span>
          {showHistory ? <ChevronUp className="w-5 h-5 text-text-muted" /> : <ChevronDown className="w-5 h-5 text-text-muted" />}
        </button>

        {showHistory && (
          <div className="border-t border-gray-100">
            {transactions.length === 0 ? (
              <div className="p-6 text-center text-text-muted text-sm">No transactions yet</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {transactions.map((tx) => {
                  const typeConfig = TX_TYPE_LABELS[tx.transaction_type] || TX_TYPE_LABELS.earn;
                  const Icon = typeConfig.icon;
                  return (
                    <div key={tx.id} className="px-4 py-3 flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center`}>
                        <Icon className={`w-4 h-4 ${typeConfig.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text truncate">{tx.description}</p>
                        <p className="text-xs text-text-muted">
                          {tx.created_at ? new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                          {tx.order_id ? ` · Order #${tx.order_id}` : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${tx.points >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {tx.points >= 0 ? '+' : ''}{tx.points} pts
                        </p>
                        <p className="text-xs text-text-muted">Bal: {tx.balance_after}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RewardsPage;
