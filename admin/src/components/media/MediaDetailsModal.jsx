import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save } from 'lucide-react';
import { getMediaUrl } from '../../utils/mediaUrl';

export default function MediaDetailsModal({ media, onClose, onSave, isOpen }) {
  const [form, setForm] = useState({ alt_text: '', folder: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (media) {
      setForm({
        alt_text: media.alt_text || '',
        folder: media.folder || '',
      });
    }
  }, [media]);

  const handleSave = async () => {
    if (!media) return;
    setSaving(true);
    try {
      await onSave(media.id, form);
      onClose();
    } catch {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  };

  if (!media || !isOpen) return null;

  const mediaUrl = media.file_url || media.url || '';
  const sizeString = media.file_size
    ? media.file_size > 1024 * 1024
      ? `${(media.file_size / 1024 / 1024).toFixed(1)} MB`
      : `${(media.file_size / 1024).toFixed(0)} KB`
    : '';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 py-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg h-auto max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-gray-900 truncate">{media.filename}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-3 flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {mediaUrl && (
            <div className="aspect-square bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
              <img
                src={getMediaUrl(media.file_url || media.url)}
                alt={media.alt_text || media.filename}
                className="w-full h-full object-contain"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-2xl text-sm">
            <div>
              <p className="text-gray-400 text-xs">File name</p>
              <p className="font-medium text-gray-800 truncate">{media.filename}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">URL</p>
              {mediaUrl && (
                <p className="font-mono text-xs text-blue-600 truncate" title={getMediaUrl(media.file_url || media.url)}>
                  {getMediaUrl(media.file_url || media.url)}
                </p>
              )}
            </div>
            <div>
              <p className="text-gray-400 text-xs">Dimensions</p>
              <p className="font-medium text-gray-800">{media.width} x {media.height}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Size</p>
              <p className="font-medium text-gray-800">{sizeString}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alt Text</label>
              <input
                type="text"
                value={form.alt_text}
                onChange={(e) => setForm({ ...form, alt_text: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all"
                placeholder="Describe the image"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Folder</label>
              <input
                type="text"
                value={form.folder}
                onChange={(e) => setForm({ ...form, folder: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all"
                placeholder="e.g. products"
              />
            </div>
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 justify-end px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all text-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
