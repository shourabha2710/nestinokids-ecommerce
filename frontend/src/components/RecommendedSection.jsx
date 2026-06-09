import React, { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { recommendationAPI } from '../api/endpoints';
import ProductCard from './ProductCard';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const container = {
  animate: { transition: { staggerChildren: 0.07 } },
};

const RecommendedSection = () => {
  const scrollRef = useRef(null);
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    recommendationAPI.getRecommendations({ limit: 8 })
      .then((res) => {
        const data = res.data;
        if (data?.products && Array.isArray(data.products)) {
          setProducts(data.products);
        } else if (Array.isArray(data)) {
          setProducts(data);
        } else {
          setProducts([]);
        }
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 340, behavior: 'smooth' });
    }
  };

  if (!isAuthenticated) return null;
  if (loading) return null;
  if (products.length === 0) return null;

  return (
    <section className="py-14 lg:py-20 gradient-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8 lg:mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-text">Recommended For You</h2>
              <p className="text-text-muted text-sm">Based on your preferences</p>
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

export default RecommendedSection;
