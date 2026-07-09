import React, { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, FileText, Package, ClipboardList } from 'lucide-react';
import { analyticsApi } from '../../services/analyticsApi';

const EXPORT_OPTIONS = [
  { key: 'sales', label: 'Sales CSV', icon: FileText },
  { key: 'products', label: 'Products CSV', icon: Package },
  { key: 'inventory', label: 'Inventory CSV', icon: ClipboardList },
];

const ExportReports = () => {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleExport = async (key) => {
    setExporting(key);
    setOpen(false);
    try {
      let res;
      const filename = `${key}-report-${new Date().toISOString().split('T')[0]}.csv`;

      switch (key) {
        case 'sales':
          res = await analyticsApi.exportSales();
          break;
        case 'products':
          res = await analyticsApi.exportProducts();
          break;
        case 'inventory':
          res = await analyticsApi.exportInventory();
          break;
        default:
          return;
      }

      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        disabled={!!exporting}
        className="inline-flex items-center gap-2 px-4 py-2 bg-gold text-white text-sm font-medium rounded-xl hover:bg-gold/90 transition-colors disabled:opacity-60"
      >
        {exporting ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Download size={16} />
        )}
        <span>{exporting ? 'Exporting...' : 'Export'}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1">
          {EXPORT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.key}
                onClick={() => handleExport(opt.key)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Icon size={16} className="text-gray-400" />
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ExportReports;
