import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mediaApi } from '../../services/mediaApi';
import { usePermissions } from '../../hooks/usePermissions';
import { Permissions } from '../../constants/permissions';
import MediaUpload from '../../components/media/MediaUpload';
import MediaGrid from '../../components/media/MediaGrid';
import MediaFilters from '../../components/media/MediaFilters';
import MediaDetailsModal from '../../components/media/MediaDetailsModal';
import {
  Image,
  Plus,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  Loader,
} from 'lucide-react';

const LIMIT = 20;

const AdminMedia = () => {
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(Permissions.MEDIA_MANAGE);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const [search, setSearch] = useState('');
  const [folder, setFolder] = useState('');
  const [type, setType] = useState('');

  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [editingMedia, setEditingMedia] = useState(null);
  const [deleteMedia, setDeleteMedia] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [imgErrors, setImgErrors] = useState({});

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchMedia = useCallback(async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }
      setError('');

      const params = { limit: LIMIT, offset: reset ? 0 : offset };
      if (search) params.search = search;
      if (folder) params.folder = folder;
      if (type) params.type = type;

      const res = await mediaApi.getMedia(params);
      const data = res.data;
      console.log('MEDIA API RESPONSE:', res.data);

      const fetchedItems = Array.isArray(data.items) ? data.items : [];
      const normalizedItems = fetchedItems.map((item) => ({
        ...item,
        url: item.file_url || item.url || '',
      }));

      const newItems = reset ? normalizedItems : [...items, ...normalizedItems];
      setItems(newItems);
      setHasMore(data.has_more || normalizedItems.length === LIMIT);
      if (!reset) setOffset((prev) => prev + LIMIT);
    } catch (err) {
      setError('Failed to load media');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [offset, search, folder, type, items]);

  useEffect(() => {
    fetchMedia(true);
  }, [search, folder, type]);

  const handleUpload = async (file) => {
    setUploading(true);
    try {
      await mediaApi.uploadMedia(file, folder || undefined);
      showToast('File uploaded');
      setUploadOpen(false);
      fetchMedia(true);
    } catch (err) {
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async (id, data) => {
    await mediaApi.updateMedia(id, data);
    showToast('Media updated');
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...data } : item))
    );
  };

  const handleDelete = async () => {
    if (!deleteMedia) return;
    setDeleting(true);
    try {
      await mediaApi.deleteMedia(deleteMedia.id);
      showToast('Media deleted');
      setDeleteMedia(null);
      setItems((prev) => prev.filter((item) => item.id !== deleteMedia.id));
    } catch (err) {
      showToast('Failed to delete media', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Media Library</h1>
          <p className="text-sm text-gray-500 mt-1">Manage all uploaded media</p>
        </div>
        {canManage && (
          <button
            onClick={() => setUploadOpen(true)}
            className="inline-flex items-center justify-center space-x-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-gray-800 transition-all text-sm w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Upload</span>
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{error}</span>
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

      <MediaFilters
        search={search}
        setSearch={setSearch}
        folder={folder}
        setFolder={setFolder}
        type={type}
        setType={setType}
      />

      <div className="mt-6">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-50" />
                <div className="px-3 py-2">
                  <div className="h-3 bg-gray-100 rounded w-3/4 mb-2" />
                  <div className="h-2 bg-gray-50 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
            <Image className="w-12 h-12 mb-3 text-gray-200" />
            <p className="text-sm font-medium text-gray-500 mb-1">No media found</p>
            <p className="text-xs text-gray-400">
              {search || folder || type ? 'Try adjusting filters' : 'Upload your first image'}
            </p>
            {canManage && !search && !folder && !type && (
              <button
                onClick={() => setUploadOpen(true)}
                className="mt-4 inline-flex items-center space-x-1.5 text-sm font-medium text-gold hover:text-yellow-600 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload Media</span>
              </button>
            )}
          </div>
        ) : (
          <>
            <MediaGrid
              items={items}
              imgErrors={imgErrors}
              setImgErrors={setImgErrors}
              onEdit={canManage ? setEditingMedia : () => {}}
              onDelete={canManage ? setDeleteMedia : () => {}}
              showToast={showToast}
            />
            {hasMore && (
              <div className="flex justify-center mt-8">
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
        )}
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {uploadOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-50 px-0 sm:px-4 py-0 sm:py-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-none sm:rounded-2xl shadow-xl w-full max-w-lg h-full sm:h-auto sm:max-h-[90vh] flex flex-col"
            >
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <MediaUpload
                  onClose={() => setUploadOpen(false)}
                  onUploaded={handleUpload}
                  saving={uploading}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Details Modal */}
      <AnimatePresence>
        {editingMedia && (
          <MediaDetailsModal
            isOpen={!!editingMedia}
            media={editingMedia}
            onClose={() => setEditingMedia(null)}
            onSave={handleUpdate}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 py-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-auto max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Confirm Delete</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete <strong>{deleteMedia.filename}</strong>?
              </p>
              <div className="flex flex-col-reverse sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 justify-end">
                <button
                  onClick={() => setDeleteMedia(null)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all text-sm disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminMedia;
