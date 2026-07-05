import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCommandPalette } from '../../hooks/useCommandPalette';
import CommandSearchInput from './CommandSearchInput';
import CommandResultItem from './CommandResultItem';
import CommandSection from './CommandSection';
import CommandEmptyState from './CommandEmptyState';

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, y: -20, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

const CommandPalette = () => {
  const {
    isOpen,
    query,
    results,
    isLoading,
    selectedIndex,
    items,
    inputRef,
    handleInputChange,
    handleInputKeyDown,
    handleSelect,
    close,
  } = useCommandPalette();

  const flatResults = results
    ? Object.values(results).reduce((acc, items) => acc.concat(items), [])
    : [];

  const hasSearchResults = flatResults.length > 0;
  const showSearchResults = query.length >= 2 && !isLoading;
  const showQuickActions = query.length < 2;
  const showEmpty = query.length >= 2 && !isLoading && !hasSearchResults;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200]">
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/40"
            onClick={close}
          />

          <div className="absolute inset-0 overflow-y-auto">
            <div className="min-h-full flex justify-center items-start pt-24 px-4">
              <motion.div
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
              >
                <CommandSearchInput
                  value={query}
                  onChange={handleInputChange}
                  onKeyDown={handleInputKeyDown}
                  inputRef={inputRef}
                />

                <div className="border-t border-gray-100 max-h-[min(60vh,480px)] overflow-y-auto">
                  {isLoading && query.length >= 2 && (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-5 h-5 border-2 border-gray-300 border-t-yellow-400 rounded-full animate-spin" />
                    </div>
                  )}

                  {showQuickActions && (
                    <CommandSection label="Quick Actions">
                      {items.map((item, idx) => (
                        <CommandResultItem
                          key={item.id}
                          item={{ ...item, description: item.description }}
                          isSelected={selectedIndex === idx}
                          onSelect={handleSelect}
                        />
                      ))}
                    </CommandSection>
                  )}

                  {showSearchResults && hasSearchResults && (
                    <>
                      {results.products?.length > 0 && (
                        <CommandSection label="Products">
                          {results.products.map((item, idx) => (
                            <CommandResultItem
                              key={`product-${item.id}`}
                              item={{ ...item, icon: 'Package' }}
                              isSelected={selectedIndex === idx}
                              onSelect={handleSelect}
                            />
                          ))}
                        </CommandSection>
                      )}
                      {results.orders?.length > 0 && (
                        <CommandSection label="Orders">
                          {results.orders.map((item, idx) => {
                            const globalIdx = (results.products?.length || 0) + idx;
                            return (
                              <CommandResultItem
                                key={`order-${item.id}`}
                                item={{ ...item, icon: 'ShoppingCart' }}
                                isSelected={selectedIndex === globalIdx}
                                onSelect={handleSelect}
                              />
                            );
                          })}
                        </CommandSection>
                      )}
                      {results.customers?.length > 0 && (
                        <CommandSection label="Customers">
                          {results.customers.map((item, idx) => {
                            const globalIdx = (results.products?.length || 0) + (results.orders?.length || 0) + idx;
                            return (
                              <CommandResultItem
                                key={`customer-${item.id}`}
                                item={{ ...item, icon: 'User' }}
                                isSelected={selectedIndex === globalIdx}
                                onSelect={handleSelect}
                              />
                            );
                          })}
                        </CommandSection>
                      )}
                      {results.support?.length > 0 && (
                        <CommandSection label="Support">
                          {results.support.map((item, idx) => {
                            const globalIdx = (results.products?.length || 0) + (results.orders?.length || 0) + (results.customers?.length || 0) + idx;
                            return (
                              <CommandResultItem
                                key={`support-${item.id}`}
                                item={{ ...item, icon: 'Ticket' }}
                                isSelected={selectedIndex === globalIdx}
                                onSelect={handleSelect}
                              />
                            );
                          })}
                        </CommandSection>
                      )}
                    </>
                  )}

                  {showEmpty && <CommandEmptyState query={query} />}
                </div>

                <div className="border-t border-gray-100 px-4 py-2.5 flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-medium text-gray-500">↑↓</kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-medium text-gray-500">Enter</kbd>
                    Select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-medium text-gray-500">ESC</kbd>
                    Close
                  </span>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
