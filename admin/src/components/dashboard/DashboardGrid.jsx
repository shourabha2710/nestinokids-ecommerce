import React from 'react';

const columnMap = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
};

const DashboardGrid = ({ cols = 2, children, className }) => {
  return (
    <div className={`grid gap-4 ${columnMap[cols] || columnMap[2]} ${className || ''}`}>
      {children}
    </div>
  );
};

export default DashboardGrid;
