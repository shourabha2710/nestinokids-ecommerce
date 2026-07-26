import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Flame, Tag, Clock } from 'lucide-react';
import PromotionCountdown from './PromotionCountdown';

const ProductPromotionSection = ({ promotions = [], productId, categoryId }) => {
  const relevant = useMemo(() => {
    return promotions
      .filter(
        (p) =>
          (p.product_id && p.product_id === Number(productId)) ||
          (p.category_id && p.category_id === Number(categoryId) && !p.product_id) ||
          (!p.product_id && !p.category_id)
      )
      .sort((a, b) => b.priority - a.priority);
  }, [promotions, productId, categoryId]);

  if (relevant.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-3"
    >
      {relevant.map((promo) => {
        const discountLabel =
          promo.badge_text ||
          (promo.promotion_type === 'PERCENTAGE'
            ? `${promo.discount_value}% OFF`
            : `₹${promo.discount_value} OFF`);

        return (
          <div
            key={promo.id}
            className="bg-gradient-to-r from-red-50 via-rose-50 to-pink-50 border border-red-100 rounded-xl p-4"
            role="status"
            aria-label={`Promotion: ${promo.name}`}
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Flame className="w-4.5 h-4.5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-display text-sm font-bold text-text">{promo.name}</h4>
                  <span className="inline-flex items-center gap-1 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    <Tag className="w-2.5 h-2.5" />
                    {discountLabel}
                  </span>
                </div>
                {promo.description && (
                  <p className="text-xs text-text-muted mt-1">{promo.description}</p>
                )}
                <div className="flex items-center gap-1.5 mt-2 text-text-muted">
                  <Clock className="w-3 h-3" />
                  <span className="text-[11px]">Offer valid until {new Date(promo.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  <span className="mx-1">·</span>
                  <PromotionCountdown endDate={promo.end_date} className="text-red-500" />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </motion.div>
  );
};

export default ProductPromotionSection;
