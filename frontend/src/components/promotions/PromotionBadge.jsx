import React from 'react';
import { motion } from 'framer-motion';
import { Tag } from 'lucide-react';

const PromotionBadge = ({ promotion, className = '' }) => {
  if (!promotion) return null;

  const label = promotion.badge_text || (
    promotion.promotion_type === 'PERCENTAGE'
      ? `${promotion.discount_value}% OFF`
      : `₹${promotion.discount_value} OFF`
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-1 bg-gradient-to-r from-red-500 to-rose-500 text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full shadow-sm ${className}`}
      role="status"
      aria-label={`Promotion: ${label}`}
    >
      <Tag className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
      {label}
    </motion.div>
  );
};

export default PromotionBadge;
