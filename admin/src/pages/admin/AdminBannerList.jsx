import React, { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminAPI } from '../../services/adminApi';
import { getMediaUrl } from '../../utils/mediaUrl';
import { usePermissions } from '../../hooks/usePermissions';
import { Permissions } from '../../constants/permissions';
import MediaPickerModal from '../../components/media/MediaPickerModal';
import {
  Image,
  Plus,
  Edit3,
  Trash2,
  AlertTriangle,
  X,
  Save,
  Eye,
  EyeOff,
  Upload,
  Loader2,
  Link2,
  Trash,
  ImagePlus,
  ChevronDown,
  Search,
  Check,
} from 'lucide-react';

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXT = /\.(jpe?g|png|webp)$/i;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const emptyForm = {
  title: '',
  image_url: '',
  mobile_image_url: '',
  description: '',
  button_text: '',
  button_link: '',
  target_category_id: '',
  target_product_id: '',
  is_active: true,
  order: 0,
};

const AdminBannerList = () => {
  const { hasPermission } = usePermissions();
  const canViewMedia = hasPermission(Permissions.MEDIA_VIEW);
  const canManageMedia = hasPermission(Permissions.MEDIA_MANAGE);

  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [imgErrors, setImgErrors] = useState({});
  const [uploading, setUploading] = useState({ desktop: false, mobile: false });
  const [uploadError, setUploadError] = useState({ desktop: '', mobile: '' });
  const [pickerField, setPickerField] = useState(null);
  const desktopInputRef = useRef(null);
  const mobileInputRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [productOpen, setProductOpen] = useState(false);
  const [productLoading, setProductLoading] = useState(false);
  const productPickerRef = useRef(null);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getBanners();
      setBanners(res.data);
    } catch (err) {
      setError('Failed to load banners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  useEffect(() => {
    let active = true;
    setProductLoading(true);
    adminAPI.getProducts({ limit: 200 })
      .then((res) => {
        if (active) setProducts(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (active) setProducts([]);
      })
      .finally(() => {
        if (active) setProductLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const onDocClick = (e) => {
      if (productPickerRef.current && !productPickerRef.current.contains(e.target)) {
        setProductOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const selectedProduct = products.find((p) => Number(p.id) === Number(form.target_product_id));

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => ((p.name || '') + ' ' + String(p.id)).toLowerCase().includes(q));
  }, [products, productSearch]);

  const handleSelectProduct = (id) => {
    setForm((prev) => ({ ...prev, target_product_id: id === '' || id == null ? '' : String(id) }));
    setProductSearch('');
    setProductOpen(false);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setUploadError({ desktop: '', mobile: '' });
  };

  const openAdd = () => {
    setEditingId(null);
    resetForm();
    setError('');
    setShowModal(true);
  };

  const openEdit = (banner) => {
    setEditingId(banner.id);
    setForm({
      title: banner.title || '',
      image_url: banner.image_url,
      mobile_image_url: banner.mobile_image_url || '',
      description: banner.description || '',
      button_text: banner.button_text || '',
      button_link: banner.button_link || '',
      target_category_id: banner.target_category_id ?? '',
      target_product_id: banner.target_product_id ?? '',
      is_active: banner.is_active,
      order: banner.order,
    });
    setUploadError({ desktop: '', mobile: '' });
    setError('');
    setShowModal(true);
  };

  const validateFile = (file) => {
    if (!file) return 'No file selected';
    if (!ALLOWED_EXT.test(file.name)) {
      return 'Only JPG, JPEG, PNG or WebP images are allowed';
    }
    if (file.type && !ALLOWED_TYPES.includes(file.type)) {
      return 'Unsupported image type';
    }
    if (file.size > MAX_SIZE) {
      return 'Image must be 5 MB or smaller';
    }
    return '';
  };

  const handleUpload = async (field, file) => {
    if (!file) return;
    const validationError = validateFile(file);
    if (validationError) {
      setUploadError((prev) => ({ ...prev, [field]: validationError }));
      return;
    }

    setUploadError((prev) => ({ ...prev, [field]: '' }));
    setUploading((prev) => ({ ...prev, [field]: true }));
    try {
      const res = await adminAPI.uploadBannerImage(file);
      const url = res.data.url;
      setForm((prev) => ({ ...prev, [field]: url }));
    } catch (err) {
      setUploadError((prev) => ({ ...prev, [field]: err.response?.data?.detail || 'Image upload failed' }));
    } finally {
      setUploading((prev) => ({ ...prev, [field]: false }));
    }
  };

  const getSourceLabel = (url) => {
    if (!url) return '';
    if (url.startsWith('/uploads/banners/')) return 'Banner upload';
    if (url.startsWith('/uploads/media/')) return 'Media Library';
    return 'External URL';
  };

  const getFilename = (url) => {
    if (!url) return '';
    const clean = url.split(/[?#]/)[0];
    const parts = clean.split('/');
    return parts[parts.length - 1] || clean;
  };

  const handleSelectMedia = (media) => {
    const url = media.file_url || media.url || '';
    if (pickerField && url) {
      setForm((prev) => ({ ...prev, [pickerField]: url }));
    }
    setPickerField(null);
  };

  const handleSave = async () => {
    if (uploading.desktop || uploading.mobile) {
      setError('Please wait for the image upload to finish');
      return;
    }

    if (!form.image_url) {
      setError('Desktop image is required. Upload an image or provide an image URL.');
      return;
    }
    if (form.order !== '' && (Number.isNaN(Number(form.order)) || Number(form.order) < 0)) {
      setError('Order must be a number >= 0');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: form.title.trim(),
        image_url: form.image_url.trim(),
        mobile_image_url: form.mobile_image_url ? form.mobile_image_url.trim() : null,
        description: form.description || null,
        button_text: form.button_text || null,
        button_link: form.button_link || null,
        target_category_id: form.target_category_id === '' ? null : parseInt(form.target_category_id, 10),
        target_product_id: form.target_product_id === '' ? null : Number(form.target_product_id),
        is_active: form.is_active,
        order: parseInt(form.order, 10) || 0,
      };

      if (editingId) {
        await adminAPI.updateBanner(editingId, payload);
      } else {
        await adminAPI.createBanner(payload);
      }
      setShowModal(false);
      fetchBanners();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save banner');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await adminAPI.deleteBanner(id);
      setDeleteId(null);
      fetchBanners();
    } catch (err) {
      setError('Failed to delete banner');
    }
  };

  const toggleActive = async (banner) => {
    try {
      await adminAPI.updateBanner(banner.id, { is_active: !banner.is_active });
      fetchBanners();
    } catch (err) {
      setError('Failed to toggle banner status');
    }
  };

  const renderUploadField = ({ field, label, required, inputRef, accentClass = 'bg-gray-900' }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label} {required && '*'}
      </label>

      <div className="space-y-3">
        {/* A. Upload new / B. Media Library */}
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(field, file);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading[field]}
            className={`inline-flex items-center space-x-1.5 text-xs font-medium text-white px-3 py-2 rounded-lg transition-all disabled:opacity-50 ${accentClass} hover:opacity-90`}
          >
            {uploading[field] ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>{form[field] ? 'Replace Image' : 'Upload Image'}</span>
              </>
            )}
          </button>
          {canViewMedia && (
            <button
              type="button"
              onClick={() => setPickerField(field)}
              disabled={uploading[field]}
              className="inline-flex items-center space-x-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 px-3 py-2 rounded-lg transition-all disabled:opacity-50"
            >
              <ImagePlus className="w-3.5 h-3.5" />
              <span>Media Library</span>
            </button>
          )}
        </div>

        {/* C. Manual / external URL */}
        <div className="flex items-center gap-2">
          <Link2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={form[field]}
            onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all"
            placeholder="or paste an image URL"
          />
        </div>

        {uploadError[field] && (
          <p className="text-xs text-red-600 flex items-center space-x-1">
            <AlertTriangle className="w-3 h-3" />
            <span>{uploadError[field]}</span>
          </p>
        )}

        {/* Selected image: preview + source info + replace/clear */}
        {form[field] && (
          <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl p-3">
            <div className="relative w-24 h-16 rounded-lg overflow-hidden bg-white border border-gray-200 flex-shrink-0">
              <img
                src={getMediaUrl(form[field])}
                alt={`${label} preview`}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-800 truncate" title={getFilename(form[field])}>
                {getFilename(form[field])}
              </p>
              <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white border border-gray-200 text-gray-500">
                {getSourceLabel(form[field])}
              </span>
            </div>
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading[field]}
                className="inline-flex items-center justify-center space-x-1.5 text-xs font-medium text-white px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 bg-gray-900 hover:opacity-90"
              >
                {uploading[field] ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Upload className="w-3 h-3" />
                )}
                <span>Replace</span>
              </button>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, [field]: '' }))}
                disabled={uploading[field]}
                className="inline-flex items-center justify-center space-x-1.5 text-xs font-medium text-gray-500 hover:text-red-600 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                <Trash className="w-3 h-3" />
                <span>Clear</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Homepage Hero Banners</h1>
            <p className="text-sm text-gray-500 mt-1">Manage the homepage hero carousel banners</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
              <div className="h-40 bg-gray-50 rounded-xl mb-4" />
              <div className="h-4 bg-gray-100 rounded w-2/3 mb-2" />
              <div className="h-3 bg-gray-50 rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Banners</h1>
          <p className="text-sm text-gray-500 mt-1">Manage promotional banners</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center justify-center space-x-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-gray-800 transition-all text-sm w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Banner</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Banner cards */}
      {banners.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
          <Image className="w-12 h-12 mb-3 text-gray-200" />
          <p className="text-sm font-medium text-gray-500 mb-1">No banners found</p>
          <p className="text-xs text-gray-400">Create your first promotional banner</p>
          <button
            onClick={openAdd}
            className="mt-4 inline-flex items-center space-x-1.5 text-sm font-medium text-gold hover:text-yellow-600 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Banner</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {banners.map((banner, index) => (
            <motion.div
              key={banner.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-gray-200 transition-all duration-200"
            >
              {/* Preview image */}
              <div className="relative h-40 bg-gray-50">
                {banner.image_url && !imgErrors[banner.id] ? (
                  <img
                    src={getMediaUrl(banner.image_url)}
                    alt={banner.title}
                    className="w-full h-full object-cover"
                    onError={() => setImgErrors((prev) => ({ ...prev, [banner.id]: true }))}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Image className="w-8 h-8 text-gray-300" />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex space-x-1">
                  {banner.is_active ? (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-green-500 text-white">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-gray-500 text-white">
                      Inactive
                    </span>
                  )}
                </div>
                {banner.is_active && (
                  <div className="absolute bottom-2 left-2">
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-white/90 text-gray-700">
                      Order: {banner.order}
                    </span>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">{banner.title}</h3>
                {banner.description && (
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{banner.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleActive(banner)}
                      className={`p-1.5 rounded-lg transition-all text-xs ${
                        banner.is_active
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-gray-400 hover:bg-gray-50'
                      }`}
                      title={banner.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {banner.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => openEdit(banner)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteId(banner.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit banner modal */}
      <AnimatePresence>
        {showModal && (
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
              <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-6 border-b border-gray-100 flex-shrink-0">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-gray-900">
                    {editingId ? 'Edit Banner' : 'Add Banner'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {editingId ? 'Update banner details' : 'Create a new promotional banner'}
                  </p>
                </div>
                <button
                  onClick={() => { setShowModal(false); setError(''); }}
                  className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 ml-3"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-xl mb-4 text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all"
                      placeholder="Banner title (optional)"
                    />
                  </div>

                  {renderUploadField({
                    field: 'image_url',
                    label: 'Desktop / Primary Image',
                    required: true,
                    inputRef: desktopInputRef,
                  })}

                  {renderUploadField({
                    field: 'mobile_image_url',
                    label: 'Mobile Image',
                    required: false,
                    inputRef: mobileInputRef,
                    accentClass: 'bg-rose-500 hover:bg-rose-600',
                  })}

                  {/* Target Product (makes the entire banner clickable) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Product</label>
                    <div className="relative" ref={productPickerRef}>
                      <button
                        type="button"
                        onClick={() => setProductOpen((o) => !o)}
                        className="w-full flex items-center justify-between gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-left focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all"
                      >
                        <span className={selectedProduct ? 'text-gray-900 truncate' : 'text-gray-400 truncate'}>
                          {selectedProduct ? selectedProduct.name : 'Search & select a product'}
                        </span>
                        {productLoading ? (
                          <Loader2 className="w-4 h-4 text-gray-400 animate-spin flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                      </button>
                      {productOpen && (
                        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 flex flex-col overflow-hidden">
                          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
                            <Search className="w-3.5 h-3.5 text-gray-400" />
                            <input
                              autoFocus
                              type="text"
                              value={productSearch}
                              onChange={(e) => setProductSearch(e.target.value)}
                              placeholder="Search products..."
                              className="w-full text-sm bg-transparent focus:outline-none"
                            />
                          </div>
                          <div className="flex-1 overflow-y-auto">
                            {filteredProducts.length === 0 ? (
                              <p className="px-3 py-3 text-xs text-gray-400">No products found</p>
                            ) : (
                              filteredProducts.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => handleSelectProduct(p.id)}
                                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                                >
                                  <span className="text-gray-800 truncate">{p.name}</span>
                                  {Number(p.id) === Number(form.target_product_id) && (
                                    <Check className="w-4 h-4 text-gold flex-shrink-0" />
                                  )}
                                </button>
                              ))
                            )}
                          </div>
                          {form.target_product_id && (
                            <button
                              type="button"
                              onClick={() => handleSelectProduct('')}
                              className="w-full px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 border-t border-gray-100 transition-colors"
                            >
                              Clear product destination
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Selecting a Target Product makes the entire banner clickable to that product page.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={2}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all resize-y"
                      placeholder="Brief description of the banner"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Button Text</label>
                      <input
                        type="text"
                        value={form.button_text}
                        onChange={(e) => setForm({ ...form, button_text: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all"
                        placeholder="Button text (optional)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Button Link</label>
                      <input
                        type="text"
                        value={form.button_link}
                        onChange={(e) => setForm({ ...form, button_link: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all"
                        placeholder="Optional link (e.g. /products)"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Order</label>
                      <input
                        type="number"
                        min="0"
                        value={form.order}
                        onChange={(e) => setForm({ ...form, order: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all"
                      />
                      <p className="text-xs text-gray-400 mt-1">Lower order appears first</p>
                    </div>
                  </div>
                  <label className="flex items-center space-x-2.5 py-1">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-gold focus:ring-gold/40"
                    />
                    <span className="text-sm font-medium text-gray-700">Active</span>
                  </label>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 justify-end px-4 sm:px-6 py-4 border-t border-gray-100 flex-shrink-0">
                <button
                  onClick={() => { setShowModal(false); setError(''); }}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all text-sm w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || uploading.desktop || uploading.mobile || !form.image_url}
                  className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all text-sm w-full sm:w-auto disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{saving ? 'Saving...' : editingId ? 'Update' : 'Create'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteId && (
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
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-gray-900">Confirm Delete</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete this banner? It will be removed from the storefront.
              </p>
              <div className="flex flex-col-reverse sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 justify-end">
                <button
                  onClick={() => setDeleteId(null)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all text-sm w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteId)}
                  className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all text-sm w-full sm:w-auto"
                >
                  Delete Banner
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media Library picker */}
      <MediaPickerModal
        open={pickerField !== null}
        title={pickerField === 'image_url' ? 'Choose Desktop Image' : 'Choose Mobile Image'}
        onClose={() => setPickerField(null)}
        onSelect={handleSelectMedia}
        allowUpload={canManageMedia}
      />
    </div>
  );
};

export default AdminBannerList;
