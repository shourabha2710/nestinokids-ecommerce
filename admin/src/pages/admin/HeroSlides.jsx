import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { adminAPI } from '../../services/adminApi';
import {
  Plus, Edit3, Trash2, AlertTriangle, X, Save, Upload,
  Eye, EyeOff, GripVertical, CheckCircle, Loader2,
  Image, Video, Play,
} from 'lucide-react';

const emptyForm = {
  title: '',
  subtitle: '',
  description: '',
  media_type: 'image',
  media_url: '',
  mobile_media_url: '',
  primary_button_text: '',
  primary_button_link: '',
  secondary_button_text: '',
  secondary_button_link: '',
  badge_text: '',
  display_order: 0,
  is_active: true,
};

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const SortableRow = ({ slide, onEdit, onDelete, onToggle, togglingId }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide.id });
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
        <div className="w-14 h-10 rounded-lg overflow-hidden bg-gradient-to-br from-gold/10 to-amber-50 border border-white/50 flex items-center justify-center">
          {slide.media_type === 'video' ? (
            <div className="relative w-full h-full flex items-center justify-center bg-gray-900">
              <Video size={16} className="text-white/60" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                  <Play size={10} className="text-white ml-0.5" />
                </div>
              </div>
            </div>
          ) : slide.media_url ? (
            <img
              src={slide.media_url}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <Image size={16} className="text-text/20" />
          )}
        </div>
      </td>
      <td className="py-3 px-4 max-w-[180px]">
        <p className="text-sm font-medium text-text truncate">{slide.title || 'Untitled'}</p>
        {slide.badge_text && (
          <span className="text-[10px] font-semibold text-gold uppercase tracking-wider">{slide.badge_text}</span>
        )}
      </td>
      <td className="py-3 px-4">
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
          slide.media_type === 'video'
            ? 'bg-purple-50 text-purple-700'
            : 'bg-blue-50 text-blue-700'
        }`}>
          {slide.media_type === 'video' ? <Video size={10} /> : <Image size={10} />}
          {slide.media_type}
        </span>
      </td>
      <td className="py-3 px-4 text-center">
        <div className="flex items-center justify-center gap-1.5 text-sm text-text-muted">
          <Eye size={14} />
          {slide.view_count ?? 0}
        </div>
      </td>
      <td className="py-3 px-4 text-center">
        <button
          onClick={() => onToggle(slide.id, !slide.is_active)}
          disabled={togglingId === slide.id}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gold/30 ${
            slide.is_active ? 'bg-green-500' : 'bg-gray-300'
          } ${togglingId === slide.id ? 'opacity-60' : ''}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
              slide.is_active ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </td>
      <td className="py-3 px-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => onEdit(slide)}
            className="p-2 text-text-muted hover:text-gold hover:bg-gold/5 rounded-lg transition-colors"
            title="Edit"
          >
            <Edit3 size={16} />
          </button>
          <button
            onClick={() => onDelete(slide.id)}
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

const HeroSlides = () => {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mobileMediaFile, setMobileMediaFile] = useState(null);
  const [mobileMediaPreview, setMobileMediaPreview] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewSlide, setPreviewSlide] = useState(null);
  const mediaFileRef = useRef(null);
  const mobileMediaRef = useRef(null);
  const toastTimeout = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const showToast = useCallback((message, type = 'success') => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast({ message, type });
    toastTimeout.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchSlides = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getSlides();
      setSlides(res.data);
    } catch {
      setError('Failed to load hero slides');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlides();
    return () => { if (toastTimeout.current) clearTimeout(toastTimeout.current); };
  }, [fetchSlides]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setMediaFile(null);
    setMediaPreview(null);
    setMobileMediaFile(null);
    setMobileMediaPreview(null);
    setError('');
    setShowModal(true);
  };

  const openEdit = (slide) => {
    setEditingId(slide.id);
    setForm({
      title: slide.title || '',
      subtitle: slide.subtitle || '',
      description: slide.description || '',
      media_type: slide.media_type || 'image',
      media_url: slide.media_url || '',
      mobile_media_url: slide.mobile_media_url || '',
      primary_button_text: slide.primary_button_text || '',
      primary_button_link: slide.primary_button_link || '',
      secondary_button_text: slide.secondary_button_text || '',
      secondary_button_link: slide.secondary_button_link || '',
      badge_text: slide.badge_text || '',
      display_order: slide.display_order,
      is_active: slide.is_active,
    });
    setMediaFile(null);
    setMediaPreview(null);
    setMobileMediaFile(null);
    setMobileMediaPreview(null);
    setError('');
    setShowModal(true);
  };

  const handleMediaSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Invalid file type. Allowed: jpg, jpeg, png, webp, mp4, webm');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('File too large. Maximum size is 10MB');
      return;
    }
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
    setForm({ ...form, media_type: file.type.startsWith('video/') ? 'video' : 'image' });
    setError('');
  };

  const clearMedia = () => {
    setMediaFile(null);
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaPreview(null);
    if (mediaFileRef.current) mediaFileRef.current.value = '';
  };

  const handleMobileMediaSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type) && !ALLOWED_VIDEO_TYPES.includes(file.type)) {
      setError('Invalid file type. Allowed: jpg, jpeg, png, webp, mp4, webm');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('File too large. Maximum size is 10MB');
      return;
    }
    setMobileMediaFile(file);
    setMobileMediaPreview(URL.createObjectURL(file));
    setError('');
  };

  const clearMobileMedia = () => {
    setMobileMediaFile(null);
    if (mobileMediaPreview) URL.revokeObjectURL(mobileMediaPreview);
    setMobileMediaPreview(null);
    if (mobileMediaRef.current) mobileMediaRef.current.value = '';
  };

  const handleSave = async () => {
    if (!form.media_url.trim() && !mediaFile) {
      setError('Either a media URL or file upload is required');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== null && v !== undefined) fd.append(k, String(v));
      });
      if (mediaFile) fd.append('media_file', mediaFile);
      if (mobileMediaFile) fd.append('mobile_media_file', mobileMediaFile);

      if (editingId) {
        await adminAPI.updateSlide(editingId, fd);
        showToast('Hero slide updated successfully');
      } else {
        await adminAPI.createSlide(fd);
        showToast('Hero slide created successfully');
      }

      setShowModal(false);
      clearMedia();
      clearMobileMedia();
      await fetchSlides();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(Array.isArray(detail) ? detail.map((e) => e.msg).join(', ') : (detail || 'Failed to save hero slide'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id, isActive) => {
    setTogglingId(id);
    setSlides((prev) => prev.map((s) => (s.id === id ? { ...s, is_active: isActive } : s)));
    try {
      const fd = new FormData();
      fd.append('is_active', String(isActive));
      await adminAPI.updateSlide(id, fd);
      showToast(isActive ? 'Slide activated' : 'Slide deactivated');
    } catch {
      setSlides((prev) => prev.map((s) => (s.id === id ? { ...s, is_active: !isActive } : s)));
      showToast('Failed to toggle status', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = slides.findIndex((s) => s.id === active.id);
    const newIndex = slides.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(slides, oldIndex, newIndex);
    const updated = reordered.map((s, i) => ({ ...s, display_order: i + 1 }));
    setSlides(updated);

    try {
      await adminAPI.reorderSlides(updated.map((s) => ({ id: s.id, display_order: s.display_order })));
    } catch {
      showToast('Failed to save order', 'error');
      await fetchSlides();
    }
  };

  const confirmDelete = (id) => setDeleteId(id);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await adminAPI.deleteSlide(deleteId);
      setDeleteId(null);
      showToast('Hero slide deleted');
      await fetchSlides();
    } catch {
      showToast('Failed to delete hero slide', 'error');
    }
  };

  const openPreview = (slide) => {
    setPreviewSlide(slide);
    setShowPreview(true);
  };

  const getMediaSrc = () => {
    if (mediaPreview) return mediaPreview;
    if (editingId && form.media_url) return form.media_url;
    return null;
  };

  const getMobileMediaSrc = () => {
    if (mobileMediaPreview) return mobileMediaPreview;
    if (editingId && form.mobile_media_url) return form.mobile_media_url;
    return null;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Hero Slides</h1>
          <p className="text-text-muted text-sm mt-1">Manage homepage hero carousel slides</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-gold text-white rounded-lg hover:bg-gold-dark transition-colors"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Add Slide</span>
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
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : slides.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-text-muted">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold/10 to-amber-50 flex items-center justify-center mb-4">
              <Image size={32} className="text-gold/40" />
            </div>
            <p className="text-lg font-semibold text-text mb-1">No hero slides yet</p>
            <p className="text-sm mb-6">Create your first homepage hero slide</p>
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-white rounded-lg hover:bg-gold-dark text-sm font-medium transition-colors">
              <Plus size={16} />
              Add Slide
            </button>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-[#FFFCF7]">
                  <th className="py-3 px-2 w-10" />
                  <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Media</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Title</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Type</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Views</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <SortableContext items={slides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                  <AnimatePresence>
                    {slides.map((slide) => (
                      <SortableRow key={slide.id} slide={slide} onEdit={openEdit} onDelete={confirmDelete} onToggle={toggleActive} togglingId={togglingId} />
                    ))}
                  </AnimatePresence>
                </SortableContext>
              </tbody>
            </table>
          </DndContext>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => { if (!saving) { setShowModal(false); clearMedia(); clearMobileMedia(); } }}
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
                  {editingId ? 'Edit Hero Slide' : 'Add Hero Slide'}
                </h2>
                <button onClick={() => { if (!saving) { setShowModal(false); clearMedia(); clearMobileMedia(); } }} className="p-1 text-text-muted hover:text-text rounded-lg hover:bg-gray-100 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* Media Preview */}
                <div className="flex justify-center gap-4">
                  <div className="relative w-52 aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-gold/10 to-amber-50 border border-white/50 flex items-center justify-center">
                    {getMediaSrc() ? (
                      form.media_type === 'video' ? (
                        <video src={getMediaSrc()} className="w-full h-full object-cover" muted loop />
                      ) : (
                        <img src={getMediaSrc()} alt="" className="w-full h-full object-cover" />
                      )
                    ) : (
                      <div className="text-center">
                        <Image className="w-8 h-8 text-text/20 mx-auto mb-1" />
                        <p className="text-xs text-text-muted">Media preview</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-text mb-1.5">
                      Media Upload <span className="text-text-muted font-normal">(Image or Video)</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => mediaFileRef.current?.click()} className="flex items-center gap-2 px-4 py-2 border border-dashed border-border rounded-lg text-sm text-text-muted hover:text-gold hover:border-gold transition-colors">
                        <Upload size={16} />
                        {mediaFile ? 'Change File' : 'Choose File'}
                      </button>
                      {mediaFile && (
                        <button type="button" onClick={clearMedia} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><X size={16} /></button>
                      )}
                      <input ref={mediaFileRef} type="file" accept=".jpg,.jpeg,.png,.webp,.mp4,.webm" onChange={handleMediaSelect} className="hidden" />
                    </div>
                    {mediaFile && <p className="mt-1.5 text-xs text-text-muted truncate"><Upload size={12} className="inline mr-1" />{mediaFile.name}</p>}
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-text mb-1.5">
                      Media URL <span className="text-text-muted font-normal">(or use upload above)</span>
                    </label>
                    <input
                      type="url"
                      value={form.media_url}
                      onChange={(e) => setForm({ ...form, media_url: e.target.value })}
                      placeholder="https://example.com/hero-image.jpg"
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
                    />
                  </div>
                </div>

                {/* Mobile media */}
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">
                    Mobile Media <span className="text-text-muted font-normal">(Optional)</span>
                  </label>
                  <div className="flex items-center gap-3 mb-2">
                    <button type="button" onClick={() => mobileMediaRef.current?.click()} className="flex items-center gap-2 px-4 py-2 border border-dashed border-border rounded-lg text-sm text-text-muted hover:text-gold hover:border-gold transition-colors">
                      <Upload size={16} />
                      {mobileMediaFile ? 'Change File' : 'Upload Mobile'}
                    </button>
                    {mobileMediaFile && (
                      <button type="button" onClick={clearMobileMedia} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><X size={16} /></button>
                    )}
                    <input ref={mobileMediaRef} type="file" accept=".jpg,.jpeg,.png,.webp,.mp4,.webm" onChange={handleMobileMediaSelect} className="hidden" />
                  </div>
                  <input
                    type="url"
                    value={form.mobile_media_url}
                    onChange={(e) => setForm({ ...form, mobile_media_url: e.target.value })}
                    placeholder="https://example.com/mobile-hero.jpg"
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-text mb-1.5">Badge Text</label>
                    <input
                      type="text"
                      value={form.badge_text}
                      onChange={(e) => setForm({ ...form, badge_text: e.target.value })}
                      placeholder="e.g. New Collection"
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-text mb-1.5">Title</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="e.g. Softness You Can Trust"
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-text mb-1.5">Subtitle</label>
                    <input
                      type="text"
                      value={form.subtitle}
                      onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                      placeholder="e.g. Premium Kids Apparel"
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-text mb-1.5">Description</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Premium clothing crafted for newborns, toddlers and growing kids."
                      rows={2}
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold resize-y"
                    />
                  </div>
                </div>

                <div className="border-t border-border pt-5">
                  <h3 className="text-sm font-semibold text-text mb-4">Call-to-Action Buttons</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text mb-1.5">Primary Button Text</label>
                      <input type="text" value={form.primary_button_text} onChange={(e) => setForm({ ...form, primary_button_text: e.target.value })} placeholder="Shop Now" className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text mb-1.5">Primary Button Link</label>
                      <input type="text" value={form.primary_button_link} onChange={(e) => setForm({ ...form, primary_button_link: e.target.value })} placeholder="/products" className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text mb-1.5">Secondary Button Text</label>
                      <input type="text" value={form.secondary_button_text} onChange={(e) => setForm({ ...form, secondary_button_text: e.target.value })} placeholder="Explore Collection" className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text mb-1.5">Secondary Button Link</label>
                      <input type="text" value={form.secondary_button_link} onChange={(e) => setForm({ ...form, secondary_button_link: e.target.value })} placeholder="/products" className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text mb-1.5">Display Order</label>
                    <input type="number" min="0" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold" />
                  </div>
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 text-gold focus:ring-gold/30 border-border rounded" />
                  <span className="text-sm font-medium text-text">Active</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-[#FFFCF7] shrink-0">
                <button onClick={() => { setShowModal(false); clearMedia(); clearMobileMedia(); }} disabled={saving} className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text transition-colors disabled:opacity-50">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-gold text-white rounded-lg hover:bg-gold-dark text-sm font-medium transition-colors disabled:opacity-50">
                  {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> {editingId ? 'Update' : 'Create'}</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDeleteId(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-50 rounded-full"><AlertTriangle size={20} className="text-red-600" /></div>
                <h3 className="text-lg font-semibold text-text">Delete Hero Slide</h3>
              </div>
              <p className="text-sm text-text-muted mb-6">Are you sure you want to delete this slide? This action cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text transition-colors">Cancel</button>
                <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HeroSlides;
