import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productsAPI } from '../api/endpoints';
import ProductCard from '../components/ProductCard';
import MobilePageHeader from '../components/MobilePageHeader';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, X } from 'lucide-react';

const ProductsListingPage = ({ filter, sort: sortProp }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const search = searchParams.get('search') || '';
  const categoryId = searchParams.get('category') || '';
  const activeSort = searchParams.get('sort') || sortProp || 'name';
  const activeFilter = filter || '';

  useEffect(() => {
    fetchProducts();
  }, [search, categoryId, activeSort, activeFilter]);

  useEffect(() => {
    productsAPI.getCategories({ limit: 100 }).then((res) => {
      if (res.data) setCategories(Array.isArray(res.data) ? res.data : []);
    }).catch(() => {});
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = { limit: 50 };
      if (search) params.search = search;
      if (categoryId) params.category_id = categoryId;
      if (activeSort === 'newest') params.sort = 'created_at';
      else if (activeSort === 'price_asc') params.sort = 'price';
      else if (activeSort === 'price_desc') params.sort = '-price';
      else params.sort = 'name';
      if (activeFilter === 'featured') params.is_featured = true;

      const res = await productsAPI.getProducts(params);
      const data = Array.isArray(res.data) ? res.data : (res.data?.products || res.data?.data || []);
      setProducts(data);
      setTotalCount(res.data?.total || res.data?.count || data.length);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const updateSearch = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchParams({});
  };

  const hasFilters = search || categoryId;

  const pageTitle = activeFilter === 'featured' ? 'Best Sellers'
    : activeSort === 'newest' ? 'New Arrivals'
    : 'All Products';

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MobilePageHeader title={pageTitle} className="mb-4 -mx-4 -mt-2" />
        {/* Header */}
        <div className="hidden md:flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text">{pageTitle}</h1>
            <p className="text-gray-500 mt-1">
              {loading ? 'Loading...' : `${totalCount} product${totalCount !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => updateSearch('search', e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all"
              />
              {search && (
                <button
                  onClick={() => updateSearch('search', '')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <select
              value={activeSort}
              onChange={(e) => {
                const params = new URLSearchParams(searchParams);
                if (e.target.value && e.target.value !== 'name') params.set('sort', e.target.value);
                else params.delete('sort');
                setSearchParams(params);
              }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 bg-white"
            >
              <option value="name">Name</option>
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar filters */}
          <div className="lg:w-56 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-100 p-4 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-text text-sm flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters
                </h3>
                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-gold hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Category</h4>
                <div className="space-y-1 max-h-56 overflow-y-auto">
                  <button
                    onClick={() => updateSearch('category', '')}
                    className={`block w-full text-left px-2 py-1.5 rounded-lg text-sm transition ${
                      !categoryId ? 'bg-gold/10 text-gold font-medium' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    All Categories
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => updateSearch('category', String(cat.id))}
                      className={`block w-full text-left px-2 py-1.5 rounded-lg text-sm transition ${
                        categoryId === String(cat.id) ? 'bg-gold/10 text-gold font-medium' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Product grid */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-gray-100 rounded-lg h-80 animate-pulse" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-400 text-lg mb-2">No products found</p>
                <p className="text-gray-400 text-sm mb-4">
                  {hasFilters ? 'Try adjusting your filters' : 'Products will appear here once added'}
                </p>
                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-gold font-semibold hover:underline text-sm"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductsListingPage;
