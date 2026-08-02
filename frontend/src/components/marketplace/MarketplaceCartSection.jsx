import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { settingsAPI, marketplaceAPI } from '../../api/endpoints';
import { useMarketplaceRedirect } from '../../hooks/useMarketplaceRedirect';
import MarketplaceLogo from './MarketplaceLogo';

const BRAND_NAMES = {
  AMAZON: 'Amazon',
  FLIPKART: 'Flipkart',
  MYNTRA: 'Myntra',
  FIRSTCRY: 'FirstCry',
  MEESHO: 'Meesho',
};

const CHUNK_SIZE = 200;

const buildResolveItems = (cartItems) => {
  const seen = new Set();
  const out = [];
  for (const item of cartItems) {
    const productId = item.product_id || item.id;
    if (!productId) continue;
    const variantId = item.variant_id || null;
    const key = `${productId}_${variantId ?? 'null'}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ product_id: productId, variant_id: variantId });
  }
  return out;
};

const chunk = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

const dedupeById = (listings) => {
  const seen = new Set();
  return listings.filter((l) => {
    if (!l || l.id == null || seen.has(l.id)) return false;
    seen.add(l.id);
    return true;
  });
};

const MarketplaceCartSection = ({ items }) => {
  const [enabled, setEnabled] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const { loadingListingId, redirectError, handleMarketplaceClick } = useMarketplaceRedirect();

  useEffect(() => {
    let cancelled = false;
    settingsAPI.getPublic()
      .then((res) => {
        if (!cancelled) setEnabled(res.data?.marketplace_purchase_enabled === true);
      })
      .catch(() => {
        if (!cancelled) setEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (enabled !== true) {
      setResults([]);
      setLoading(false);
      return () => { cancelled = true; };
    }

    const requestItems = buildResolveItems(items);
    if (requestItems.length === 0) {
      setResults([]);
      setLoading(false);
      return () => { cancelled = true; };
    }

    setLoading(true);
    const chunks = chunk(requestItems, CHUNK_SIZE);
    Promise.all(chunks.map((c) => marketplaceAPI.resolve({ items: c }).then((res) => res.data)))
      .then((all) => {
        if (cancelled) return;
        const byKey = new Map();
        all.flat().forEach((entry) => {
          const key = `${entry.product_id}_${entry.variant_id ?? 'null'}`;
          byKey.set(key, Array.isArray(entry.listings) ? entry.listings : []);
        });
        const rows = [];
        const seenRows = new Set();
        for (const item of items) {
          const productId = item.product_id || item.id;
          if (!productId) continue;
          const key = `${productId}_${item.variant_id ?? 'null'}`;
          if (seenRows.has(key)) continue;
          seenRows.add(key);
          const listings = byKey.get(key) || [];
          if (listings.length === 0) continue;
          rows.push({ item, listings: dedupeById(listings) });
        }
        setResults(rows);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [enabled, items]);

  if (enabled !== true) return null;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 mt-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-40 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-64 mb-4" />
        <div className="h-10 bg-gray-200 rounded-xl mb-2" />
        <div className="h-10 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (results.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6 mt-6">
      <h2 className="text-lg font-bold text-text">Buy on Marketplaces</h2>
      <p className="text-sm text-text-muted mt-1 mb-4">
        Complete your purchase securely on your preferred marketplace.
      </p>
      <div className="space-y-4">
        {results.map(({ item, listings }) => {
          const productId = item.product_id || item.id;
          const variantId = item.variant_id || null;
          return (
            <div key={`${productId}_${variantId ?? 'null'}`} className="border-t border-gray-100 pt-4 first:border-t-0 first:pt-0">
              <p className="text-sm font-semibold text-text truncate">{item.name}</p>
              {item.variant_size && (
                <p className="text-xs text-text-muted">Size: {item.variant_size}</p>
              )}
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2.5 mt-2.5">
                {listings.map((listing) => {
                  const isPending = loadingListingId === listing.id;
                  const marketplaceName = BRAND_NAMES[String(listing.marketplace).toUpperCase()]
                    || listing.marketplace;
                  const label = listing.display_label || `Buy on ${marketplaceName}`;
                  return (
                    <button
                      key={listing.id}
                      onClick={() => handleMarketplaceClick({
                        listingId: listing.id,
                        productId,
                        variantId,
                        sourcePage: 'cart',
                      })}
                      disabled={isPending}
                      className="flex-1 h-10 px-4 rounded-xl border border-gray-200 bg-white text-text hover:border-gray-300 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      <MarketplaceLogo marketplace={listing.marketplace} />
                      <span className="text-sm font-semibold truncate">{label}</span>
                      {isPending && <Loader2 className="w-4 h-4 animate-spin text-gold" />}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {redirectError && (
        <p className="text-xs text-red-500 mt-3">{redirectError}</p>
      )}
    </div>
  );
};

export default MarketplaceCartSection;
