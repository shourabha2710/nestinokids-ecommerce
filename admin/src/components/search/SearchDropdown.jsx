import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, ShoppingCart, User, Ticket, AlertCircle } from 'lucide-react';
import SearchResultItem from './SearchResultItem';
import SearchSkeleton from './SearchSkeleton';
import SearchEmptyState from './SearchEmptyState';

const SECTION_LABELS = {
  products: { icon: Package, label: 'Products' },
  orders: { icon: ShoppingCart, label: 'Orders' },
  customers: { icon: User, label: 'Customers' },
  support: { icon: Ticket, label: 'Support' },
};

const dropdownVariants = {
  hidden: { opacity: 0, y: -4 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

const SearchDropdown = ({
  isOpen,
  results,
  query,
  isLoading,
  searchError,
  onSelect,
  highlightedIndex,
}) => {
  const flatResults = Object.entries(results || {}).reduce((acc, [, items]) => {
    return acc.concat(items);
  }, []);

  const hasResults = flatResults.length > 0;
  const showEmpty = !isLoading && !searchError && query.length >= 2 && !hasResults;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={dropdownVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.12, ease: 'easeOut' }}
          className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-gray-200 z-[100] origin-top"
          style={{ transformOrigin: 'top center' }}
        >
          <div className="max-h-[350px] overflow-y-auto">
            {isLoading && <SearchSkeleton />}

            {!isLoading && searchError && (
              <div className="flex flex-col items-center justify-center h-32 px-4">
                <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center mb-2">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                </div>
                <p className="text-sm font-medium text-gray-900">Search temporarily unavailable</p>
                <p className="text-xs text-gray-500 mt-0.5">Please try again later</p>
              </div>
            )}

            {!isLoading && !searchError && hasResults && (
              <div className="py-1">
                {Object.entries(results).map(([category, items]) => {
                  if (!items.length) return null;
                  const section = SECTION_LABELS[category];
                  const SectionIcon = section?.icon;
                  return (
                    <div key={category}>
                      <div className="flex items-center gap-1.5 px-3 pt-2 pb-1">
                        {SectionIcon && <SectionIcon className="w-3 h-3 text-gray-400" />}
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                          {section?.label || category}
                        </span>
                      </div>
                      {items.map((item, idx) => {
                        const globalIdx = Object.entries(results)
                          .slice(0, Object.keys(results).indexOf(category))
                          .reduce((sum, [, catItems]) => sum + catItems.length, 0) + idx;
                        return (
                          <SearchResultItem
                            key={`${item.type}-${item.id}`}
                            item={item}
                            onSelect={onSelect}
                            isHighlighted={globalIdx === highlightedIndex}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}

            {showEmpty && <SearchEmptyState query={query} />}

            {!isLoading && !searchError && query.length < 2 && query.length > 0 && (
              <div className="flex items-center justify-center h-20 px-4">
                <p className="text-sm text-gray-500">Type at least 2 characters to search</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SearchDropdown;
