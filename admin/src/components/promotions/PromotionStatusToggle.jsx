import React, { useState } from 'react';

const PromotionStatusToggle = ({ promotion, onToggle }) => {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      await onToggle(promotion.id, !promotion.is_active);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-gold/40 disabled:opacity-50 ${
        promotion.is_active ? 'bg-green-500' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${
          promotion.is_active ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
};

export default PromotionStatusToggle;
