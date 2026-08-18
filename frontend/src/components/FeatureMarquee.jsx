import React from 'react';
import { Truck, Banknote, ShieldCheck, RotateCcw, Sparkles } from 'lucide-react';

const conversionItems = [
  { icon: Truck, label: 'Free Shipping', sub: 'on orders ₹999+' },
  { icon: Banknote, label: 'COD Available', sub: 'pay on delivery' },
  { icon: ShieldCheck, label: 'Secure Checkout', sub: '100% safe payment' },
  { icon: RotateCcw, label: '7-Day Returns', sub: 'easy & hassle-free' },
  { icon: Sparkles, label: 'Premium Quality', sub: 'handpicked fabrics' },
];

const MarqueeItems = () => (
  <>
    {conversionItems.map((item) => {
      const Icon = item.icon;
      return (
        <div key={item.label} className="marquee-item flex items-center gap-2 sm:gap-2.5 px-3 sm:px-5">
          <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold" />
          </span>
          <span className="text-xs sm:text-sm font-semibold text-text whitespace-nowrap">{item.label}</span>
          <span className="text-[11px] sm:text-sm text-text-muted whitespace-nowrap">• {item.sub}</span>
        </div>
      );
    })}
  </>
);

const FeatureMarquee = () => (
  <div
    className="marquee-viewport w-full bg-gradient-to-r from-gold/10 via-[#FFFCF7] to-gold/10 border-b border-gold/10 py-2 sm:py-2.5"
    role="marquee"
    aria-label="Store features"
  >
    <div className="marquee-track">
      <div className="marquee-segment" aria-hidden="false">
        <MarqueeItems />
      </div>
      <div className="marquee-segment" aria-hidden="true">
        <MarqueeItems />
      </div>
    </div>
  </div>
);

export default FeatureMarquee;
