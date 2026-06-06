import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { productsAPI } from '../api/endpoints';
import MobilePageHeader from '../components/MobilePageHeader';
import { motion } from 'framer-motion';
import { FolderTree } from 'lucide-react';

const CategoryListPage = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const res = await productsAPI.getCategories({ limit: 100 });
        setCategories(Array.isArray(res.data) ? res.data : []);
      } catch {
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const activeCategories = categories.filter((c) => c.is_active !== false);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <MobilePageHeader title="Categories" />
        <div className="hidden md:block mb-8">
          <h1 className="text-3xl font-bold text-text">Categories</h1>
          <p className="text-gray-500 mt-1">Browse our collection by category</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-xl h-32 animate-pulse" />
            ))}
          </div>
        ) : activeCategories.length === 0 ? (
          <div className="text-center py-16">
            <FolderTree className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No categories available</p>
            <p className="text-gray-400 text-sm mt-1">Categories will appear here once created</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {activeCategories.map((cat, index) => (
              <motion.button
                key={cat.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => navigate(`/products?category=${cat.id}`)}
                className="bg-white rounded-xl border border-gray-100 p-6 text-left hover:shadow-lg hover:border-gray-200 transition-all duration-200 group"
              >
                <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center mb-4 group-hover:bg-gold/20 transition-colors">
                  <FolderTree className="w-6 h-6 text-gold" />
                </div>
                <h3 className="font-semibold text-text mb-1 group-hover:text-gold transition-colors">
                  {cat.name}
                </h3>
                {cat.description && (
                  <p className="text-sm text-gray-500 line-clamp-2">{cat.description}</p>
                )}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryListPage;
