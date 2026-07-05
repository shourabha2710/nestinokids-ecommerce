import React from 'react';
import ActivityItem from './ActivityItem';

const ActivityTimeline = ({ logs, onItemClick }) => {
  if (!logs || logs.length === 0) return null;

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <ActivityItem key={log.id} log={log} onClick={onItemClick} />
      ))}
    </div>
  );
};

export default ActivityTimeline;
