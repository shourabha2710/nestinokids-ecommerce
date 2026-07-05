import React from 'react';
import { Search, X } from 'lucide-react';

const CommandSearchInput = ({ value, onChange, onKeyDown, inputRef }) => (
  <div className="relative">
    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder="Search products, orders, customers... or type a command"
      className="w-full h-14 pl-12 pr-10 text-base bg-transparent border-none focus:outline-none placeholder:text-gray-400 text-gray-900"
      autoFocus
    />
    {value && (
      <button
        onClick={() => onChange({ target: { value: '' } })}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        <X className="w-4 h-4" />
      </button>
    )}
  </div>
);

export default CommandSearchInput;
