import React from 'react';
import { Search } from 'lucide-react';

const SearchEmptyState = ({ query }) => (
  <div className="flex flex-col items-center justify-center h-32 px-4">
    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mb-2">
      <Search className="w-4 h-4 text-gray-400" />
    </div>
    <p className="text-sm font-medium text-gray-900">No results for "{query}"</p>
    <p className="text-xs text-gray-500 mt-0.5">Try different keywords or check spelling</p>
  </div>
);

export default SearchEmptyState;
