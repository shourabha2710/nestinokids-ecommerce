import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { adminAnnouncementAPI } from '../../api/endpoints';
import { Megaphone, Plus, X } from 'lucide-react';

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({
    message: '', link: '', is_active: true, start_date: '', end_date: '',
  });

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await adminAnnouncementAPI.getAnnouncements();
      setAnnouncements(res.data || []);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const formatDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    return date.toISOString().slice(0, 16);
  };

  const openCreate = () => {
    setEditItem(null);
    setForm({ message: '', link: '', is_active: true, start_date: '', end_date: '' });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      message: item.message,
      link: item.link || '',
      is_active: item.is_active,
      start_date: formatDate(item.start_date),
      end_date: formatDate(item.end_date),
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      const data = {
        ...form,
        start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
      };
      if (editItem) {
        await adminAnnouncementAPI.updateAnnouncement(editItem.id, data);
      } else {
        await adminAnnouncementAPI.createAnnouncement(data);
      }
      setShowModal(false);
      fetchAnnouncements();
    } catch {}
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await adminAnnouncementAPI.deleteAnnouncement(id);
      fetchAnnouncements();
    } catch {}
  };

  const toggleActive = async (item) => {
    try {
      await adminAnnouncementAPI.updateAnnouncement(item.id, { is_active: !item.is_active });
      fetchAnnouncements();
    } catch {}
  };

  const isExpired = (item) => {
    if (!item.end_date) return false;
    return new Date(item.end_date) < new Date();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
          <p className="text-gray-500 mt-1">Manage announcement bar messages</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 bg-gold text-white rounded-lg text-sm font-semibold hover:bg-opacity-90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Announcement
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center">
          <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
          <Megaphone className="w-10 h-10 mx-auto mb-3" />
          <p className="font-medium">No announcements yet</p>
          <button onClick={openCreate} className="text-gold font-semibold mt-2 hover:underline">
            Create your first announcement
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border p-5 transition-all ${
                isExpired(item) ? 'border-gray-100 opacity-60' : 'border-gray-100 hover:shadow-md'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Megaphone className="w-4 h-4 text-gold flex-shrink-0" />
                    <p className="font-medium text-gray-900 text-sm">{item.message}</p>
                  </div>
                  {item.link && (
                    <p className="text-xs text-blue-500 truncate mt-0.5">Link: {item.link}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                    {item.start_date && <span>From: {new Date(item.start_date).toLocaleDateString()}</span>}
                    {item.end_date && <span>To: {new Date(item.end_date).toLocaleDateString()}</span>}
                    {isExpired(item) && <span className="text-red-400 font-medium">Expired</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => toggleActive(item)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      item.is_active ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    {item.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-gray-100 rounded-lg text-xs text-gray-500">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-xs text-red-400">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-text text-lg">{editItem ? 'Edit Announcement' : 'Add Announcement'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <input
                  type="text"
                  value={form.message}
                  onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link (optional)</label>
                <input
                  type="text"
                  value={form.link}
                  onChange={(e) => setForm((p) => ({ ...p, link: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold"
                  placeholder="https://..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="datetime-local"
                    value={form.start_date}
                    onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="datetime-local"
                    value={form.end_date}
                    onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                  className="rounded border-gray-300 text-gold focus:ring-gold"
                />
                Active
              </label>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-gold text-white rounded-lg text-sm font-semibold hover:bg-opacity-90"
                >
                  {editItem ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Announcements;
