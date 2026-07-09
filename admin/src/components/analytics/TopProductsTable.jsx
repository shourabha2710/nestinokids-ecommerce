import React from 'react';

const formatINR = (val) => {
  const num = typeof val === 'string' ? parseFloat(val) : (val || 0);
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
};

const TopProductsTable = ({ data }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">Top Products</h3>
      </div>
      {!data || data.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
          No products sold yet
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Product</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Sold</th>
                <th className="text-right px-6 py-3 font-semibold text-gray-600">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.map((product, idx) => (
                <tr key={product.product_id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                        {product.image ? (
                          <img src={product.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                            #{idx + 1}
                          </div>
                        )}
                      </div>
                      <span className="font-medium text-gray-900 truncate">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-gray-700">{Intl.NumberFormat('en-IN').format(product.sold_quantity)}</td>
                  <td className="px-6 py-3 text-right font-medium text-gray-900">{formatINR(product.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TopProductsTable;
