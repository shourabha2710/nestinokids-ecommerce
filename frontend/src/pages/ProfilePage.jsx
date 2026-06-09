import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { authAPI, loyaltyAPI, referralAPI } from '../api/endpoints';
import { setUser } from '../store/slices/authSlice';
import MobilePageHeader from '../components/MobilePageHeader';
import { motion } from 'framer-motion';
import { Gift, Copy, Share2, ChevronDown, ChevronUp, Sparkles, Award } from 'lucide-react';

const ProfilePage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [loyalty, setLoyalty] = useState(null);
  const [loyaltyHistory, setLoyaltyHistory] = useState([]);
  const [referral, setReferral] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    if (user) {
      setForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
    loyaltyAPI.getSummary().then((res) => setLoyalty(res.data)).catch(() => {});
    loyaltyAPI.getHistory({ limit: 5 }).then((res) => {
      if (res.data?.transactions) setLoyaltyHistory(res.data.transactions);
    }).catch(() => {});
    referralAPI.getInfo().then((res) => setReferral(res.data)).catch(() => {});
  }, [isAuthenticated, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage(null);
      const res = await authAPI.updateProfile(form);
      dispatch(setUser(res.data));
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyCode = () => {
    if (referral?.referral_code) {
      navigator.clipboard.writeText(referral.referral_code).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handleShare = async () => {
    if (!referral?.referral_link) return;
    const link = `${window.location.origin}${referral.referral_link}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'NestinoKids', text: 'Join NestinoKids and get 25 bonus points!', url: link });
      } catch {}
    } else {
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getPointsColor = (pts) => {
    if (loyalty?.current_points >= 100) return 'text-gold';
    if (loyalty?.current_points >= 50) return 'text-emerald-600';
    return 'text-text';
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <MobilePageHeader title="My Profile" />
      <h1 className="hidden md:block text-2xl font-bold text-text mb-8">My Profile</h1>

      {message && (
        <div className={`p-4 rounded-lg mb-6 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {message.text}
        </div>
      )}

      {/* My Rewards Card */}
      {loyalty && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-gold/10 to-amber-50 rounded-2xl p-6 mb-6 border border-gold/20"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-gold" />
              <h3 className="font-display font-bold text-text text-lg">My Rewards</h3>
            </div>
            <span className="text-xs text-text-muted bg-white/60 px-2.5 py-1 rounded-full">
              Lifetime: {loyalty.lifetime_earned} pts
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className={`text-4xl font-bold ${getPointsColor()}`}>{loyalty.current_points}</span>
            <span className="text-text-muted text-sm">points</span>
          </div>
          <div className="flex gap-4 mt-3 text-xs text-text-muted">
            <span>Earned: {loyalty.lifetime_earned}</span>
            <span>Redeemed: {loyalty.lifetime_redeemed}</span>
          </div>

          {/* History toggle */}
          {loyaltyHistory.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gold/10">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1 text-xs font-semibold text-text-muted hover:text-text transition-colors"
              >
                {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                Point History ({loyaltyHistory.length})
              </button>
              {showHistory && (
                <div className="mt-2 space-y-1.5">
                  {loyaltyHistory.map((tx) => {
                    const isPositive = tx.transaction_type !== 'redeemed';
                    return (
                      <div key={tx.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-white/40">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                            {isPositive ? '+' : ''}{tx.points}
                          </span>
                          <span className="text-text-muted">{tx.description || tx.transaction_type}</span>
                        </div>
                        <span className="text-text-muted text-[10px]">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Referral Card */}
      {referral && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 mb-6 border border-gray-100 shadow-card"
        >
          <div className="flex items-center gap-2 mb-4">
            <Gift className="w-5 h-5 text-gold" />
            <h3 className="font-display font-bold text-text text-lg">Refer & Earn</h3>
          </div>
          <p className="text-sm text-text-muted mb-3">
            Share your referral code — you get <strong className="text-gold">50 points</strong>, they get <strong className="text-gold">25 points</strong>!
          </p>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-center">
              <span className="text-lg font-bold tracking-widest text-text">{referral.referral_code}</span>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleCopyCode}
              className="p-2.5 bg-gold/10 text-gold rounded-xl hover:bg-gold/20 transition-colors"
              title="Copy code"
            >
              <Copy size={18} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleShare}
              className="p-2.5 bg-gold/10 text-gold rounded-xl hover:bg-gold/20 transition-colors"
              title="Share link"
            >
              <Share2 size={18} />
            </motion.button>
          </div>
          {copied && <p className="text-xs text-green-600 font-medium text-center">Copied to clipboard!</p>}
          {referral.referred_users_count > 0 && (
            <p className="text-xs text-text-muted text-center mt-2">
              {referral.referred_users_count} friend{referral.referred_users_count > 1 ? 's' : ''} joined via your referral
            </p>
          )}
        </motion.div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input
              type="text"
              required
              value={form.first_name}
              onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
              className="w-full p-2 border rounded focus:outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input
              type="text"
              required
              value={form.last_name}
              onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
              className="w-full p-2 border rounded focus:outline-none focus:border-gold"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            className="w-full p-2 border rounded focus:outline-none focus:border-gold"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            className="w-full p-2 border rounded focus:outline-none focus:border-gold"
          />
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={saving}
          className="bg-gold text-white px-8 py-3 rounded-lg font-semibold hover:bg-opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </motion.button>
      </form>
    </div>
  );
};

export default ProfilePage;
