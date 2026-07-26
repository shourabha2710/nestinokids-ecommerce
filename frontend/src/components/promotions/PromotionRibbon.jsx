import React, { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import PromotionCountdown from './PromotionCountdown';

const STORAGE_KEY = 'promotion_ribbon_dismissed';

const PromotionRibbon = ({ promotions = [] }) => {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  });

  const globalPromos = useMemo(() => {
    return promotions
      .filter((p) => !p.category_id && !p.product_id)
      .sort((a, b) => b.priority - a.priority);
  }, [promotions]);

  const visible = globalPromos.filter((p) => !dismissed.includes(p.id));

  if (visible.length === 0) return null;

  const current = visible[0];

  const handleDismiss = () => {
    const next = [...dismissed, current.id];
    setDismissed(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  return (
    <AnimatePresence>
      <motion.div
        key={current.id}
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-gradient-to-r from-gold/90 to-amber-500 overflow-hidden"
        role="banner"
        aria-label={`Promotion: ${current.name}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center gap-3 py-2 text-white text-center text-xs sm:text-sm">
          <span className="font-semibold">{current.banner_text || current.name}</span>
          <PromotionCountdown endDate={current.end_date} className="text-white/80" />
          <button
            onClick={handleDismiss}
            className="ml-2 p-0.5 hover:bg-white/20 rounded-full transition-colors flex-shrink-0"
            aria-label="Dismiss promotion"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PromotionRibbon;
