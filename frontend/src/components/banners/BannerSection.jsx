import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { productsAPI } from '../../api/endpoints';
import { getMediaUrl } from '../../utils/mediaUrl';

const BannerSection = () => {
  const nav = useNavigate();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [imgErrors, setImgErrors] = useState({});

  useEffect(() => {
    let active = true;
    productsAPI.getActiveBanners()
      .then((res) => {
        if (!active) return;
        const arr = Array.isArray(res.data) ? res.data : [];
        setBanners(arr);
      })
      .catch(() => {
        if (active) setBanners([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const id = setInterval(() => {
      setCurrent((p) => (p + 1) % banners.length);
    }, 6000);
    return () => clearInterval(id);
  }, [banners.length]);

  if (loading) return null;
  if (banners.length === 0) return null;

  const handlePrev = () => setCurrent((p) => (p - 1 + banners.length) % banners.length);
  const handleNext = () => setCurrent((p) => (p + 1) % banners.length);

  const handleClick = (banner) => {
    const link = banner.button_link;
    if (!link) {
      if (banner.target_category_id) {
        nav(`/products?category=${banner.target_category_id}`);
      }
      return;
    }
    if (/^https?:\/\//i.test(link)) {
      window.open(link, '_blank', 'noopener,noreferrer');
    } else if (/^mailto:|^tel:/i.test(link)) {
      window.location.href = link;
    } else {
      nav(link);
    }
  };

  const banner = banners[current];

  return (
    <section className="relative bg-[#FFFCF7]" aria-label="Promotional banners">
      <AnimatePresence mode="wait">
        <motion.div
          key={banner.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="relative w-full overflow-hidden cursor-pointer"
          onClick={() => handleClick(banner)}
        >
          <picture>
            {banner.mobile_image_url && !imgErrors[`m${banner.id}`] && (
              <source
                media="(max-width: 767px)"
                srcSet={getMediaUrl(banner.mobile_image_url)}
                onError={() => setImgErrors((prev) => ({ ...prev, [`m${banner.id}`]: true }))}
              />
            )}
            {banner.image_url && !imgErrors[`d${banner.id}`] ? (
              <img
                src={getMediaUrl(banner.image_url)}
                alt={banner.title || 'Promotional banner'}
                className="w-full object-cover aspect-[4/3] sm:aspect-[16/6] lg:aspect-[21/8] 2xl:max-h-[900px]"
                loading="eager"
                decoding="async"
                onError={() => setImgErrors((prev) => ({ ...prev, [`d${banner.id}`]: true }))}
              />
            ) : (
              <div className="w-full aspect-[4/3] sm:aspect-[16/6] lg:aspect-[21/8] 2xl:max-h-[900px] bg-gray-100 flex items-center justify-center">
                <span className="text-gray-400 text-sm">{banner.title || 'Banner'}</span>
              </div>
            )}
          </picture>

          {(banner.button_text || banner.description) && (
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent pointer-events-none" />
          )}

          <div className="absolute inset-0 flex items-center">
            <div className="px-6 sm:px-10 lg:px-12 2xl:px-16 pointer-events-none max-w-md lg:max-w-lg xl:max-w-xl">
              {banner.title && (
                <h3 className="font-display text-[clamp(1.375rem,3.5vw,2.25rem)] sm:text-[clamp(1.75rem,3vw,3rem)] lg:text-[clamp(2rem,2.6vw,3.75rem)] font-bold text-white drop-shadow-sm leading-tight">
                  {banner.title}
                </h3>
              )}
              {banner.description && (
                <p className="text-white/90 text-[clamp(0.75rem,2.2vw,0.875rem)] sm:text-sm lg:text-base xl:text-lg mt-2 drop-shadow-sm line-clamp-2">
                  {banner.description}
                </p>
              )}
              {banner.button_text && (
                <span className="inline-flex items-center gap-1.5 mt-4 px-4 sm:px-5 py-2 sm:py-2.5 lg:px-6 lg:py-3 bg-gold text-text text-xs sm:text-sm lg:text-base font-semibold rounded-lg shadow pointer-events-auto">
                  {banner.button_text}
                  <ArrowRight className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                </span>
              )}
            </div>
          </div>

          {banners.length > 1 && (
            <div className="absolute bottom-5 right-5 flex items-center gap-2.5 pointer-events-auto">
              <button
                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors shadow-lg"
                aria-label="Previous banner"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors shadow-lg"
                aria-label="Next banner"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
};

export default BannerSection;
