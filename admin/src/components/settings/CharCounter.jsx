import React from 'react';

const CharCounter = ({ current, max, warningAt }) => {
  const count = (current || '').length;
  const limit = max || 60;
  const warn = warningAt || Math.round(limit * 0.75);
  const over = count > limit;
  const nearWarn = count >= warn && count <= limit;

  return (
    <span className={`text-xs tabular-nums ${over ? 'text-red-500 font-medium' : nearWarn ? 'text-amber-500' : 'text-gray-400'}`}>
      {count} / {limit}
    </span>
  );
};

export default CharCounter;
