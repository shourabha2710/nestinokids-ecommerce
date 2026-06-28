import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { productsAPI } from '../api/endpoints';
import MobilePageHeader from '../components/MobilePageHeader';
import Breadcrumb from '../components/Breadcrumb';
import { motion } from 'framer-motion';
import { FolderTree, ChevronRight } from 'lucide-react';

const CategoryListPage = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [categoryTree, setCategoryTree] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [flatRes, treeRes] = await Promise.all([
          productsAPI.getCategories({ limit: 200 }),
          productsAPI.getCategoryTree(),
        ]);
        setCategories(Array.isArray(flatRes.data) ? flatRes.data : []);
        setCategoryTree(Array.isArray(treeRes.data) ? treeRes.data : []);
      } catch {
        setCategories([]);
        setCategoryTree([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const rootCategories = categoryTree;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MobilePageHeader title="Categories" />
        <Breadcrumb className="hidden md:flex mb-6" />
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
        ) : rootCategories.length === 0 ? (
          <div className="text-center py-16">
            <FolderTree className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No categories available</p>
            <p className="text-gray-400 text-sm mt-1">Categories will appear here once created</p>
          </div>
        ) : (
          <div className="space-y-10">
            {rootCategories.map((parent) => (
              <motion.div
                key={parent.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => navigate(`/products?category=${parent.id}`)}
                    className="text-xl font-bold text-text hover:text-gold transition-colors"
                  >
                    {parent.name}
                  </button>
                  <button
                    onClick={() => navigate(`/products?category=${parent.id}`)}
                    className="text-sm text-gold font-medium hover:underline flex items-center gap-1"
                  >
                    View All <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                {parent.description && (
                  <p className="text-sm text-gray-500 mb-4">{parent.description}</p>
                )}
                {parent.children?.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {parent.children.map((child) => (
                      <motion.button
                        key={child.id}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => navigate(`/products?category=${child.id}`)}
                        className="bg-gray-50 hover:bg-gold/10 rounded-xl p-4 text-left border border-gray-100 hover:border-gold/30 transition-all"
                      >
                        <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center mb-2">
                          <FolderTree className="w-5 h-5 text-gold" />
                        </div>
                        <h4 className="font-medium text-text text-sm">{child.name}</h4>
                      </motion.button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No subcategories</p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryListPage;
