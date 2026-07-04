import React from 'react';
import { Search, X, ChevronLeft } from 'lucide-react';
import { useGlobalSearch } from '../../hooks/useGlobalSearch';
import SearchDropdown from './SearchDropdown';

const GlobalSearch = () => {
  const {
    query,
    results,
    isLoading,
    isOpen,
    mobileOpen,
    searchError,
    highlightedIndex,
    inputRef,
    containerRef,
    mobileContainerRef,
    handleInputChange,
    handleClear,
    handleFocus,
    handleSelect,
    handleKeyDown,
    openMobile,
    closeMobile,
  } = useGlobalSearch();

  return (
    <>
      {/* Desktop search bar */}
      <div ref={containerRef} className="relative w-full max-w-lg hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder="Search products, orders, customers..."
            className="w-full h-12 pl-11 pr-10 text-sm bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 focus:outline-none transition-colors placeholder:text-gray-400"
          />
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <SearchDropdown
          isOpen={isOpen}
          results={results}
          query={query}
          isLoading={isLoading}
          searchError={searchError}
          onSelect={handleSelect}
          highlightedIndex={highlightedIndex}
        />
      </div>

      {/* Mobile search icon */}
      <button
        onClick={openMobile}
        className="md:hidden text-gray-500 hover:text-gray-700 p-1.5"
        aria-label="Open search"
      >
        <Search className="w-5 h-5" />
      </button>

      {/* Mobile search overlay */}
      {mobileOpen && (
        <div className="fixed inset-x-0 top-0 z-[100] md:hidden">
          <div ref={mobileContainerRef} className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
            <button onClick={closeMobile} className="text-gray-500 hover:text-gray-700 flex-shrink-0">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="relative flex-1">
              <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={handleInputChange}
                  onFocus={handleFocus}
                  onKeyDown={handleKeyDown}
                  placeholder="Search products, orders, customers..."
                  className="w-full h-10 pl-9 pr-8 text-sm bg-gray-100 border border-transparent rounded-lg focus:bg-white focus:border-gray-300 focus:outline-none transition-colors placeholder:text-gray-400"
                  autoFocus
                />
                {query && (
                  <button
                    onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <SearchDropdown
                isOpen={isOpen}
                results={results}
                query={query}
                isLoading={isLoading}
                searchError={searchError}
                onSelect={handleSelect}
                highlightedIndex={highlightedIndex}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GlobalSearch;
