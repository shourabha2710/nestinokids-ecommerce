import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { adminAPI } from '../../services/adminApi';
import { usePermissions } from '../../hooks/usePermissions';
import { Permissions } from '../../constants/permissions';
import {
  MessageSquare, Search, X, AlertTriangle, ChevronDown, Trash2,
} from 'lucide-react';

const STATUS_COLORS = {
  Open: 'bg-yellow-100 text-yellow-800',
  'In Progress': 'bg-blue-100 text-blue-800',
  Resolved: 'bg-green-100 text-green-800',
  Closed: 'bg-gray-100 text-gray-800',
};

const PRIORITY_COLORS = {
  Low: 'bg-gray-100 text-gray-600',
  Medium: 'bg-blue-50 text-blue-600',
  High: 'bg-orange-100 text-orange-700',
  Urgent: 'bg-red-100 text-red-700',
};

const SupportTickets = () => {
  const { hasPermission } = usePermissions();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [editModal, setEditModal] = useState(null);
  const [editStatus, setEditStatus] = useState('');
  const [editPriority, setEditPriority] = useState('');
  const [search, setSearch] = useState('');

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      const res = await adminAPI.getSupportTickets(params);
      setTickets(res.data || []);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTickets(); }, [statusFilter, priorityFilter]);

  const filtered = tickets.filter((t) =>
    !search || t.subject?.toLowerCase().includes(search.toLowerCase()) || t.user_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleUpdate = async () => {
    if (!editModal) return;
    try {
      await adminAPI.updateSupportTicket(editModal.id, {
        status: editStatus,
        priority: editPriority,
      });
      setEditModal(null);
      fetchTickets();
    } catch {}
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this ticket?')) return;
    try {
      await adminAPI.deleteSupportTicket(id);
      fetchTickets();
    } catch {}
  };

  const openEdit = (ticket) => {
    setEditModal(ticket);
    setEditStatus(ticket.status);
    setEditPriority(ticket.priority);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Support Tickets</h1>
        <p className="text-text-muted mt-1">Manage customer support requests</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-border">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
          >
            <option value="">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
          >
            <option value="">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-text-muted">
            <MessageSquare className="w-10 h-10 mx-auto mb-3" />
            <p className="font-medium">No tickets found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#FFFCF7] text-text-muted text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Subject</th>
                  <th className="text-left px-4 py-3 font-medium">Customer</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Priority</th>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-[#FFFCF7] transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-text truncate max-w-[250px]">{ticket.subject}</p>
                      <p className="text-xs text-text-muted truncate max-w-[250px] mt-0.5">{ticket.message}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-text">{ticket.user_name}</p>
                      <p className="text-xs text-text-muted">{ticket.user_email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[ticket.status] || 'bg-gray-100'}`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[ticket.priority] || 'bg-gray-100'}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-muted text-xs">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {hasPermission(Permissions.SUPPORT_REPLY) && (
                          <button
                            onClick={() => openEdit(ticket)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <ChevronDown className="w-4 h-4 text-text-muted" />
                          </button>
                        )}
                        {hasPermission(Permissions.SUPPORT_REPLY) && (
                          <button
                            onClick={() => handleDelete(ticket.id)}
                            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditModal(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-text text-lg">Update Ticket</h3>
              <button onClick={() => setEditModal(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-text-muted mb-4">{editModal.subject}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Priority</label>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setEditModal(null)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  className="flex-1 px-4 py-2 bg-gold text-white rounded-lg text-sm font-semibold hover:bg-gold-dark transition-colors"
                >
                  Update
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default SupportTickets;
