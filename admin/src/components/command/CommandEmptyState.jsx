import React from 'react';

const CommandEmptyState = ({ query }) => (
  <div className="flex flex-col items-center justify-center py-12">
    <p className="text-sm text-gray-500">No results for "{query}"</p>
    <p className="text-xs text-gray-400 mt-1">Try different keywords</p>
  </div>
);

export default CommandEmptyState;
