import React from 'react';

const SearchSkeleton = () => (
  <div className="p-2 space-y-1">
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex items-center gap-2.5 px-3 py-2 animate-pulse">
        <div className="w-7 h-7 rounded-md bg-gray-200 flex-shrink-0" />
        <div className="flex-1 space-y-1">
          <div className="h-3 bg-gray-200 rounded w-3/5" />
          <div className="h-2.5 bg-gray-100 rounded w-2/5" />
        </div>
      </div>
    ))}
  </div>
);

export default SearchSkeleton;
