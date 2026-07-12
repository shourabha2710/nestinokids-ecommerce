import React from 'react';
import { Search } from 'lucide-react';

export default function MediaFilters({ search, setSearch, folder, setFolder, type, setType }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search files..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all bg-white"
        />
      </div>
      <input
        type="text"
        placeholder="Folder"
        value={folder}
        onChange={(e) => setFolder(e.target.value)}
        className="w-full sm:w-36 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all bg-white"
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="w-full sm:w-32 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all bg-white"
      >
        <option value="">All types</option>
        <option value="image">Image</option>
        <option value="video">Video</option>
        <option value="document">Document</option>
      </select>
    </div>
  );
}
