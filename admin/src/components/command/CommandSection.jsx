import React from 'react';

const CommandSection = ({ label, children }) => (
  <div>
    <div className="px-4 pt-3 pb-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </span>
    </div>
    {children}
  </div>
);

export default CommandSection;
