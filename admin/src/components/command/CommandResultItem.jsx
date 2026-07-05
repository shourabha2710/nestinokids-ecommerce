import React from 'react';
import {
  PackagePlus, ShoppingCart, ClipboardList, FolderTree,
  Bell, LayoutDashboard, Package, User, Ticket, Search as SearchIcon,
} from 'lucide-react';

const ICON_MAP = {
  PackagePlus, ShoppingCart, ClipboardList, FolderTree,
  Bell, LayoutDashboard, Package, User, Ticket,
};

const CommandResultItem = ({ item, isSelected, onSelect }) => {
  const IconComp = ICON_MAP[item.icon] || SearchIcon;

  return (
    <button
      onClick={() => onSelect(item)}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
        isSelected ? 'bg-yellow-50 text-yellow-900' : 'hover:bg-gray-50'
      }`}
    >
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
        isSelected ? 'bg-yellow-100' : 'bg-gray-100'
      }`}>
        <IconComp className={`w-4 h-4 ${isSelected ? 'text-yellow-600' : 'text-gray-500'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isSelected ? 'text-yellow-900' : 'text-gray-900'}`}>
          {item.title}
        </p>
        {item.subtitle && (
          <p className="text-xs text-gray-500 truncate">{item.subtitle}</p>
        )}
        {item.description && (
          <p className="text-xs text-gray-400 truncate">{item.description}</p>
        )}
      </div>
      {item.type && (
        <span className="text-[10px] uppercase tracking-wider text-gray-400 flex-shrink-0">
          {item.type === 'product' ? 'Product' :
           item.type === 'order' ? 'Order' :
           item.type === 'customer' ? 'Customer' :
           item.type === 'support' ? 'Ticket' : ''}
        </span>
      )}
    </button>
  );
};

export default CommandResultItem;
