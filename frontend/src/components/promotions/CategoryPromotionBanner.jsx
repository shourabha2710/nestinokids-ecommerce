import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Tag } from 'lucide-react';
import PromotionCountdown from './PromotionCountdown';

const CategoryPromotionBanner = ({ promotions = [], categoryId }) => {
  const relevant = useMemo(() => {
    if (!categoryId) return [];
    return promotions
      .filter((p) => p.category_id === Number(categoryId) || !p.category_id)
      .sort((a, b) => b.priority - a.priority);
  }, [promotions, categoryId]);

  if (relevant.length === 0) return null;

  const promo = relevant[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-gold/10 via-amber-50 to-gold/10 border border-gold/20 rounded-2xl p-4 sm:p-6 mb-6"
      role="region"
      aria-label={`Category promotion: ${promo.name}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
            <Tag className="w-5 h-5 text-gold" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-sm sm:text-base font-bold text-text truncate">
              {promo.banner_text || promo.name}
            </h3>
            {promo.description && (
              <p className="text-xs text-text-muted mt-0.5 truncate">{promo.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {promo.badge_text && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {promo.badge_text}
            </span>
          )}
          <PromotionCountdown endDate={promo.end_date} className="text-text-muted" />
        </div>
      </div>
    </motion.div>
  );
};

export default CategoryPromotionBanner;
