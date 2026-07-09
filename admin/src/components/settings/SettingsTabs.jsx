import React from 'react';
import { ChevronDown } from 'lucide-react';

const SettingsTabs = ({ tabs, activeTab, onChange }) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <>
      {/* Desktop tabs */}
      <div className="hidden md:flex flex-wrap gap-1 bg-white rounded-2xl border border-gray-100 p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-gold text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {Icon && <Icon size={16} />}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Mobile dropdown */}
      <div className="md:hidden relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900"
        >
          <span className="flex items-center gap-2">
            {(() => { const Icon = tabs.find((t) => t.id === activeTab)?.icon; return Icon ? <Icon size={16} /> : null; })()}
            {tabs.find((t) => t.id === activeTab)?.label}
          </span>
          <ChevronDown size={16} className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>
        {dropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { onChange(tab.id); setDropdownOpen(false); }}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors ${
                    active ? 'bg-gold/10 text-gold font-medium' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {Icon && <Icon size={16} />}
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default SettingsTabs;
