import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productsAPI } from '../api/endpoints';
import ProductCard from '../components/ProductCard';
import { motion } from 'framer-motion';
import { Search, X, AlertCircle } from 'lucide-react';

const SearchResultsPage = () => {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [localQuery, setLocalQuery] = useState(q);
  const debounceRef = useRef(null);

  useEffect(() => {
    setLocalQuery(q);
  }, [q]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!localQuery.trim()) {
      setResults([]);
      setLoading(false);
      setError(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await productsAPI.getProducts({ search: localQuery, limit: 50 });
        setResults(Array.isArray(res.data) ? res.data : []);
      } catch {
        setResults([]);
        setError(true);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [localQuery]);

  const activeQuery = localQuery.trim();

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mobile search input only — desktop has Header search bar */}
        <div className="md:hidden mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-12 pr-12 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold shadow-sm"
              autoFocus
            />
            {localQuery && (
              <button
                onClick={() => setLocalQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-lg h-80 animate-pulse" />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Something went wrong</h2>
            <p className="text-gray-400 text-sm">Please try again later.</p>
          </motion.div>
        )}

        {/* Empty state */}
        {!loading && !error && activeQuery && results.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No results found</h2>
            <p className="text-gray-400 text-sm">
              We couldn&apos;t find any products matching &ldquo;{activeQuery}&rdquo;
            </p>
          </motion.div>
        )}

        {/* Result grid */}
        {!loading && !error && results.length > 0 && (
          <>
            <p className="text-sm text-gray-500 mb-6">
              {results.length} result{results.length !== 1 ? 's' : ''} for &ldquo;{activeQuery}&rdquo;
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {results.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SearchResultsPage;
