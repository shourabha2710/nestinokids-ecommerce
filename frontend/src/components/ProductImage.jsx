import React, { useState, useEffect } from 'react';

const DEFAULT_FALLBACK = '/images/placeholder-product.svg';

/**
 * @typedef {Object} ProductImageProps
 * @property {string} src - Image source URL
 * @property {string} alt - Descriptive alt text for accessibility
 * @property {'card'|'detail'|'thumbnail'|'cart'|'wishlist'} [variant='card'] - Styling preset that controls container and image classes
 * @property {string} [fallback] - Custom fallback image when the primary fails to load (defaults to placeholder-product.svg)
 * @property {'lazy'|'eager'} [loading] - Native lazy-loading behavior. Overridden to 'eager' when priority is true
 * @property {string} [sizes] - HTML sizes attribute for responsive image selection, e.g. "(max-width:768px) 50vw, 25vw"
 * @property {boolean} [priority=false] - When true, loads eagerly with high fetch priority; use for above-the-fold images
 * @property {string} [className] - Tailwind classes forwarded to the outer container div
 * @property {string} [imgClassName] - Tailwind classes forwarded to the inner img element
 * @property {Function} [onClick] - Click handler attached to the img element
 */

const variantStyles = {
  card:      { container: 'aspect-square bg-ivory', img: 'scale-[1.08]' },
  detail:    { container: 'aspect-square bg-ivory', img: 'scale-[1.08]' },
  thumbnail: { container: 'aspect-square',           img: '' },
  cart:      { container: 'aspect-square',           img: 'scale-[1.08]' },
  wishlist:  { container: 'aspect-square',           img: 'scale-[1.08]' },
};

const ProductImage = ({
  src,
  alt,
  variant = 'card',
  fallback,
  loading: loadingProp,
  sizes,
  priority = false,
  className = '',
  imgClassName = '',
  onClick,
  ...props
}) => {
  const [errored, setErrored] = useState(false);
  const styles = variantStyles[variant] || variantStyles.card;

  useEffect(() => {
    setErrored(false);
  }, [src]);

  const effectiveLoading = priority ? 'eager' : (loadingProp || 'lazy');
  const imgSrc = errored ? (fallback || DEFAULT_FALLBACK) : src;

  return (
    <div className={`overflow-hidden bg-white ${styles.container} ${className}`}>
      <img
        src={imgSrc}
        alt={alt}
        loading={effectiveLoading}
        fetchpriority={priority ? 'high' : undefined}
        decoding="async"
        draggable={false}
        sizes={sizes}
        className={`w-full h-full object-contain object-center ${styles.img} ${imgClassName}`}
        onClick={onClick}
        onError={() => setErrored(true)}
        {...props}
      />
    </div>
  );
};

export default ProductImage;
