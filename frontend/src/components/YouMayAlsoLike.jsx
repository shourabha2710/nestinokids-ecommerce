import React, { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { recommendationAPI } from '../api/endpoints';
import ProductCard from './ProductCard';

const container = {
  animate: { transition: { staggerChildren: 0.07 } },
};

const YouMayAlsoLike = ({ productId }) => {
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
        let arr = [];
        if (data?.products && Array.isArray(data.products)) {
          arr = data.products;
        } else if (Array.isArray(data)) {
          arr = data;
        }
        // Exclude current product
        setProducts(arr.filter((p) => p.id !== productId));
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [productId, isAuthenticated]);

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 340, behavior: 'smooth' });
    }
  };

  if (!isAuthenticated) return null;
  if (loading || products.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="font-display text-2xl lg:text-3xl font-bold text-text">You May Also Like</h2>
          <p className="text-text-muted text-sm">Personalized recommendations</p>
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
    </section>
  );
};

export default YouMayAlsoLike;
