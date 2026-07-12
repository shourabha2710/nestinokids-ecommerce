import { useState, useEffect } from 'react';
import { settingsAPI } from '../api/endpoints';

const HARDCODED_DEFAULTS = {
  title: 'NestinoKids - Premium Kids Fashion',
  description: 'Shop premium kids clothing and accessories at NestinoKids. Soft, safe, and stylish outfits for newborns, toddlers, and growing kids.',
  keywords: 'kids fashion, children clothing, baby products, kids wear, NestinoKids',
  image: null,
  siteName: 'NestinoKids',
  siteUrl: 'https://www.nestinokids.com',
};

export const useSeo = (product = null, category = null) => {
  const [storeDefaults, setStoreDefaults] = useState(null);

  useEffect(() => {
    settingsAPI.getPublic()
      .then((res) => {
        setStoreDefaults(res.data);
      })
      .catch(() => {});
  }, []);

  const getSeo = () => {
    if (product) {
      return {
        title: product.meta_title || product.name,
        description: product.meta_description || product.description?.substring(0, 160) || HARDCODED_DEFAULTS.description,
        keywords: product.meta_keywords || HARDCODED_DEFAULTS.keywords,
        image: product.images?.[0]?.image_url || HARDCODED_DEFAULTS.image,
        type: 'product',
      };
    }

    if (category) {
      return {
        title: category.meta_title || category.name,
        description: category.meta_description || category.description?.substring(0, 160) || HARDCODED_DEFAULTS.description,
        keywords: category.meta_keywords || HARDCODED_DEFAULTS.keywords,
        image: HARDCODED_DEFAULTS.image,
        type: 'collection',
      };
    }

    if (storeDefaults) {
      return {
        title: storeDefaults.default_meta_title || HARDCODED_DEFAULTS.title,
        description: storeDefaults.default_meta_description || HARDCODED_DEFAULTS.description,
        keywords: storeDefaults.default_meta_keywords || HARDCODED_DEFAULTS.keywords,
        image: storeDefaults.default_og_image || HARDCODED_DEFAULTS.image,
        type: 'website',
      };
    }

    return {
      title: HARDCODED_DEFAULTS.title,
      description: HARDCODED_DEFAULTS.description,
      keywords: HARDCODED_DEFAULTS.keywords,
      image: HARDCODED_DEFAULTS.image,
      type: 'website',
    };
  };

  return getSeo();
};
