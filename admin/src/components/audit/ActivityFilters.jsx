import React from 'react';
import { Filter } from 'lucide-react';

const entityTabs = [
  { key: '', label: 'All' },
  { key: 'PRODUCT', label: 'Products' },
  { key: 'ORDER', label: 'Orders' },
  { key: 'INVENTORY', label: 'Inventory' },
  { key: 'USER', label: 'Users' },
];

const actionOptions = [
  { value: '', label: 'All Actions' },
  { value: 'CREATE', label: 'CREATE' },
  { value: 'UPDATE', label: 'UPDATE' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'LOGIN', label: 'LOGIN' },
  { value: 'STATUS_CHANGE', label: 'STATUS CHANGE' },
];

const ActivityFilters = ({ entityType, action, onEntityTypeChange, onActionChange }) => (
  <div className="space-y-4">
    <div className="flex flex-wrap gap-1 border-b border-gray-200">
      {entityTabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onEntityTypeChange(tab.key)}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            entityType === tab.key
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>

    <div className="flex items-center gap-2">
      <Filter className="w-4 h-4 text-gray-400" />
      <select
        value={action}
        onChange={(e) => onActionChange(e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-700"
      >
        {actionOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  </div>
);

export default ActivityFilters;
