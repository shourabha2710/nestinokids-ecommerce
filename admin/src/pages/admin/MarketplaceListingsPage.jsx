import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Filter, Edit3, Trash2, AlertTriangle, CheckCircle, Loader2, ToggleLeft, ToggleRight, Store, BarChart3 } from 'lucide-react';
import marketplaceService from '../../services/marketplaceService';
import { adminAPI } from '../../services/adminApi';
import { getErrorMessage } from '../../utils/errorUtils';
import { usePermissions } from '../../hooks/usePermissions';
import { Permissions } from '../../constants/permissions';

const MARKETPLACE_STYLES = {
  AMAZON: 'bg-amber-50 text-amber-700',
  FLIPKART: 'bg-blue-50 text-blue-700',
  MYNTRA: 'bg-pink-50 text-pink-700',
  FIRSTCRY: 'bg-rose-50 text-rose-700',
  MEESHO: 'bg-purple-50 text-purple-700',
};

const getMarketplaceBadge = (marketplace) => {
  const key = String(marketplace || '').toUpperCase();
  return {
    label: MARKETPLACE_STYLES[key] ? String(marketplace || '').toUpperCase() : (marketplace || '—'),
    className: MARKETPLACE_STYLES[key] || 'bg-gray-50 text-gray-600',
  };
};

const MarketplaceListingsPage = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();

  const [listings, setListings] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [deleteListing, setDeleteListing] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [marketplaceFilter, setMarketplaceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const productMap = useMemo(() => {
    const map = {};
    (Array.isArray(products) ? products : []).forEach((p) => { map[p.id] = p; });
    return map;
  }, [products]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchListings = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await marketplaceService.getListings({ limit: 200, include_inactive: true });
      setListings(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load marketplace listings'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  useEffect(() => {
    let active = true;
    adminAPI.getProducts({ limit: 200 })
      .then((res) => {
        if (active) setProducts(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (active) setProducts([]);
      });
    return () => { active = false; };
  }, []);

  const getVariantLabel = (listing) => {
    if (listing.variant_id == null) return 'Product Level';
    const product = productMap[listing.product_id];
    const variant = product?.variants?.find((v) => v.id === listing.variant_id);
    if (variant) {
      if (variant.size && variant.sku) return `${variant.size} — ${variant.sku}`;
      if (variant.size) return variant.size;
      if (variant.sku) return variant.sku;
    }
    return `Variant #${listing.variant_id}`;
  };

  const filtered = useMemo(() => {
    let result = [...listings];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((l) => {
        const productName = productMap[l.product_id]?.name?.toLowerCase() || '';
        return (
          productName.includes(q) ||
          String(l.external_product_id || '').toLowerCase().includes(q) ||
          String(l.display_label || '').toLowerCase().includes(q)
        );
      });
    }

    if (marketplaceFilter !== 'all') {
      result = result.filter((l) => String(l.marketplace || '').toUpperCase() === marketplaceFilter);
    }

    if (statusFilter === 'active') result = result.filter((l) => l.is_active);
    else if (statusFilter === 'inactive') result = result.filter((l) => !l.is_active);

    return result;
  }, [listings, searchQuery, marketplaceFilter, statusFilter, productMap]);

  const handleToggleStatus = async (listing) => {
    try {
      await marketplaceService.updateListing(listing.id, { is_active: !listing.is_active });
      showToast(`Listing ${listing.is_active ? 'deactivated' : 'activated'}`);
      await fetchListings();
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to update status'), 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteListing) return;
    try {
      setDeleting(true);
      await marketplaceService.deleteListing(deleteListing.id);
      setDeleteListing(null);
      showToast('Marketplace listing deleted');
      await fetchListings();
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to delete listing'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const isEmpty = !loading && listings.length === 0;
  const isFilteredEmpty = !loading && listings.length > 0 && filtered.length === 0;

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Marketplace Listings</h1>
            <p className="text-sm text-gray-500 mt-1">Manage external marketplace purchase links for your products.</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-50 rounded-xl mb-3 last:mb-0" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketplace Listings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage external marketplace purchase links for your products.</p>
        </div>
        {hasPermission(Permissions.MARKETPLACE_VIEW) && (
          <button
            onClick={() => navigate('/marketplace/analytics')}
            className="inline-flex items-center justify-center space-x-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-medium hover:border-gold hover:text-gold transition-all text-sm w-full sm:w-auto"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Click Analytics</span>
          </button>
        )}
        {hasPermission(Permissions.MARKETPLACE_MANAGE) && (
          <button
            onClick={() => navigate('/marketplace/new')}
            className="inline-flex items-center justify-center space-x-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-gray-800 transition-all text-sm w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Marketplace Listing</span>
          </button>
        )}
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`mb-4 p-3 rounded-xl flex items-center gap-2 text-sm ${
              toast.type === 'error' ? 'bg-red-50 border border-red-200 text-red-600' : 'bg-green-50 border border-green-200 text-green-600'
            }`}
          >
            {toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {!isEmpty && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by product, external ID or label..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <select
                  value={marketplaceFilter}
                  onChange={(e) => setMarketplaceFilter(e.target.value)}
                  className="appearance-none pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 transition-all"
                >
                  <option value="all">All Marketplaces</option>
                  <option value="AMAZON">AMAZON</option>
                  <option value="FLIPKART">FLIPKART</option>
                  <option value="MYNTRA">MYNTRA</option>
                  <option value="FIRSTCRY">FIRSTCRY</option>
                  <option value="MEESHO">MEESHO</option>
                </select>
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 transition-all"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {isFilteredEmpty ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Store className="w-12 h-12 mb-3 text-gray-200" />
              <p className="text-sm font-medium text-gray-500 mb-1">No listings match your filters</p>
              <p className="text-xs text-gray-400">Try a different search term or filter</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Product</th>
                    <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Variant</th>
                    <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Marketplace</th>
                    <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">External Product ID</th>
                    <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap hidden xl:table-cell">Display Label</th>
                    <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Priority</th>
                    <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Status</th>
                    <th className="text-right px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((listing, index) => {
                    const badge = getMarketplaceBadge(listing.marketplace);
                    const product = productMap[listing.product_id];
                    return (
                      <motion.tr
                        key={listing.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-900 truncate block max-w-[180px]">
                            {product?.name || `Product #${listing.product_id}`}
                          </span>
                          <span className="text-xs text-gray-400">ID: {listing.product_id}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600 whitespace-nowrap">{getVariantLabel(listing)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium whitespace-nowrap ${badge.className}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-gray-600">{listing.external_product_id}</span>
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell">
                          <span className="text-sm text-gray-600">{listing.display_label || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">{listing.priority ?? 0}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                            listing.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'
                          }`}>
                            {listing.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {hasPermission(Permissions.MARKETPLACE_MANAGE) && (
                              <>
                                {listing.is_active ? (
                                  <button
                                    onClick={() => handleToggleStatus(listing)}
                                    className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                    title="Deactivate"
                                  >
                                    <ToggleRight className="w-4 h-4 text-green-500" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleToggleStatus(listing)}
                                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                    title="Activate"
                                  >
                                    <ToggleLeft className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => navigate(`/marketplace/${listing.id}/edit`)}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteListing(listing)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {isEmpty && (
        <div className="bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center py-16 text-gray-400">
          <Store className="w-12 h-12 mb-3 text-gray-200" />
          <p className="text-sm font-medium text-gray-500 mb-1">No marketplace listings found</p>
          <p className="text-xs text-gray-400">Add a marketplace listing to get started</p>
          {hasPermission(Permissions.MARKETPLACE_MANAGE) && (
            <button
              onClick={() => navigate('/marketplace/new')}
              className="mt-4 inline-flex items-center space-x-1.5 text-sm font-medium text-gold hover:text-yellow-600 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Marketplace Listing</span>
            </button>
          )}
        </div>
      )}

      <AnimatePresence>
        {deleteListing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setDeleteListing(null)}
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
                <h3 className="text-lg font-semibold text-gray-900">Delete Marketplace Listing</h3>
              </div>
              <p className="text-sm text-gray-500 mb-2">
                Are you sure you want to delete the {String(deleteListing.marketplace || '').toUpperCase() || 'marketplace'} listing
                for <span className="font-semibold text-gray-900">{productMap[deleteListing.product_id]?.name || `product #${deleteListing.product_id}`}</span>?
              </p>
              <p className="text-sm text-gray-400 mb-6">This action cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteListing(null)}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
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

export default MarketplaceListingsPage;
