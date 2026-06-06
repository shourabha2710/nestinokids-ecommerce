import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminInstagramAPI } from '../../api/endpoints';
import {
  Camera,
  Plus,
  Edit3,
  Trash2,
  AlertTriangle,
  X,
  Save,
  Eye,
  EyeOff,
  Upload,
  File,
} from 'lucide-react';

const emptyForm = {
  post_url: '',
  thumbnail_image: '',
  display_order: 0,
  is_active: true,
};

const AdminInstagramFeed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [imgError, setImgError] = useState(false);
  const fileInputRef = useRef(null);
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await adminInstagramAPI.getPosts();
      setPosts(res.data);
    } catch (err) {
      setError('Failed to load Instagram posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setSelectedFile(null);
    setFilePreview(null);
    setImgError(false);
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
    setImgError(false);
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
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
    }
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getThumbnailSource = () => {
    if (editingId && !selectedFile) {
      return form.thumbnail_image || null;
    }
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
      } else {
        await adminInstagramAPI.createPost(formData);
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

  const confirmDelete = (id) => {
    setDeleteId(id);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await adminInstagramAPI.deletePost(deleteId);
      setDeleteId(null);
      await fetchPosts();
    } catch (err) {
      setError('Failed to delete Instagram post');
    }
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

      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-text-muted">
              <Camera size={40} className="mb-3 opacity-40" />
              <p className="text-sm">No Instagram posts yet</p>
              <button
                onClick={openAdd}
                className="mt-3 text-gold hover:text-gold-dark text-sm font-medium transition-colors"
              >
                Add your first post
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-[#FFFCF7]">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">
                    Thumbnail
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">
                    Post URL
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">
                    Order
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
                <AnimatePresence>
                  {posts.map((post, i) => (
                    <motion.tr
                      key={post.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ delay: i * 0.03 }}
                      className="hover:bg-[#FFFCF7]"
                    >
                      <td className="py-3 px-4">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-gold/10 to-amber-50 border border-white/50 flex items-center justify-center">
                          {post.thumbnail_image ? (
                            <img
                              src={post.thumbnail_image}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={() => setImgError(true)}
                            />
                          ) : (
                            <Camera size={18} className="text-text/20" />
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <a
                          href={post.post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-gold hover:text-gold-dark truncate max-w-[200px] block"
                        >
                          {post.post_url}
                        </a>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-sm text-text-muted">{post.display_order}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {post.is_active ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full">
                            <Eye size={12} />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            <EyeOff size={12} />
                            Hidden
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(post)}
                            className="p-2 text-text-muted hover:text-gold hover:bg-gold/5 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => confirmDelete(post.id)}
                            className="p-2 text-text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
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
            onClick={() => {
              if (!saving) {
                setShowModal(false);
                clearFile();
              }
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
                  onClick={() => {
                    if (!saving) {
                      setShowModal(false);
                      clearFile();
                    }
                  }}
                  className="p-1 text-text-muted hover:text-text rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto flex-1">
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
                        title="Remove file"
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
                    <p className="mt-1.5 text-xs text-text-muted flex items-center gap-1">
                      <File size={12} />
                      {selectedFile.name}
                    </p>
                  )}
                </div>

                {/* Preview */}
                {(filePreview || getThumbnailSource()) && (
                  <div>
                    <label className="block text-sm font-medium text-text mb-2">
                      Preview
                    </label>
                    <div className="relative w-full max-h-[180px] rounded-xl overflow-hidden bg-gradient-to-br from-gold/10 to-amber-50 border border-white/50">
                      <img
                        src={filePreview || getThumbnailSource()}
                        alt="Preview"
                        className="w-full h-full object-contain max-h-[180px]"
                      />
                    </div>
                  </div>
                )}

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
                  onClick={() => {
                    setShowModal(false);
                    clearFile();
                  }}
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
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
