import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Monitor, Globe, User as UserIcon, Mail } from 'lucide-react';
import ActivityIcon from './ActivityIcon';

function prettyJson(value) {
  if (!value) return null;
  return Object.entries(value).map(([key, val]) => (
    <div key={key} className="flex gap-2 text-sm">
      <span className="font-medium text-gray-500 capitalize min-w-[100px]">{key.replace(/_/g, ' ')}:</span>
      <span className="text-gray-900">{String(val)}</span>
    </div>
  ));
}

const ActivityDetailsModal = ({ log, onClose }) => {
  if (!log) return null;

  return (
    <AnimatePresence>
      {log && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <ActivityIcon action={log.action} />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Activity Details</h2>
                  <p className="text-sm text-gray-500">{log.description}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* User & Meta */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <UserIcon className="w-4 h-4" />
                    <span>{log.user_name || 'System'}</span>
                  </div>
                  {log.user_email && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Mail className="w-4 h-4" />
                      <span>{log.user_email}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  {log.ip_address && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Globe className="w-4 h-4" />
                      <span>{log.ip_address}</span>
                    </div>
                  )}
                </div>
              </div>

              {log.user_agent && (
                <div className="flex items-start gap-2 text-sm text-gray-500">
                  <Monitor className="w-4 h-4 mt-0.5" />
                  <span className="break-all">{log.user_agent}</span>
                </div>
              )}

              {/* Badges */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider bg-gray-100 text-gray-700">
                  {log.entity_type}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider bg-gray-100 text-gray-700">
                  {log.action}
                </span>
                {log.entity_id && (
                  <span className="text-xs text-gray-400">ID: {log.entity_id}</span>
                )}
              </div>

              {/* Old vs New Values */}
              {(log.old_values || log.new_values) && (
                <div className="grid grid-cols-2 gap-4">
                  {log.old_values && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Before</h3>
                      <div className="bg-red-50 rounded-lg p-3 space-y-1">
                        {prettyJson(log.old_values)}
                      </div>
                    </div>
                  )}
                  {log.new_values && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">After</h3>
                      <div className="bg-green-50 rounded-lg p-3 space-y-1">
                        {prettyJson(log.new_values)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl shrink-0">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ActivityDetailsModal;
