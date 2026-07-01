import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const DashboardStatCard = ({ label, value, icon: Icon, color, prefix, suffix, danger }) => {
  const isZero = value === 0 || value === '0';
  const formatted = prefix
    ? `${prefix}${typeof value === 'number' ? value.toLocaleString() : value ?? 0}`
    : suffix
    ? `${value ?? 0}${suffix}`
    : value ?? 0;

  return (
    <motion.div
      variants={itemVariants}
      className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:border-gray-200 transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl ${color} bg-opacity-10 flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
        </div>
        {!isZero && !danger && (
          <span className="flex items-center space-x-1 text-xs font-medium text-green-600">
            <TrendingUp className="w-3 h-3" />
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{formatted}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </motion.div>
  );
};

export default DashboardStatCard;
