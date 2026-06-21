import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { adminAPI } from '../../services/adminApi';
import { HelpCircle, Plus, X, Search } from 'lucide-react';

const FAQs = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ question: '', answer: '', category: '', display_order: 0, is_active: true });
  const [search, setSearch] = useState('');

  const fetchFAQs = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getFAQs();
      setFaqs(res.data || []);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFAQs(); }, []);

  const openCreate = () => {
    setEditItem(null);
    setForm({ question: '', answer: '', category: '', display_order: 0, is_active: true });
    setShowModal(true);
  };

  const openEdit = (faq) => {
    setEditItem(faq);
    setForm({
      question: faq.question,
      answer: faq.answer,
      category: faq.category || '',
      display_order: faq.display_order,
      is_active: faq.is_active,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (editItem) {
        await adminAPI.updateFAQ(editItem.id, form);
      } else {
        await adminAPI.createFAQ(form);
      }
      setShowModal(false);
      fetchFAQs();
    } catch {}
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this FAQ?')) return;
    try {
      await adminAPI.deleteFAQ(id);
      fetchFAQs();
    } catch {}
  };

  const toggleActive = async (faq) => {
    try {
      await adminAPI.updateFAQ(faq.id, { is_active: !faq.is_active });
      fetchFAQs();
    } catch {}
  };

  const grouped = faqs.filter((f) =>
    !search || f.question.toLowerCase().includes(search.toLowerCase()) || (f.category || '').toLowerCase().includes(search.toLowerCase())
  ).reduce((acc, faq) => {
    const cat = faq.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(faq);
    return acc;
  }, {});

  const categories = Object.keys(grouped).sort();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">FAQs</h1>
          <p className="text-text-muted mt-1">Manage frequently asked questions</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 bg-gold text-white rounded-lg text-sm font-semibold hover:bg-gold-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add FAQ
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          placeholder="Search FAQs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
        />
      </div>

      {loading ? (
        <div className="p-8 text-center">
          <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : faqs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-border p-12 text-center text-text-muted">
          <HelpCircle className="w-10 h-10 mx-auto mb-3" />
          <p className="font-medium">No FAQs yet</p>
          <button onClick={openCreate} className="text-gold font-semibold mt-2 hover:underline">
            Create your first FAQ
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((cat) => (
            <div key={cat} className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
              <div className="px-5 py-3 bg-[#FFFCF7] border-b border-border">
                <h3 className="font-semibold text-text text-sm">{cat}</h3>
              </div>
              <div className="divide-y divide-border/50">
                {grouped[cat].map((faq) => (
                  <div key={faq.id} className="px-5 py-3.5 hover:bg-[#FFFCF7] transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-2 h-2 rounded-full ${faq.is_active ? 'bg-green-400' : 'bg-gray-300'}`} />
                          <p className="font-medium text-text text-sm">{faq.question}</p>
                        </div>
                        <p className="text-xs text-text-muted line-clamp-2">{faq.answer}</p>
                        <p className="text-[10px] text-text-muted/60 mt-1">Order: {faq.display_order}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => toggleActive(faq)}
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                            faq.is_active ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                          }`}
                        >
                          {faq.is_active ? 'Active' : 'Inactive'}
                        </button>
                        <button onClick={() => openEdit(faq)} className="p-1.5 hover:bg-gray-100 rounded-lg text-xs text-text-muted">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(faq.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-xs text-red-400">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
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
              <h3 className="font-bold text-text text-lg">{editItem ? 'Edit FAQ' : 'Add FAQ'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Question</label>
                <input
                  type="text"
                  value={form.question}
                  onChange={(e) => setForm((p) => ({ ...p, question: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Answer</label>
                <textarea
                  value={form.answer}
                  onChange={(e) => setForm((p) => ({ ...p, answer: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Category</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
                    placeholder="e.g. Shipping"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Display Order</label>
                  <input
                    type="number"
                    value={form.display_order}
                    onChange={(e) => setForm((p) => ({ ...p, display_order: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                  className="rounded border-border text-gold focus:ring-gold/30"
                />
                Active
              </label>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-gold text-white rounded-lg text-sm font-semibold hover:bg-gold-dark"
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

export default FAQs;
