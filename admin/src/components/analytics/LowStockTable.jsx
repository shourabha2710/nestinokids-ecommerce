import React from 'react';
import { AlertTriangle } from 'lucide-react';

const LowStockTable = ({ data }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">Low Stock Alerts</h3>
        {data && data.length > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-50 text-red-700 border border-red-200">
            <AlertTriangle size={12} />
            {data.length} alert{data.length > 1 ? 's' : ''}
          </span>
        )}
      </div>
      {!data || data.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
          All products are well-stocked
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Product</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Current Stock</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Threshold</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.product_id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                        {item.image ? (
                          <img src={item.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">N/A</div>
                        )}
                      </div>
                      <span className="font-medium text-gray-900 truncate">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className="font-semibold text-red-600">{Intl.NumberFormat('en-IN').format(item.available_quantity)}</span>
                  </td>
                  <td className="px-6 py-3 text-gray-500">{Intl.NumberFormat('en-IN').format(item.low_stock_threshold)}</td>
                  <td className="px-6 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-50 text-red-700 border border-red-200">
                      <AlertTriangle size={12} className="mr-1" />
                      Low Stock
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LowStockTable;
