import React from 'react';
import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'NestinoKids';
const SITE_URL = 'https://www.nestinokids.com';
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/og-default.jpg`;

const Seo = ({
  title,
  description,
  keywords,
  image,
  canonical,
  type = 'website',
  noindex = false,
}) => {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} - Premium Kids Fashion`;
  const metaDescription = description || 'Shop premium kids clothing and accessories at NestinoKids. Soft, safe, and stylish outfits for newborns, toddlers, and growing kids.';
  const metaKeywords = keywords || 'kids fashion, children clothing, baby products, kids wear, NestinoKids';
  const ogImage = image || DEFAULT_OG_IMAGE;
  const canonicalUrl = canonical || SITE_URL;

  const jsonLd = type === 'product' ? null : type === 'collection' ? null : {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/images/logo.png`,
    description: metaDescription,
  };

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta name="keywords" content={metaKeywords} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:type" content={type === 'product' ? 'product' : 'website'} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content={SITE_NAME} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={ogImage} />

      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
};

export default Seo;
