import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import PromotionCountdown from './PromotionCountdown';

const PromotionBanner = ({ promotions = [] }) => {
  const nav = useNavigate();
  const [current, setCurrent] = useState(0);

  const sorted = useMemo(() => {
    return [...promotions].sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return new Date(a.start_date) - new Date(b.start_date);
    });
  }, [promotions]);

  useEffect(() => {
    if (sorted.length <= 1) return;
    const id = setInterval(() => {
      setCurrent((p) => (p + 1) % sorted.length);
    }, 6000);
    return () => clearInterval(id);
  }, [sorted.length]);

  const handlePrev = useCallback(() => {
    setCurrent((p) => (p - 1 + sorted.length) % sorted.length);
  }, [sorted.length]);

  const handleNext = useCallback(() => {
    setCurrent((p) => (p + 1) % sorted.length);
  }, [sorted.length]);

  if (sorted.length === 0) return null;

  const promo = sorted[current];

  const gradients = [
    'from-gold/90 via-amber-500 to-yellow-500',
    'from-rose-500 via-pink-500 to-fuchsia-500',
    'from-emerald-500 via-teal-500 to-cyan-500',
    'from-indigo-500 via-blue-500 to-sky-500',
  ];

  const bg = gradients[current % gradients.length];

  const handleCta = () => {
    if (promo.product_id) nav('/products');
    else if (promo.category_id) nav(`/products?category=${promo.category_id}`);
    else nav('/products');
  };

  return (
    <section className="relative overflow-hidden" aria-label="Current promotions">
      <AnimatePresence mode="wait">
        <motion.div
          key={promo.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className={`bg-gradient-to-r ${bg} py-5 sm:py-7 lg:py-8`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              {promo.badge_text && (
                <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full mb-2 uppercase tracking-wide">
                  {promo.badge_text}
                </span>
              )}
              <h3 className="font-display text-lg sm:text-xl lg:text-2xl font-bold text-white leading-snug truncate">
                {promo.name}
              </h3>
              {promo.description && (
                <p className="text-white/80 text-xs sm:text-sm mt-1 truncate">{promo.description}</p>
              )}
              <div className="flex items-center gap-3 mt-3">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleCta}
                  className="h-9 sm:h-10 px-5 sm:px-6 bg-white text-text rounded-lg font-semibold text-xs sm:text-sm flex items-center gap-1.5 shadow hover:bg-white/90 transition-colors"
                  aria-label="Shop now"
                >
                  Shop Now
                  <ArrowRight className="w-3.5 h-3.5" />
                </motion.button>
                <PromotionCountdown endDate={promo.end_date} className="text-white/90" />
              </div>
            </div>
            {sorted.length > 1 && (
              <div className="hidden sm:flex items-center gap-2">
                <button
                  onClick={handlePrev}
                  className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                  aria-label="Previous promotion"
                >
                  <ChevronLeft className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={handleNext}
                  className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                  aria-label="Next promotion"
                >
                  <ChevronRight className="w-4 h-4 text-white" />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {sorted.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/10">
          <motion.div
            key={current}
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 6, ease: 'linear' }}
            className="h-full bg-white/60"
          />
        </div>
      )}
    </section>
  );
};

export default PromotionBanner;
