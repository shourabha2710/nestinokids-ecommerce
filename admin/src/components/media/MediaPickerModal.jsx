import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mediaApi } from '../../services/mediaApi';
import { getMediaUrl } from '../../utils/mediaUrl';
import MediaFilters from './MediaFilters';
import MediaUpload from './MediaUpload';
import {
  X,
  Image,
  ImageOff,
  Check,
  Loader,
  Upload,
  AlertTriangle,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';

const LIMIT = 20;

const formatSize = (bytes) => {
  if (!bytes) return '';
  return bytes > 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${(bytes / 1024).toFixed(0)} KB`;
};

const MediaPickerModal = ({
  open,
  title = 'Choose from Media Library',
  onClose,
  onSelect,
  allowUpload = false,
}) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [folder, setFolder] = useState('');
  const [type, setType] = useState('');
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imgErrors, setImgErrors] = useState({});

  const fetchMedia = useCallback(async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setSkip(0);
      } else {
        setLoadingMore(true);
      }
      setError('');

      const params = { limit: LIMIT, skip: reset ? 0 : skip };
      if (search) params.search = search;
      if (folder) params.folder = folder;
      if (type) params.file_type = type;

      const res = await mediaApi.getMedia(params);
      const data = res.data || {};
      const fetched = Array.isArray(data.items) ? data.items : [];
      const normalized = fetched.map((item) => ({
        ...item,
        url: item.file_url || item.url || '',
      }));

      const newItems = reset ? normalized : [...items, ...normalized];
      setItems(newItems);
      setTotal(typeof data.total === 'number' ? data.total : newItems.length);
      setHasMore(
        typeof data.total === 'number'
          ? newItems.length < data.total
          : normalized.length === LIMIT
      );
      if (!reset) setSkip((prev) => prev + LIMIT);
    } catch (err) {
      setError('Failed to load media');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [skip, search, folder, type, items]);

  useEffect(() => {
    if (open) {
      setSelected(null);
      setUploadOpen(false);
      setImgErrors({});
      fetchMedia(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleUpload = async (file) => {
    setUploading(true);
    try {
      await mediaApi.uploadMedia(file, folder || undefined);
      setUploadOpen(false);
      fetchMedia(true);
    } catch (err) {
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const handleUse = () => {
    if (selected) {
      onSelect(selected);
    }
  };

  const renderGrid = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
              <div className="aspect-square bg-gray-50" />
              <div className="px-3 py-2">
                <div className="h-3 bg-gray-100 rounded w-3/4 mb-2" />
                <div className="h-2 bg-gray-50 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
          <Image className="w-12 h-12 mb-3 text-gray-200" />
          <p className="text-sm font-medium text-gray-500 mb-1">No media found</p>
          <p className="text-xs text-gray-400">
            {search || folder || type ? 'Try adjusting filters' : 'Upload images in the Media Library'}
          </p>
        </div>
      );
    }

    return (
      <>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((media) => {
            const isSelected = selected?.id === media.id;
            const mediaUrl = media.file_url || media.url || '';
            return (
              <button
                key={media.id}
                type="button"
                onClick={() => setSelected(media)}
                className={`text-left bg-white rounded-xl border overflow-hidden hover:shadow-lg transition-all duration-200 group ${
                  isSelected
                    ? 'border-gold ring-2 ring-gold/40'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="aspect-square bg-gray-50 relative">
                  {mediaUrl && !imgErrors[media.id] ? (
                    <img
                      src={getMediaUrl(mediaUrl)}
                      alt={media.alt_text || media.original_filename || media.filename}
                      className="w-full h-full object-contain p-1"
                      loading="lazy"
                      onError={() => setImgErrors((prev) => ({ ...prev, [media.id]: true }))}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <ImageOff className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gold text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
                <div className="px-3 py-2 space-y-1">
                  <p className="text-xs font-medium text-gray-800 truncate" title={media.original_filename || media.filename}>
                    {media.original_filename || media.filename}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-gray-400">
                    <span>{formatSize(media.file_size)}</span>
                    {media.width && media.height ? (
                      <span>{media.width} x {media.height}</span>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {hasMore && (
          <div className="flex justify-center mt-6">
            <button
              onClick={() => fetchMedia(false)}
              disabled={loadingMore}
              className="inline-flex items-center space-x-2 px-6 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all text-sm disabled:opacity-50"
            >
              {loadingMore ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              <span>{loadingMore ? 'Loading...' : 'Load More'}</span>
            </button>
          </div>
        )}
      </>
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-50 px-0 sm:px-4 py-0 sm:py-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-none sm:rounded-2xl shadow-xl w-full max-w-3xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 flex-shrink-0">
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-500 mt-0.5">Select an existing image</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                {allowUpload && !uploadOpen && (
                  <button
                    onClick={() => setUploadOpen(true)}
                    className="inline-flex items-center space-x-1.5 text-xs font-medium text-gray-700 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition-all"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload New</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
              {uploadOpen ? (
                <MediaUpload
                  onClose={() => setUploadOpen(false)}
                  onUploaded={handleUpload}
                  saving={uploading}
                />
              ) : (
                <>
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-xl mb-4 text-sm flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <MediaFilters
                    search={search}
                    setSearch={setSearch}
                    folder={folder}
                    setFolder={setFolder}
                    type={type}
                    setType={setType}
                  />

                  <div className="mt-4">{renderGrid()}</div>
                </>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <div className="min-w-0 flex-1">
                {selected ? (
                  <p className="text-xs text-gray-500 truncate flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                    <span className="truncate">
                      {selected.original_filename || selected.filename}
                    </span>
                  </p>
                ) : (
                  <p className="text-xs text-gray-400">
                    {typeof total === 'number' ? `${total} images available` : 'Select an image below'}
                  </p>
                )}
              </div>
              <div className="flex flex-col-reverse sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 flex-shrink-0">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all text-sm w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUse}
                  disabled={!selected}
                  className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all text-sm w-full sm:w-auto disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>Use Image</span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MediaPickerModal;
