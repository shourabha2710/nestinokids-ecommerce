import React from 'react';
import { Search, Package, ShoppingCart, User, Ticket } from 'lucide-react';

const CATEGORY_ICONS = {
  product: Package,
  order: ShoppingCart,
  customer: User,
  support: Ticket,
};

const CATEGORY_LABELS = {
  product: 'Products',
  order: 'Orders',
  customer: 'Customers',
  support: 'Support',
};

const SearchResultItem = ({ item, onSelect, isHighlighted }) => {
  const Icon = CATEGORY_ICONS[item.type] || Search;

  return (
    <button
      onClick={() => onSelect(item)}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
        isHighlighted ? 'bg-gray-100' : 'hover:bg-gray-50'
      }`}
    >
      <div className="flex-shrink-0 w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center">
        <Icon className="w-3.5 h-3.5 text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate leading-tight">{item.title}</p>
        <p className="text-xs text-gray-500 truncate leading-tight">{item.subtitle}</p>
      </div>
      <span className="text-[10px] uppercase tracking-wider text-gray-400 flex-shrink-0">
        {CATEGORY_LABELS[item.type]}
      </span>
    </button>
  );
};

export default SearchResultItem;
