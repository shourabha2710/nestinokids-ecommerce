import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
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

const MarketplacePurchaseSection = ({ productId, variantId, variantRequired, variantSelected }) => {
  const [enabled, setEnabled] = useState(null);
  const [listings, setListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const { loadingListingId, redirectError, handleMarketplaceClick } = useMarketplaceRedirect();
  const requestIdRef = useRef(0);

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
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    const isEligible = enabled === true && !!productId && !(variantRequired && !variantSelected);

    if (!isEligible) {
      setListings([]);
      setLoadingListings(false);
      return;
    }

    setLoadingListings(true);
    marketplaceAPI.getListings(productId, {
      variant_id: variantId || undefined,
    })
      .then((res) => {
        if (requestId === requestIdRef.current) {
          setListings(Array.isArray(res.data) ? res.data : []);
        }
      })
      .catch(() => {
        if (requestId === requestIdRef.current) setListings([]);
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setLoadingListings(false);
      });

    return () => {
      requestIdRef.current += 1;
    };
  }, [enabled, productId, variantId, variantRequired, variantSelected]);

  const handleClick = (listing) => {
    handleMarketplaceClick({
      listingId: listing.id,
      productId,
      variantId,
      sourcePage: 'product_detail',
    });
  };

  if (enabled !== true) return null;

  if (variantRequired && !variantSelected) {
    return (
      <div className="mb-6">
        <p className="text-xs text-text-muted">
          Select a size to see marketplace options.
        </p>
      </div>
    );
  }

  if (loadingListings) {
    return (
      <div className="mb-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="h-12 flex-1 bg-gray-200 rounded-xl" />
          <div className="h-12 flex-1 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (listings.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-[0.15em]">
          OR BUY FROM
        </span>
        <span className="flex-1 h-px bg-gray-200" />
      </div>
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2.5">
        {listings.map((listing) => {
          const isPending = loadingListingId === listing.id;
          const marketplaceName = BRAND_NAMES[String(listing.marketplace).toUpperCase()]
            || listing.marketplace;
          const label = listing.display_label || `Buy on ${marketplaceName}`;
          return (
            <motion.button
              key={listing.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleClick(listing)}
              disabled={isPending}
              className="flex-1 h-12 px-5 rounded-xl border border-gray-200 bg-white text-text hover:border-gray-300 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <MarketplaceLogo marketplace={listing.marketplace} />
              <span className="text-sm font-semibold truncate">{label}</span>
              {isPending && <Loader2 className="w-4 h-4 animate-spin text-gold" />}
            </motion.button>
          );
        })}
      </div>
      <p className="text-[10px] text-text-muted mt-2.5">
        Secure checkout, payment and delivery are handled by the selected marketplace.
      </p>
      {redirectError && (
        <p className="text-xs text-red-500 mt-2">{redirectError}</p>
      )}
    </div>
  );
};

export default MarketplacePurchaseSection;
