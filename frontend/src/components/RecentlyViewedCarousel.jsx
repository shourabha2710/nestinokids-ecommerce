import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { recentlyViewedAPI } from '../api/endpoints';
import ProductCard from './ProductCard';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const container = {
  animate: { transition: { staggerChildren: 0.07 } },
};

const RecentlyViewedCarousel = () => {
  const scrollRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    recentlyViewedAPI.getRecent({ limit: 12 })
      .then((res) => setProducts(Array.isArray(res.data) ? res.data : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 340, behavior: 'smooth' });
    }
  };

  if (loading) return null;
  if (products.length === 0) return null;

  return (
    <section className="py-14 lg:py-20 bg-[#FFFCF7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8 lg:mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-text">Recently Viewed</h2>
              <p className="text-text-muted text-sm">Pick up where you left off</p>
            </div>
          </div>
          <div className="hidden md:flex gap-2">
            <button onClick={() => scroll(-1)} className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:border-gold hover:text-gold transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => scroll(1)} className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:border-gold hover:text-gold transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <motion.div
          ref={scrollRef}
          variants={container}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
        >
          {products.map((product, i) => (
            <div key={product.id} className="flex-shrink-0 w-[260px] snap-start">
              <ProductCard product={product} index={i} />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default RecentlyViewedCarousel;
