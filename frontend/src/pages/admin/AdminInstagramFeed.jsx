import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { adminInstagramAPI } from '../../api/endpoints';
import {
  Camera, Plus, Edit3, Trash2, AlertTriangle, X, Save, Upload,
  Eye, EyeOff, GripVertical, MousePointer2, CheckCircle, Loader2,
} from 'lucide-react';

const emptyForm = {
  post_url: '',
  thumbnail_image: '',
  display_order: 0,
  is_active: true,
};

const SortableRow = ({ post, onEdit, onDelete, onToggle, togglingId }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: post.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
    position: 'relative',
  };

  return (
    <motion.tr
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="hover:bg-[#FFFCF7]"
    >
      <td className="py-3 px-2 w-10">
        <button
          {...attributes}
          {...listeners}
          className="p-1 text-text-muted hover:text-text cursor-grab active:cursor-grabbing transition-colors touch-none"
          title="Drag to reorder"
        >
          <GripVertical size={16} />
        </button>
      </td>
      <td className="py-3 px-4">
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-gold/10 to-amber-50 border border-white/50 flex items-center justify-center">
          {post.thumbnail_image ? (
            <img
              src={post.thumbnail_image}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <Camera size={18} className="text-text/20" />
          )}
        </div>
      </td>
      <td className="py-3 px-4 max-w-[180px]">
        <a
          href={post.post_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gold hover:text-gold-dark truncate block"
        >
          {post.post_url}
        </a>
      </td>
      <td className="py-3 px-4 text-center">
        <div className="flex items-center justify-center gap-1.5 text-sm text-text-muted">
          <MousePointer2 size={14} />
          {post.click_count ?? 0}
        </div>
      </td>
      <td className="py-3 px-4 text-center">
        <button
          onClick={() => onToggle(post.id, !post.is_active)}
          disabled={togglingId === post.id}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gold/30 ${
            post.is_active ? 'bg-green-500' : 'bg-gray-300'
          } ${togglingId === post.id ? 'opacity-60' : ''}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
              post.is_active ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </td>
      <td className="py-3 px-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => onEdit(post)}
            className="p-2 text-text-muted hover:text-gold hover:bg-gold/5 rounded-lg transition-colors"
            title="Edit"
          >
            <Edit3 size={16} />
          </button>
          <button
            onClick={() => onDelete(post.id)}
            className="p-2 text-text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </motion.tr>
  );
};

const AdminInstagramFeed = () => {
  const [posts, setPosts] = useState([]);
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
  const toastTimeout = useRef(null);
  const isInitialRender = useRef(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const showToast = useCallback((message, type = 'success') => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast({ message, type });
    toastTimeout.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminInstagramAPI.getPosts();
      setPosts(res.data);
    } catch (err) {
      setError('Failed to load Instagram posts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    return () => {
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
    };
  }, [fetchPosts]);

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setSelectedFile(null);
    setFilePreview(null);
    setError('');
    setShowModal(true);
  };

  const openEdit = (post) => {
    setEditingId(post.id);
    setForm({
      post_url: post.post_url,
      thumbnail_image: post.thumbnail_image || '',
      display_order: post.display_order,
      is_active: post.is_active,
    });
    setSelectedFile(null);
    setFilePreview(null);
    setImageLoadError(false);
    setError('');
    setShowModal(true);
  };

  const [imageLoadError, setImageLoadError] = useState(false);

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
    setImageLoadError(false);
    setError('');
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getThumbnailSource = () => {
    if (editingId && !selectedFile) return form.thumbnail_image || null;
    return null;
  };

  const handleSave = async () => {
    if (!form.post_url.trim()) {
      setError('Instagram post URL is required');
      return;
    }
    if (!form.thumbnail_image.trim() && !selectedFile) {
      setError('Either Thumbnail URL or an uploaded image is required');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const formData = new FormData();
      formData.append('post_url', form.post_url.trim());
      formData.append('display_order', String(form.display_order));
      formData.append('is_active', String(form.is_active));

      if (form.thumbnail_image.trim()) {
        formData.append('thumbnail_url', form.thumbnail_image.trim());
      }
      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      if (editingId) {
        await adminInstagramAPI.updatePost(editingId, formData);
        showToast('Instagram post updated successfully');
      } else {
        await adminInstagramAPI.createPost(formData);
        showToast('Instagram post created successfully');
      }

      setShowModal(false);
      setSelectedFile(null);
      setFilePreview(null);
      await fetchPosts();
    } catch (err) {
      const detail = err.response?.data?.detail;
      console.log('Instagram post save error:', err.response?.data);
      if (Array.isArray(detail)) {
        setError(detail.map((e) => e.msg).join(', '));
      } else {
        setError(detail || 'Failed to save Instagram post');
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id, isActive) => {
    setTogglingId(id);
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_active: isActive } : p))
    );
    try {
      await adminInstagramAPI.toggleActive(id, isActive);
      showToast(isActive ? 'Post activated' : 'Post deactivated');
    } catch (err) {
      setPosts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_active: !isActive } : p))
      );
      showToast('Failed to toggle status', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = posts.findIndex((p) => p.id === active.id);
    const newIndex = posts.findIndex((p) => p.id === over.id);
    const reordered = arrayMove(posts, oldIndex, newIndex);
    const updated = reordered.map((p, i) => ({ ...p, display_order: i + 1 }));

    setPosts(updated);

    try {
      await adminInstagramAPI.reorder(
        updated.map((p) => ({ id: p.id, display_order: p.display_order }))
      );
    } catch (err) {
      showToast('Failed to save order', 'error');
      await fetchPosts();
    }
  };

  const confirmDelete = (id) => setDeleteId(id);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await adminInstagramAPI.deletePost(deleteId);
      setDeleteId(null);
      showToast('Instagram post deleted');
      await fetchPosts();
    } catch (err) {
      showToast('Failed to delete Instagram post', 'error');
    }
  };

  const getPreviewUrl = () => {
    if (filePreview) return filePreview;
    if (getThumbnailSource()) return getThumbnailSource();
    return null;
  };

  const getPreviewGradient = (index = 0) => {
    const gradients = [
      'from-gold/10 to-amber-50',
      'from-rose-100 to-pink-50',
      'from-sky-100 to-blue-50',
      'from-green-100 to-emerald-50',
      'from-purple-100 to-violet-50',
      'from-amber-100 to-yellow-50',
    ];
    return gradients[index % gradients.length];
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Instagram Feed</h1>
          <p className="text-text-muted text-sm mt-1">
            Manage Instagram posts displayed on the homepage
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-gold text-white rounded-lg hover:bg-gold-dark transition-colors"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Add Post</span>
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
          {toast.type === 'error' ? (
            <AlertTriangle size={16} />
          ) : (
            <CheckCircle size={16} />
          )}
          {toast.message}
        </motion.div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-text-muted">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold/10 to-amber-50 flex items-center justify-center mb-4">
                <Camera size={32} className="text-gold/40" />
              </div>
              <p className="text-lg font-semibold text-text mb-1">
                Instagram feed coming soon
              </p>
              <p className="text-sm mb-6">
                Follow @nestinokids for latest updates
              </p>
              <button
                onClick={openAdd}
                className="flex items-center gap-2 px-4 py-2 bg-gold text-white rounded-lg hover:bg-gold-dark text-sm font-medium transition-colors"
              >
                <Plus size={16} />
                Add your first post
              </button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-[#FFFCF7]">
                    <th className="py-3 px-2 w-10" />
                    <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Thumbnail
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Post URL
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Clicks
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <SortableContext
                    items={posts.map((p) => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <AnimatePresence>
                      {posts.map((post) => (
                        <SortableRow
                          key={post.id}
                          post={post}
                          onEdit={openEdit}
                          onDelete={confirmDelete}
                          onToggle={toggleActive}
                          togglingId={togglingId}
                        />
                      ))}
                    </AnimatePresence>
                  </SortableContext>
                </tbody>
              </table>
            </DndContext>
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
            onClick={() => {
              if (!saving) { setShowModal(false); clearFile(); }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
                <h2 className="text-lg font-semibold text-text">
                  {editingId ? 'Edit Instagram Post' : 'Add Instagram Post'}
                </h2>
                <button
                  onClick={() => { if (!saving) { setShowModal(false); clearFile(); } }}
                  className="p-1 text-text-muted hover:text-text rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* Preview Card */}
                <div className="flex justify-center">
                  <a
                    href={form.post_url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative overflow-hidden rounded-xl aspect-square w-40 bg-gradient-to-br from-gold/10 to-amber-50 border border-white/50 block"
                  >
                    {getPreviewUrl() ? (
                      <img
                        src={getPreviewUrl()}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={() => setImageLoadError(true)}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Camera className="w-10 h-10 text-text/20" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute top-3 right-3">
                      <Camera className="w-5 h-5 text-white drop-shadow-lg" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center backdrop-blur-sm">
                        <div className="w-0 h-0 border-t-[6px] border-b-[6px] border-l-[10px] border-t-transparent border-b-transparent border-l-gray-900 ml-0.5" />
                      </div>
                    </div>
                  </a>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">
                    Instagram Post URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={form.post_url}
                    onChange={(e) => setForm({ ...form, post_url: e.target.value })}
                    placeholder="https://www.instagram.com/p/..."
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">
                    Thumbnail URL <span className="text-text-muted font-normal">(Optional)</span>
                  </label>
                  <input
                    type="url"
                    value={form.thumbnail_image}
                    onChange={(e) => setForm({ ...form, thumbnail_image: e.target.value })}
                    placeholder="https://example.com/thumbnail.jpg"
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">
                    Upload Thumbnail Image
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 border border-dashed border-border rounded-lg text-sm text-text-muted hover:text-gold hover:border-gold transition-colors"
                    >
                      <Upload size={16} />
                      {selectedFile ? 'Change File' : 'Choose File'}
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

                <p className="text-xs text-text-muted leading-relaxed bg-[#FFFCF7] p-3 rounded-lg border border-border">
                  Upload a reel cover image or provide a thumbnail URL. Uploaded image takes priority.
                </p>

                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.display_order}
                    onChange={(e) =>
                      setForm({ ...form, display_order: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
                  />
                </div>

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
                  className="flex items-center gap-2 px-4 py-2 bg-gold text-white rounded-lg hover:bg-gold-dark text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      {editingId ? 'Update' : 'Create'}
                    </>
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
                <h3 className="text-lg font-semibold text-text">Delete Post</h3>
              </div>
              <p className="text-sm text-text-muted mb-6">
                Are you sure you want to delete this Instagram post? This action cannot be undone.
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

export default AdminInstagramFeed;
