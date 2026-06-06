import React, { useEffect, useState } from 'react';
import { productsAPI } from '../api/endpoints';
import ProductCard from './ProductCard';
import { motion } from 'framer-motion';

const RelatedProducts = ({ productId }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId) return;
    const fetchRelated = async () => {
      try {
        const res = await productsAPI.getRelatedProducts(productId, { limit: 4 });
        setProducts(Array.isArray(res.data) ? res.data : []);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRelated();
  }, [productId]);

  if (loading || products.length === 0) return null;

  return (
    <section>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-8"
      >
        <h2 className="font-display text-2xl lg:text-3xl font-bold text-text">
          You May Also Like
        </h2>
        <p className="text-text-muted text-sm mt-1">
          Complete the look with these matching pieces
        </p>
      </motion.div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {products.map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} />
        ))}
      </div>
    </section>
  );
};

export default RelatedProducts;
