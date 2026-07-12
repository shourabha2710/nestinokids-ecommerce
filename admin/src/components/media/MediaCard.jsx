import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ImageOff, Edit3, Trash2, Copy, Check } from 'lucide-react';
import { getMediaUrl } from '../../utils/mediaUrl';

export default function MediaCard({ media, index, imgErrors, setImgErrors, onEdit, onDelete, showToast }) {
  const [copied, setCopied] = useState(false);
  const mediaUrl = media.file_url || media.url || '';

  const handleCopyURL = async () => {
    try {
      await navigator.clipboard.writeText(getMediaUrl(media.file_url || media.url));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      if (showToast) showToast('URL copied!');
    } catch {
      if (showToast) showToast('Failed to copy URL', 'error');
    }
  };

  const sizeString = media.file_size
    ? media.file_size > 1024 * 1024
      ? `${(media.file_size / (1024 * 1024)).toFixed(1)} MB`
      : `${(media.file_size / 1024).toFixed(0)} KB`
    : '';

  const dateString = media.created_at
    ? new Date(media.created_at).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-gray-200 transition-all duration-200"
    >
      <div className="aspect-square bg-gray-50 relative">
        {mediaUrl && !imgErrors[media.id] ? (
          <img
            src={getMediaUrl(media.file_url || media.url)}
            alt={media.alt_text || media.filename}
            className="w-full h-full object-contain p-1"
            onError={() => setImgErrors((prev) => ({ ...prev, [media.id]: true }))}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <ImageOff className="w-8 h-8 text-gray-300" />
          </div>
        )}
      </div>
      <div className="px-3 py-2 space-y-1">
        <p className="text-xs font-medium text-gray-800 truncate" title={media.filename}>
          {media.filename}
        </p>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{sizeString}</span>
          <span>{dateString}</span>
        </div>
        {media.width && media.height && (
          <p className="text-[10px] text-gray-400">{media.width} x {media.height}</p>
        )}
      </div>
      <div className="px-3 py-2 border-t border-gray-100 flex items-center justify-end space-x-1">
        <button
          onClick={handleCopyURL}
          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
          title="Copy URL"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={() => onEdit(media)}
          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
          title="Edit"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(media)}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
