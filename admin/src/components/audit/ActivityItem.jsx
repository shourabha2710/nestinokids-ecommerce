import React from 'react';
import { motion } from 'framer-motion';
import ActivityIcon from './ActivityIcon';

const actionLabels = {
  CREATE: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
  LOGIN: 'Logged In',
  STATUS_CHANGE: 'Status Changed',
};

const typeBadge = {
  PRODUCT: { label: 'PRODUCT', class: 'bg-indigo-100 text-indigo-700' },
  ORDER: { label: 'ORDER', class: 'bg-cyan-100 text-cyan-700' },
  INVENTORY: { label: 'INVENTORY', class: 'bg-emerald-100 text-emerald-700' },
  USER: { label: 'USER', class: 'bg-purple-100 text-purple-700' },
};

const actionBadge = {
  CREATE: { label: 'CREATE', class: 'bg-green-100 text-green-700' },
  UPDATE: { label: 'UPDATE', class: 'bg-blue-100 text-blue-700' },
  DELETE: { label: 'DELETE', class: 'bg-red-100 text-red-700' },
  LOGIN: { label: 'LOGIN', class: 'bg-purple-100 text-purple-700' },
  STATUS_CHANGE: { label: 'STATUS CHANGE', class: 'bg-amber-100 text-amber-700' },
};

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return date.toLocaleDateString();
}

const ActivityItem = ({ log, onClick }) => {
  const entityType = typeBadge[log.entity_type] || { label: log.entity_type, class: 'bg-gray-100 text-gray-600' };
  const action = actionBadge[log.action] || { label: log.action, class: 'bg-gray-100 text-gray-600' };
  const actionLabel = actionLabels[log.action] || log.action;
  const userName = log.user_name || 'System';

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onClick(log)}
      className="w-full text-left group"
    >
      <div className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
        <ActivityIcon action={log.action} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">{actionLabel}</span>
            <span className="text-sm text-gray-500 truncate">{log.description}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-400">{userName}</span>
            <span className="text-gray-300">·</span>
            <span className="text-xs text-gray-400">{timeAgo(log.created_at)}</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${entityType.class}`}>
              {entityType.label}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${action.class}`}>
              {action.label}
            </span>
          </div>
        </div>
        <div className="shrink-0 self-center text-gray-300 group-hover:text-gray-400 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </motion.button>
  );
};

export default ActivityItem;
