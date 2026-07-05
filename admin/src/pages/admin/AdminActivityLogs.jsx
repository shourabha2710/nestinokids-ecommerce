import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { History, Loader2, ChevronDown } from 'lucide-react';
import { auditApi } from '../../services/auditApi';
import ActivityTimeline from '../../components/audit/ActivityTimeline';
import ActivityFilters from '../../components/audit/ActivityFilters';
import ActivityDetailsModal from '../../components/audit/ActivityDetailsModal';

const PAGE_SIZE = 50;

const Skeleton = () => (
  <div className="space-y-2">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-100 animate-pulse">
        <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-3 bg-gray-200 rounded w-3/4" />
          <div className="h-2.5 bg-gray-100 rounded w-1/2" />
          <div className="flex gap-2">
            <div className="h-5 bg-gray-100 rounded w-16" />
            <div className="h-5 bg-gray-100 rounded w-20" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const AdminActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = useCallback(async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setLogs([]);
        setSkip(0);
      }
      const params = { limit: PAGE_SIZE };
      if (reset) params.skip = 0;
      else params.skip = skip;
      if (entityType) params.entity_type = entityType;
      if (action) params.action = action;

      const res = await auditApi.getAuditLogs(params);
      const data = res.data;
      if (reset) {
        setLogs(data.logs || []);
      } else {
        setLogs((prev) => [...prev, ...(data.logs || [])]);
      }
      setTotal(data.total || 0);
      setError('');
    } catch {
      setError('Failed to load activity logs');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [skip, entityType, action]);

  useEffect(() => {
    setSkip(0);
    setLogs([]);
    setLoading(true);
    const params = { limit: PAGE_SIZE };
    if (entityType) params.entity_type = entityType;
    if (action) params.action = action;

    auditApi.getAuditLogs(params)
      .then((res) => {
        setLogs(res.data.logs || []);
        setTotal(res.data.total || 0);
        setSkip(PAGE_SIZE);
        setError('');
      })
      .catch(() => setError('Failed to load activity logs'))
      .finally(() => setLoading(false));
  }, [entityType, action]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    const params = { skip, limit: PAGE_SIZE };
    if (entityType) params.entity_type = entityType;
    if (action) params.action = action;

    try {
      const res = await auditApi.getAuditLogs(params);
      setLogs((prev) => [...prev, ...(res.data.logs || [])]);
      setTotal(res.data.total || 0);
      setSkip((prev) => prev + PAGE_SIZE);
    } catch {
      setError('Failed to load more');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleEntityTypeChange = (val) => {
    setEntityType(val);
    setSkip(0);
  };

  const handleActionChange = (val) => {
    setAction(val);
    setSkip(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold/10 to-amber-50 flex items-center justify-center">
          <History className="w-5 h-5 text-gold" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Activity Logs</h1>
          <p className="text-sm text-gray-500">Track admin actions and system changes</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
        <ActivityFilters
          entityType={entityType}
          action={action}
          onEntityTypeChange={handleEntityTypeChange}
          onActionChange={handleActionChange}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <Skeleton />
      ) : logs.length === 0 ? (
        /* Empty */
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold/10 to-amber-50 flex items-center justify-center mb-4">
            <History className="w-8 h-8 text-gold/40" />
          </div>
          <p className="text-lg font-semibold text-gray-900 mb-1">No activity recorded yet</p>
          <p className="text-sm text-gray-500">Admin actions will appear here</p>
        </div>
      ) : (
        /* Timeline */
        <>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <ActivityTimeline logs={logs} onItemClick={(log) => setSelectedLog(log)} />
          </div>

          {/* Load More */}
          {logs.length < total && (
            <div className="flex justify-center mt-4">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50"
              >
                {loadingMore ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                {loadingMore ? 'Loading...' : `Load More (${logs.length} of ${total})`}
              </button>
            </div>
          )}
        </>
      )}

      {/* Details Modal */}
      <ActivityDetailsModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </motion.div>
  );
};

export default AdminActivityLogs;
