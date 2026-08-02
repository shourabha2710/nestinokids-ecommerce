import React from 'react';

const BRAND_STYLES = {
  AMAZON: { label: 'Amazon', className: 'font-black lowercase tracking-tight text-[#131921]' },
  FLIPKART: { label: 'Flipkart', className: 'font-bold lowercase tracking-tight text-[#2874F0]' },
  MYNTRA: { label: 'Myntra', className: 'font-bold uppercase tracking-tight text-[#FF3F6C]' },
  FIRSTCRY: { label: 'FirstCry', className: 'font-bold uppercase tracking-tight text-[#E91E63]' },
  MEESHO: { label: 'Meesho', className: 'font-bold uppercase tracking-tight text-[#F2627E]' },
};

const MarketplaceLogo = ({ marketplace, className = '' }) => {
  const key = String(marketplace || '').toUpperCase();
  const brand = BRAND_STYLES[key];

  if (!brand) {
    return (
      <span
        className={`text-sm font-bold uppercase tracking-wide text-text-muted ${className}`}
        aria-label={marketplace || 'Marketplace'}
      >
        {marketplace || 'Marketplace'}
      </span>
    );
  }

  return (
    <span className={`text-base leading-none ${brand.className} ${className}`} aria-label={brand.label}>
      {key === 'AMAZON' ? 'amazon' : brand.label}
    </span>
  );
};

export default MarketplaceLogo;
