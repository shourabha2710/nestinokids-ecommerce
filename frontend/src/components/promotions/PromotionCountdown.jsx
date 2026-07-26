import React, { useState, useEffect, useMemo } from 'react';

const PromotionCountdown = ({ endDate, className = '' }) => {
  const target = useMemo(() => {
    if (!endDate) return null;
    const d = new Date(endDate);
    return isNaN(d.getTime()) ? null : d;
  }, [endDate]);

  const [remaining, setRemaining] = useState(() => {
    if (!target) return null;
    const diff = target.getTime() - Date.now();
    return diff > 0 ? diff : 0;
  });

  useEffect(() => {
    if (!target) return;
    const tick = () => {
      const diff = target.getTime() - Date.now();
      setRemaining(diff > 0 ? diff : 0);
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [target]);

  if (!remaining) return null;

  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${className}`} aria-label={`Ends in ${parts.join(' ')}`}>
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      Ends in {parts.join(' ')}
    </span>
  );
};

export default PromotionCountdown;
