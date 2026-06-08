import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminReviewsAPI } from '../../api/endpoints';
import {
  Star, Plus, Edit3, Trash2, AlertTriangle, X, Save, Upload,
  CheckCircle, Loader2, MessageSquareText,
} from 'lucide-react';

const emptyForm = {
  customer_name: '',
  review_text: '',
  rating: 5,
  city: '',
  is_featured: false,
  display_order: 0,
  is_active: true,
};

const StarRating = ({ value, onChange, readonly }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        disabled={readonly}
        onClick={() => onChange?.(star)}
        className={`p-0.5 transition-colors ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
      >
        <Star
          size={20}
          className={`${star <= value ? 'text-gold fill-gold' : 'text-gray-200'} transition-colors`}
        />
      </button>
    ))}
  </div>
);

const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const fileInputRef = useRef(null);
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const MAX_FILE_SIZE = 5 * 1024 * 1024;

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminReviewsAPI.getReviews();
      setReviews(res.data);
    } catch {
      setError('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setSelectedFile(null);
    setFilePreview(null);
    setError('');
    setShowModal(true);
  };

  const openEdit = (review) => {
    setEditingId(review.id);
    setForm({
      customer_name: review.customer_name,
      review_text: review.review_text,
      rating: review.rating,
      city: review.city || '',
      is_featured: review.is_featured,
      display_order: review.display_order,
      is_active: review.is_active,
    });
    setSelectedFile(null);
    setFilePreview(null);
    setError('');
    setShowModal(true);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Invalid file type. Allowed: jpg, jpeg, png, webp');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('File too large. Maximum size is 5MB');
      return;
    }
    setSelectedFile(file);
    setFilePreview(URL.createObjectURL(file));
    setError('');
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!form.customer_name.trim()) {
      setError('Customer name is required');
      return;
    }
    if (!form.review_text.trim()) {
      setError('Review text is required');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const formData = new FormData();
      formData.append('customer_name', form.customer_name.trim());
      formData.append('review_text', form.review_text.trim());
      formData.append('rating', String(form.rating));
      if (form.city.trim()) formData.append('city', form.city.trim());
      formData.append('is_featured', String(form.is_featured));
      formData.append('display_order', String(form.display_order));
      formData.append('is_active', String(form.is_active));

      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      if (editingId) {
        if (form.customer_image) {
          formData.append('customer_image_url', form.customer_image);
        }
        await adminReviewsAPI.updateReview(editingId, formData);
        showToast('Review updated successfully');
      } else {
        await adminReviewsAPI.createReview(formData);
        showToast('Review created successfully');
      }

      setShowModal(false);
      setSelectedFile(null);
      setFilePreview(null);
      await fetchReviews();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(Array.isArray(detail) ? detail.map((e) => e.msg).join(', ') : (detail || 'Failed to save review'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id, isActive) => {
    setTogglingId(id);
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_active: isActive } : r))
    );
    try {
      const formData = new FormData();
      formData.append('is_active', String(isActive));
      await adminReviewsAPI.updateReview(id, formData);
      showToast(isActive ? 'Review activated' : 'Review deactivated');
    } catch {
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_active: !isActive } : r))
      );
      showToast('Failed to toggle status', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const confirmDelete = (id) => setDeleteId(id);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await adminReviewsAPI.deleteReview(deleteId);
      setDeleteId(null);
      showToast('Review deleted');
      await fetchReviews();
    } catch {
      showToast('Failed to delete review', 'error');
    }
  };

  const getProfileImage = (review) => {
    if (filePreview && editingId === review.id) return filePreview;
    return review.customer_image || null;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Customer Reviews</h1>
          <p className="text-text-muted text-sm mt-1">
            Manage testimonials displayed on the homepage
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-gold text-white rounded-lg hover:bg-gold-dark transition-colors"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Add Review</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2 text-sm">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm shadow-lg ${
            toast.type === 'error'
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-green-50 border border-green-200 text-green-700'
          }`}
        >
          {toast.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
          {toast.message}
        </motion.div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-text-muted">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold/10 to-amber-50 flex items-center justify-center mb-4">
                <MessageSquareText size={32} className="text-gold/40" />
              </div>
              <p className="text-lg font-semibold text-text mb-1">No reviews yet</p>
              <p className="text-sm mb-6">Add your first customer testimonial</p>
              <button
                onClick={openAdd}
                className="flex items-center gap-2 px-4 py-2 bg-gold text-white rounded-lg hover:bg-gold-dark text-sm font-medium transition-colors"
              >
                <Plus size={16} />
                Add your first review
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-[#FFFCF7]">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Customer</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Review</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Rating</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reviews.map((review) => (
                  <motion.tr
                    key={review.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="hover:bg-[#FFFCF7]"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-gold/10 to-amber-50 border border-white/50 flex items-center justify-center flex-shrink-0">
                          {review.customer_image ? (
                            <img
                              src={review.customer_image}
                              alt=""
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <span className="text-xs font-bold text-gold/60">
                              {review.customer_name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-text truncate">{review.customer_name}</p>
                          {review.city && (
                            <p className="text-xs text-text-muted truncate">{review.city}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-[280px]">
                      <p className="text-sm text-text-muted line-clamp-2">&ldquo;{review.review_text}&rdquo;</p>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StarRating value={review.rating} readonly />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => toggleActive(review.id, !review.is_active)}
                        disabled={togglingId === review.id}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gold/30 ${
                          review.is_active ? 'bg-green-500' : 'bg-gray-300'
                        } ${togglingId === review.id ? 'opacity-60' : ''}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                            review.is_active ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(review)}
                          className="p-2 text-text-muted hover:text-gold hover:bg-gold/5 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => confirmDelete(review.id)}
                          className="p-2 text-text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => { if (!saving) { setShowModal(false); clearFile(); } }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
                <h2 className="text-lg font-semibold text-text">
                  {editingId ? 'Edit Review' : 'Add Review'}
                </h2>
                <button
                  onClick={() => { if (!saving) { setShowModal(false); clearFile(); } }}
                  className="p-1 text-text-muted hover:text-text rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* Customer Image Preview */}
                <div className="flex justify-center">
                  <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-gold/10 to-amber-50 border-2 border-white shadow-md flex items-center justify-center">
                    {filePreview ? (
                      <img src={filePreview} alt="" className="w-full h-full object-cover" />
                    ) : editingId && reviews.find((r) => r.id === editingId)?.customer_image ? (
                      <img
                        src={reviews.find((r) => r.id === editingId).customer_image}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-gold/40">
                        {form.customer_name ? form.customer_name.charAt(0).toUpperCase() : '?'}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.customer_name}
                    onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                    placeholder="e.g. Priya S."
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">
                    Review Text <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={form.review_text}
                    onChange={(e) => setForm({ ...form, review_text: e.target.value })}
                    placeholder="Write the customer's testimonial..."
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold resize-y"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">Rating</label>
                  <StarRating value={form.rating} onChange={(v) => setForm({ ...form, rating: v })} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">
                    City <span className="text-text-muted font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="e.g. New Delhi"
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">
                    Customer Photo <span className="text-text-muted font-normal">(Optional)</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 border border-dashed border-border rounded-lg text-sm text-text-muted hover:text-gold hover:border-gold transition-colors"
                    >
                      <Upload size={16} />
                      {selectedFile ? 'Change Photo' : 'Upload Photo'}
                    </button>
                    {selectedFile && (
                      <button
                        type="button"
                        onClick={clearFile}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X size={16} />
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                  {selectedFile && (
                    <p className="mt-1.5 text-xs text-text-muted flex items-center gap-1 truncate">
                      <Upload size={12} />
                      {selectedFile.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">Display Order</label>
                  <input
                    type="number"
                    min="0"
                    value={form.display_order}
                    onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
                  />
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_featured}
                    onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                    className="w-4 h-4 text-gold focus:ring-gold/30 border-border rounded"
                  />
                  <span className="text-sm font-medium text-text">Featured</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="w-4 h-4 text-gold focus:ring-gold/30 border-border rounded"
                  />
                  <span className="text-sm font-medium text-text">Active</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-[#FFFCF7] shrink-0">
                <button
                  onClick={() => { setShowModal(false); clearFile(); }}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-gold text-white rounded-lg hover:bg-gold-dark text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <><Loader2 size={16} className="animate-spin" /> Saving...</>
                  ) : (
                    <><Save size={16} /> {editingId ? 'Update' : 'Create'}</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setDeleteId(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-50 rounded-full">
                  <AlertTriangle size={20} className="text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-text">Delete Review</h3>
              </div>
              <p className="text-sm text-text-muted mb-6">
                Are you sure you want to delete this review? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Reviews;
