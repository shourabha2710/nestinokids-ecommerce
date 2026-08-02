import { useState } from 'react';
import { marketplaceAPI } from '../api/endpoints';

const CLICK_ERROR = 'Unable to open marketplace right now. Please try again.';
const POPUP_ERROR = 'Unable to open marketplace. Please allow pop-ups and try again.';

export const useMarketplaceRedirect = () => {
  const [loadingListingId, setLoadingListingId] = useState(null);
  const [redirectError, setRedirectError] = useState('');

  const clearRedirectError = () => setRedirectError('');

  const handleMarketplaceClick = async ({ listingId, productId, variantId, sourcePage }) => {
    if (loadingListingId !== null) return;
    setLoadingListingId(listingId);
    setRedirectError('');

    let newWindow = null;
    try {
      newWindow = window.open('', '_blank');
    } catch {
      newWindow = null;
    }

    try {
      const res = await marketplaceAPI.trackClick({
        marketplace_listing_id: listingId,
        product_id: productId,
        variant_id: variantId || null,
        source_page: sourcePage,
      });
      const redirectUrl = res.data?.redirect_url;

      if (!redirectUrl || typeof redirectUrl !== 'string') {
        if (newWindow) newWindow.close();
        setRedirectError(CLICK_ERROR);
        return;
      }

      if (newWindow) {
        newWindow.opener = null;
        newWindow.location = redirectUrl;
      } else {
        const fallback = window.open(redirectUrl, '_blank', 'noopener,noreferrer');
        if (!fallback) {
          setRedirectError(POPUP_ERROR);
        }
      }
    } catch {
      if (newWindow) newWindow.close();
      setRedirectError(CLICK_ERROR);
    } finally {
      setLoadingListingId(null);
    }
  };

  return {
    loadingListingId,
    redirectError,
    handleMarketplaceClick,
    clearRedirectError,
  };
};
