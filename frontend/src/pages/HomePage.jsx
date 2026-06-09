import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { productsAPI, instagramAPI, settingsAPI, customerReviewsAPI, heroAPI } from '../api/endpoints';
import ProductCard from '../components/ProductCard';
import RecentlyViewedCarousel from '../components/RecentlyViewedCarousel';
import RecommendedSection from '../components/RecommendedSection';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ChevronRight,
  Star,
  Heart,
  Shield,
  Truck,
  Sparkles,
  Leaf,
  CheckCircle,
  Camera,
  ChevronLeft,
  Play,
  ShieldCheck,
  Banknote,
  RotateCcw,
} from 'lucide-react';

/* ─── Animations ─── */
const container = {
  animate: { transition: { staggerChildren: 0.07 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.6 } },
};

/* ─── Floating Decorations ─── */
const FloatIcon = ({ icon: Icon, className }) => (
  <motion.div
    animate={{ y: [0, -8, 0] }}
    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    className={`absolute opacity-10 text-gold ${className}`}
  >
    <Icon className="w-16 h-16 md:w-24 md:h-24" />
  </motion.div>
);

/* ─── Section Header ─── */
const SectionHeader = ({ title, subtitle, linkTo, linkLabel }) => {
  const nav = useNavigate();
  const handleClick = () => {
    if (linkTo?.startsWith('http')) {
      window.open(linkTo, '_blank', 'noopener,noreferrer');
    } else {
      nav(linkTo);
    }
  };
  return (
    <motion.div
      variants={fadeUp}
      className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-10 lg:mb-12"
    >
      <div>
        <h2 className="font-display text-3xl lg:text-4xl font-bold text-text">{title}</h2>
        {subtitle && <p className="text-text-muted text-sm mt-1.5">{subtitle}</p>}
      </div>
      {linkTo && (
        <button
          onClick={handleClick}
          className="flex items-center gap-1.5 text-sm font-semibold text-gold hover:text-gold-dark transition-colors group"
        >
          {linkLabel || 'View All'}
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}
    </motion.div>
  );
};

/* ─── HERO V3 ─── */
const HeroSection = () => {
  const nav = useNavigate();
  const [slides, setSlides] = useState([]);
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);
  const touchStartX = useRef(null);

  useEffect(() => {
    heroAPI.getSlides()
      .then((res) => {
        let arr = res.data;
        if (!Array.isArray(arr) && arr?.slides) arr = arr.slides;
        if (!Array.isArray(arr)) arr = [];
        setSlides(arr);
      })
      .catch(() => setSlides([]))
      .finally(() => setLoading(false));
  }, []);

  // Auto-rotate
  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    intervalRef.current = setInterval(() => {
      setCurrent((p) => (p + 1) % slides.length);
    }, 5000);
    return () => clearInterval(intervalRef.current);
  }, [slides.length, isPaused]);

  // Track view on slide change
  useEffect(() => {
    if (slides[current]?.id) {
      heroAPI.trackView(slides[current].id).catch(() => {});
    }
  }, [current, slides]);

  const handlePrev = () => setCurrent((p) => (p - 1 + slides.length) % slides.length);
  const handleNext = () => setCurrent((p) => (p + 1) % slides.length);

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) handlePrev();
      else handleNext();
    }
    touchStartX.current = null;
  };

  const handleCtaClick = (slideId, url) => {
    heroAPI.trackClick(slideId).catch(() => {});
    if (url?.startsWith('http')) window.open(url, '_blank', 'noopener,noreferrer');
    else nav(url || '/products');
  };

  if (loading) {
    return (
      <section className="relative overflow-hidden bg-gradient-hero min-h-[80vh] lg:min-h-[85vh] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </section>
    );
  }

  if (slides.length === 0) {
    return (
      <section className="relative overflow-hidden bg-gradient-hero min-h-[80vh] lg:min-h-[85vh] flex items-center">
        <FloatIcon icon={Star} className="top-12 left-[8%]" />
        <FloatIcon icon={Heart} className="top-1/3 right-[10%]" />
        <FloatIcon icon={Sparkles} className="bottom-20 left-[15%]" />
        <FloatIcon icon={Star} className="bottom-1/4 right-[5%]" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blush/30 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <span className="inline-block text-xs font-semibold text-gold uppercase tracking-[0.2em] mb-4">
                Premium Kids Apparel
              </span>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-text leading-[1.1] mb-5">
                Softness You Can Trust
              </h1>
              <p className="text-text-muted text-lg md:text-xl leading-relaxed mb-8 max-w-lg">
                Premium clothing crafted for newborns, toddlers and growing kids.
              </p>
              <div className="flex flex-wrap gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => nav('/products')}
                  className="h-12 px-8 bg-gold text-white rounded-xl font-semibold text-sm shadow-premium hover:bg-gold-dark transition-colors flex items-center gap-2"
                >
                  Shop Now
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => nav('/products')}
                  className="h-12 px-8 border-2 border-gray-200 text-text rounded-xl font-semibold text-sm hover:border-gold hover:text-gold transition-colors"
                >
                  Explore Collection
                </motion.button>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-gold/10 to-blush/30 flex items-center justify-center">
                <img src="/images/logo.png" alt="NestinoKids" className="object-contain w-2/3 opacity-20" />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const slide = slides[current];
  const progress = ((current + 1) / slides.length) * 100;

  return (
    <section
      className="relative overflow-hidden bg-gradient-hero min-h-[80vh] lg:min-h-[85vh] flex items-center"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Floating decoratives */}
      <FloatIcon icon={Star} className="top-12 left-[8%]" />
      <FloatIcon icon={Heart} className="top-1/3 right-[10%]" />
      <FloatIcon icon={Sparkles} className="bottom-20 left-[15%]" />
      <FloatIcon icon={Star} className="bottom-1/4 right-[5%]" />

      {/* Background orbs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blush/30 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center"
          >
            {/* Text */}
            <div>
              {slide.badge_text && (
                <motion.span
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                  className="inline-block text-xs font-semibold text-gold uppercase tracking-[0.2em] mb-4 bg-gold/5 px-3 py-1.5 rounded-full"
                >
                  {slide.badge_text}
                </motion.span>
              )}
              {slide.title && (
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-text leading-[1.1] mb-4"
                >
                  {slide.title}
                </motion.h1>
              )}
              {slide.subtitle && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-gold/80 text-base md:text-lg font-medium mb-2"
                >
                  {slide.subtitle}
                </motion.p>
              )}
              {slide.description && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="text-text-muted text-lg md:text-xl leading-relaxed mb-8 max-w-lg"
                >
                  {slide.description}
                </motion.p>
              )}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-wrap gap-4"
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCtaClick(slide.id, slide.primary_button_link)}
                  className="h-12 px-8 bg-gold text-white rounded-xl font-semibold text-sm shadow-premium hover:bg-gold-dark transition-colors flex items-center gap-2"
                >
                  {slide.primary_button_text || 'Shop Now'}
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
                {(slide.secondary_button_text || slide.secondary_button_link) && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleCtaClick(slide.id, slide.secondary_button_link)}
                    className="h-12 px-8 border-2 border-gray-200 text-text rounded-xl font-semibold text-sm hover:border-gold hover:text-gold transition-colors"
                  >
                    {slide.secondary_button_text || 'Explore'}
                  </motion.button>
                )}
              </motion.div>
            </div>

            {/* Media */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative"
            >
              <div className="aspect-[4/3] lg:aspect-square rounded-2xl overflow-hidden shadow-premium-lg bg-gradient-to-br from-gold/10 to-amber-50">
                {slide.media_type === 'video' ? (
                  <video
                    src={slide.mobile_media_url || slide.media_url}
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload={current === 0 ? 'auto' : 'metadata'}
                  />
                ) : (
                  <img
                    src={slide.mobile_media_url || slide.media_url}
                    alt={slide.title || ''}
                    className="w-full h-full object-cover"
                    loading={current === 0 ? 'eager' : 'lazy'}
                    fetchpriority={current === 0 ? 'high' : 'auto'}
                  />
                )}
                {/* Gradient overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
              </div>
              <div className="absolute -top-3 -right-3 w-full h-full border-2 border-gold/20 rounded-2xl -z-10" />
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Controls & Progress */}
        {slides.length > 1 && (
          <div className="mt-8 lg:mt-10">
            {/* Progress bar */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  key={current}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: slides.length > 1 ? 0.5 : 0 }}
                  className="h-full bg-gold rounded-full"
                />
              </div>
              <span className="text-xs font-medium text-text-muted tabular-nums">
                {String(current + 1).padStart(2, '0')}/{String(slides.length).padStart(2, '0')}
              </span>
            </div>
            {/* Dots */}
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={handlePrev}
                className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:border-gold hover:text-gold transition-colors"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex gap-2 mx-2">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === current ? 'bg-gold w-8' : 'bg-gray-300 w-2 hover:bg-gray-400'
                    }`}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
              <button
                onClick={handleNext}
                className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:border-gold hover:text-gold transition-colors"
                aria-label="Next slide"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

/* ─── CONVERSION TRUST STRIP ─── */
const conversionItems = [
  { icon: Truck, label: 'Free Shipping', sub: 'on orders ₹999+' },
  { icon: Banknote, label: 'COD Available', sub: 'pay on delivery' },
  { icon: ShieldCheck, label: 'Secure Checkout', sub: '100% safe payment' },
  { icon: RotateCcw, label: '7-Day Returns', sub: 'easy & hassle-free' },
  { icon: Sparkles, label: 'Premium Quality', sub: 'handpicked fabrics' },
];

const ConversionStrip = () => (
  <div className="bg-white border-b border-gray-100">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4 py-3 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        {conversionItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-2 flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-gold/5 flex items-center justify-center">
                <Icon className="w-4 h-4 text-gold" />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-text whitespace-nowrap">{item.label}</p>
                <p className="text-[10px] text-text-muted whitespace-nowrap">{item.sub}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

/* ─── AGE-BASED SHOPPING ─── */
const ageGroups = [
  { age: '0–6 Months', range: 'Newborn', desc: 'Tiny essentials for your little bundle', color: 'from-pink-100 to-rose-50' },
  { age: '6–12 Months', range: 'Baby', desc: 'Soft styles for crawling & exploring', color: 'from-blue-100 to-sky-50' },
  { age: '1–3 Years', range: 'Toddler', desc: 'Durable & adorable for active toddlers', color: 'from-green-100 to-emerald-50' },
  { age: '3–5 Years', range: 'Pre-school', desc: 'Fun, colorful outfits for big kids', color: 'from-purple-100 to-violet-50' },
  { age: '5+ Years', range: 'Kids', desc: 'Stylish & comfy for growing children', color: 'from-amber-100 to-yellow-50' },
];

const AgeSection = () => {
  const nav = useNavigate();
  return (
    <section className="py-14 lg:py-20 bg-[#FFFCF7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader title="Shop by Age" subtitle="Find the perfect fit for every stage" />
        <motion.div
          variants={container}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4"
        >
          {ageGroups.map((g, i) => (
            <motion.button
              key={g.age}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              onClick={() => nav('/products')}
              className={`group relative overflow-hidden rounded-2xl p-5 md:p-6 text-left bg-gradient-to-br ${g.color} border border-white/50 min-h-[160px] md:min-h-[180px]`}
            >
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">{g.range}</p>
                  <h3 className="font-display text-lg md:text-xl font-bold text-text mt-1">{g.age}</h3>
                </div>
                <p className="text-xs text-text-muted mt-2">{g.desc}</p>
              </div>
              <div className="absolute bottom-0 right-0 w-20 h-20 opacity-5">
                <ArrowRight className="w-full h-full" />
              </div>
            </motion.button>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

/* ─── FEATURED COLLECTIONS ─── */
const collections = [
  { title: 'Everyday Essentials', desc: 'Soft cottons for daily comfort', color: 'from-gold/10 to-amber-50', image: null },
  { title: 'Party Wear', desc: 'Special outfits for special moments', color: 'from-rose-100 to-pink-50', image: null },
  { title: 'Sleep & Play', desc: 'Cozy sets for sweet dreams', color: 'from-sky-100 to-blue-50', image: null },
];

const CollectionsSection = () => {
  const nav = useNavigate();
  return (
    <section className="py-14 lg:py-20 gradient-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader title="Featured Collections" subtitle="Curated just for your little one" linkTo="/products" linkLabel="Explore All" />
        <motion.div
          variants={container}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6"
        >
          {collections.map((c, i) => (
            <motion.button
              key={c.title}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              onClick={() => nav('/products')}
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${c.color} p-8 md:p-10 h-64 md:h-72 text-left border border-white/50 group`}
            >
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <h3 className="font-display text-2xl font-bold text-text mb-2">{c.title}</h3>
                  <p className="text-sm text-text-muted">{c.desc}</p>
                </div>
                <span className="text-sm font-semibold text-gold flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
                  Shop Now <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </motion.button>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

/* ─── WHY PARENTS TRUST ─── */
const trustItems = [
  { icon: Leaf, title: 'Premium Cotton', desc: '100% organic, breathable fabrics gentle on sensitive skin' },
  { icon: Heart, title: 'Skin Friendly', desc: 'Hypoallergenic & dermatologically tested for complete safety' },
  { icon: CheckCircle, title: 'Quality Checked', desc: 'Every stitch inspected — durability you can rely on' },
  { icon: Truck, title: 'Fast Shipping', desc: 'Free delivery on orders over ₹999 & easy 7-day returns' },
];

const TrustSection = () => (
  <section className="py-14 lg:py-20 bg-[#FFFCF7]">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <SectionHeader title="Why Parents Trust NestinoKids" subtitle="We put love and care into every piece" />
      <motion.div
        variants={container}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: '-50px' }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
      >
        {trustItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.title}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              className="bg-white rounded-2xl p-6 md:p-8 text-center border border-gray-50 shadow-card hover:shadow-premium transition-all duration-300"
            >
              <div className="w-12 h-12 bg-gold/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Icon className="w-6 h-6 text-gold" />
              </div>
              <h3 className="font-display text-base font-bold text-text mb-2">{item.title}</h3>
              <p className="text-xs text-text-muted leading-relaxed">{item.desc}</p>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  </section>
);

/* ─── CUSTOMER REVIEWS ─── */
const ReviewsSection = () => {
  const scrollRef = useRef(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    customerReviewsAPI.getPublic()
      .then((res) => {
        let arr = res.data;
        if (Array.isArray(arr)) setReviews(arr);
        else if (arr?.reviews && Array.isArray(arr.reviews)) setReviews(arr.reviews);
        else setReviews([]);
      })
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, []);

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 320, behavior: 'smooth' });
    }
  };

  return (
    <section className="py-14 lg:py-20 gradient-bg overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-10 lg:mb-12">
          <div>
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-text">What Parents Say</h2>
            <p className="text-text-muted text-sm mt-1.5">Real reviews from real families</p>
          </div>
          <div className="hidden md:flex gap-2">
            <button onClick={() => scroll(-1)} className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:border-gold hover:text-gold transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => scroll(1)} className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:border-gold hover:text-gold transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reviews.length === 0 ? null : (
          <motion.div
            ref={scrollRef}
            variants={container}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="flex gap-4 md:gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
          >
            {reviews.map((review, i) => (
              <motion.div
                key={review.id || i}
                variants={fadeUp}
                className="flex-shrink-0 w-[300px] md:w-[340px] bg-white rounded-2xl p-6 md:p-8 border border-gray-50 shadow-card snap-start"
              >
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className={`w-3.5 h-3.5 ${j < review.rating ? 'text-gold fill-gold' : 'text-gray-200'}`} />
                  ))}
                </div>
                <p className="text-sm text-text-muted leading-relaxed mb-5 line-clamp-4">&ldquo;{review.review_text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  {review.customer_image && (
                    <img
                      src={review.customer_image}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover border border-white"
                    />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-text">{review.customer_name}</p>
                    {review.city && <p className="text-xs text-text-muted">{review.city}</p>}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
};

/* ─── INSTAGRAM GALLERY ─── */
const InstagramSection = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [instagramUrl, setInstagramUrl] = useState('https://instagram.com/nestinokids');
  const scrollRef = useRef(null);

  useEffect(() => {
    settingsAPI.getPublic()
      .then((res) => {
        if (res.data?.instagram_url) {
          setInstagramUrl(res.data.instagram_url);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading) {
      console.log('[Instagram] Render state — posts.length:', posts.length, 'loading:', loading);
    }
  }, [posts, loading]);

  useEffect(() => {
    console.log('[Instagram] Fetching posts...');
    instagramAPI.getPosts()
      .then((res) => {
        console.log('[Instagram] Raw axios response:', res);
        console.log('[Instagram] res.status:', res?.status);
        console.log('[Instagram] res.data (response body):', res?.data);
        console.log('[Instagram] typeof res.data:', typeof res?.data);
        console.log('[Instagram] Array.isArray(res.data):', Array.isArray(res?.data));

        // Extract posts array from the response body.
        // Backend returns List[InstagramPostResponse] = plain JSON array.
        // Handle any extra wrapping like { data: [...] }, { posts: [...] }, { items: [...] }.
        let postsArray = [];
        if (Array.isArray(res?.data)) {
          postsArray = res.data;
        } else if (res?.data?.data && Array.isArray(res.data.data)) {
          console.log('[Instagram] Using res.data.data (wrapped in { data } envelope)');
          postsArray = res.data.data;
        } else if (res?.data?.posts && Array.isArray(res.data.posts)) {
          console.log('[Instagram] Using res.data.posts');
          postsArray = res.data.posts;
        } else if (res?.data?.items && Array.isArray(res.data.items)) {
          console.log('[Instagram] Using res.data.items');
          postsArray = res.data.items;
        } else {
          console.warn('[Instagram] Could not find array in response — postsArray stays []');
        }

        console.log('[Instagram] Final posts array:', postsArray);
        console.log('[Instagram] Final posts count:', postsArray.length);
        console.log('[Instagram] First post sample:', postsArray[0]);

        setPosts(postsArray);
      })
      .catch((err) => {
        console.error('[Instagram] Fetch error:', err);
        console.error('[Instagram] Error response:', err.response);
        console.error('[Instagram] Error data:', err.response?.data);
        setPosts([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleClick = (postId) => {
    instagramAPI.trackClick(postId).catch(() => {});
  };

  const gradients = [
    'from-gold/10 to-amber-50',
    'from-rose-100 to-pink-50',
    'from-sky-100 to-blue-50',
    'from-green-100 to-emerald-50',
    'from-purple-100 to-violet-50',
    'from-amber-100 to-yellow-50',
  ];

  const renderCard = (post, i) => (
    <a
      href={post.post_url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => handleClick(post.id)}
      className={`group relative block rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-500 hover:-translate-y-2 flex-shrink-0 w-[65vw] sm:w-[45vw] md:w-auto snap-center bg-gradient-to-br ${
        gradients[i % gradients.length]
      }`}
    >
      {post.thumbnail_image ? (
        <>
          <div className="aspect-square overflow-hidden">
            <img
              src={post.thumbnail_image}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.08]"
            />
          </div>

          {/* Gradient overlay at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />

          {/* Instagram badge top-right */}
          <div className="absolute top-3 right-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center shadow-md">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <circle cx="12" cy="12" r="5" />
                <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
              </svg>
            </div>
          </div>

          {/* Play button overlay center */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center backdrop-blur-sm shadow-lg">
              <div className="w-0 h-0 border-t-[7px] border-b-[7px] border-l-[12px] border-t-transparent border-b-transparent border-l-gray-900 ml-1" />
            </div>
          </div>
        </>
      ) : (
        <div className="aspect-square flex items-center justify-center">
          <Camera className="w-10 h-10 text-text/20" />
        </div>
      )}
    </a>
  );

  return (
    <section className="py-14 lg:py-20 bg-[#FFFCF7] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Follow Us @nestinokids"
          subtitle="Tag us for a chance to be featured"
          linkTo={instagramUrl}
          linkLabel="Follow on Instagram"
        />

        {loading ? (
          <motion.div
            variants={container}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-xl bg-gray-100 animate-pulse"
              />
            ))}
          </motion.div>
        ) : posts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold/10 to-amber-50 flex items-center justify-center mb-4">
              <Camera size={32} className="text-gold/40" />
            </div>
            <p className="text-lg font-semibold text-text mb-1">
              Instagram feed coming soon
            </p>
            <p className="text-sm text-text-muted">
              Follow @nestinokids for latest updates
            </p>
          </motion.div>
        ) : (
          <>
            {console.log('[Instagram] RENDER PATH: posts branch (loading:', loading, ', posts.length:', posts.length, ')')}
            {/* Mobile: horizontal swipe carousel */}
            <div
              ref={scrollRef}
              className="flex md:hidden gap-3 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pb-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {posts.map((post, i) => (
                <React.Fragment key={post.id}>
                  {renderCard(post, i)}
                </React.Fragment>
              ))}
            </div>

            {/* Desktop: grid layout */}
            <div className="hidden md:block">
              <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
                {posts.map((post, i) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: i * 0.07 }}
                  >
                    {renderCard(post, i)}
                  </motion.div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

/* ─── NEWSLETTER ─── */
const NewsletterSection = () => (
  <section className="py-14 lg:py-20 bg-text relative overflow-hidden">
    <div className="absolute top-0 right-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
    <div className="absolute bottom-0 left-0 w-64 h-64 bg-gold/5 rounded-full blur-3xl" />
    <div className="relative z-10 max-w-2xl mx-auto px-4 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <Sparkles className="w-8 h-8 text-gold mx-auto mb-4" />
        <h2 className="font-display text-3xl lg:text-4xl font-bold text-white mb-3">
          Join the Family
        </h2>
        <p className="text-gray-400 text-sm mb-8 max-w-md mx-auto">
          Subscribe for exclusive access to new collections, special offers, and style inspiration.
        </p>
        <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input
            type="email"
            placeholder="Enter your email"
            className="flex-1 px-5 py-3.5 rounded-xl text-text outline-none text-sm bg-white/10 backdrop-blur-sm border border-white/10 text-white placeholder-gray-500 focus:border-gold/50 transition-colors"
            required
          />
          <button
            type="submit"
            className="px-8 py-3.5 bg-gold text-text font-semibold rounded-xl hover:bg-gold-light transition-colors text-sm whitespace-nowrap"
          >
            Subscribe
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-4">No spam. Unsubscribe anytime.</p>
      </motion.div>
    </div>
  </section>
);

/* ─── MAIN HOMEPAGE ─── */
const HomePage = () => {
  const nav = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productsAPI.getProducts({ limit: 12, sort: 'created_at' })
      .then((res) => setProducts(Array.isArray(res.data) ? res.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const bestSellers = products.slice(0, 4);
  const newArrivals = products.slice(4, 8);

  return (
    <div className="min-h-screen bg-[#FFFCF7]">
      {/* 1. Hero */}
      <HeroSection />

      {/* 1b. Conversion Trust Strip */}
      <ConversionStrip />

      {/* 2. Recently Viewed (logged-in only) */}
      <RecentlyViewedCarousel />

      {/* 3. Recommended For You (logged-in only) */}
      <RecommendedSection />

      {/* 5. Age-Based Shopping */}
      <AgeSection />

      {/* 6. Featured Collections */}
      <CollectionsSection />

      {/* 5. Best Sellers */}
      <section className="py-14 lg:py-20 bg-[#FFFCF7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader title="Best Sellers" subtitle="Loved by parents across India" linkTo="/bestsellers" />
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-100 rounded-2xl aspect-[3/4] animate-pulse" />
              ))}
            </div>
          ) : (
            <motion.div
              variants={container}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true, margin: '-50px' }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
            >
              {bestSellers.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* 6. New Arrivals */}
      <section className="py-14 lg:py-20 gradient-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader title="New Arrivals" subtitle="Fresh styles for the season" linkTo="/new-arrivals" />
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-100 rounded-2xl aspect-[3/4] animate-pulse" />
              ))}
            </div>
          ) : (
            <motion.div
              variants={container}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true, margin: '-50px' }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
            >
              {newArrivals.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* 9. Why Parents Trust */}
      <TrustSection />

      {/* 10. Customer Reviews */}
      <ReviewsSection />

      {/* 11. Instagram Gallery */}
      <InstagramSection />

      {/* 12. Newsletter */}
      <NewsletterSection />
    </div>
  );
};

export default HomePage;
