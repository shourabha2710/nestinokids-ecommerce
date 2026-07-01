import React from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import DashboardStatCard from './DashboardStatCard';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const SkeletonCard = () => (
  <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
    <div className="flex items-start justify-between mb-4">
      <div className="w-10 h-10 rounded-xl bg-gray-100" />
      <div className="w-16 h-4 bg-gray-100 rounded" />
    </div>
    <div className="h-8 w-24 bg-gray-100 rounded mb-2" />
    <div className="h-4 w-20 bg-gray-50 rounded" />
  </div>
);

const DashboardStatsGrid = ({ cards, stats, loading }) => {
  if (loading) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        {Array.from({ length: cards.length }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
    >
      {cards.map((card) => (
        <DashboardStatCard
          key={card.key}
          label={card.label}
          value={stats?.[card.key]}
          icon={card.icon}
          color={card.color}
          prefix={card.prefix}
          suffix={card.suffix}
          danger={card.danger}
        />
      ))}

      {/* Most Wishlisted Products */}
      {stats?.most_wishlisted_products?.length > 0 && (
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0 },
          }}
          className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:border-gray-200 transition-all duration-200 col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-2"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-pink-500 bg-opacity-10 flex items-center justify-center">
              <Heart className="w-5 h-5 text-pink-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Most Wishlisted Products</p>
              <p className="text-xs text-gray-500">Top 5 most saved items</p>
            </div>
          </div>
          <div className="space-y-2">
            {stats.most_wishlisted_products.map((item, i) => (
              <div key={item.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 w-5">{i + 1}.</span>
                  <span className="font-medium text-gray-700 truncate max-w-[200px]">{item.name}</span>
                </div>
                <span className="text-xs font-semibold text-pink-500 bg-pink-50 px-2 py-0.5 rounded-full">
                  {item.wishlist_count} saved
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default DashboardStatsGrid;
