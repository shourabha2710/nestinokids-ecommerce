import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { productsAPI, instagramAPI } from '../api/endpoints';
import ProductCard from '../components/ProductCard';
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

/* ─── HERO ─── */
const HeroSection = ({ banners }) => {
  const nav = useNavigate();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => setCurrent((p) => (p + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, [banners.length]);

  const hasBanners = banners.length > 0;

  return (
    <section className="relative overflow-hidden bg-gradient-hero min-h-[80vh] lg:min-h-[85vh] flex items-center">
      {/* Floating decoratives */}
      <FloatIcon icon={Star} className="top-12 left-[8%]" />
      <FloatIcon icon={Heart} className="top-1/3 right-[10%]" />
      <FloatIcon icon={Sparkles} className="bottom-20 left-[15%]" />
      <FloatIcon icon={Star} className="bottom-1/4 right-[5%]" />

      {/* Background gradient orbs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blush/30 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {hasBanners ? (
          <>
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center"
              >
                {/* Text */}
                <div>
                  <span className="inline-block text-xs font-semibold text-gold uppercase tracking-[0.2em] mb-4">
                    Premium Kids Apparel
                  </span>
                  <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-text leading-[1.1] mb-5">
                    {banners[current].title || 'Softness You Can Trust'}
                  </h1>
                  <p className="text-text-muted text-lg md:text-xl leading-relaxed mb-8 max-w-lg">
                    {banners[current].description || 'Premium clothing crafted for newborns, toddlers and growing kids.'}
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => nav('/products?category=' + (banners[current].button_link || ''))}
                      className="h-12 px-8 bg-gold text-white rounded-xl font-semibold text-sm shadow-premium hover:bg-gold-dark transition-colors flex items-center gap-2"
                    >
                      {banners[current].button_text || 'Shop Now'}
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

                {/* Image */}
                {banners[current].image_url && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="relative"
                  >
                    <div className="aspect-[4/3] lg:aspect-square rounded-2xl overflow-hidden shadow-premium-lg">
                      <img
                        src={banners[current].image_url}
                        alt={banners[current].title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {/* Decorative frame */}
                    <div className="absolute -top-3 -right-3 w-full h-full border-2 border-gold/20 rounded-2xl -z-10" />
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Dots */}
            {banners.length > 1 && (
              <div className="flex justify-center gap-2 mt-8 lg:mt-10">
                {banners.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                      i === current ? 'bg-gold w-8' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          /* Fallback hero */
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
                <img
                  src="/images/logo.png"
                  alt="NestinoKids"
                  className="object-contain w-2/3 opacity-20"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

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
const reviews = [
  { name: 'Priya S.', role: 'Mom of 2', rating: 5, text: 'The quality is absolutely incredible. My baby has sensitive skin and these clothes are the only ones that don\'t cause any irritation.' },
  { name: 'Ananya R.', role: 'New Mom', rating: 5, text: 'I\'ve never seen such soft fabric! The designs are adorable and the colors stay bright even after many washes.' },
  { name: 'Neha M.', role: 'Mom of a Toddler', rating: 4, text: 'Perfect fit for my active toddler. The clothes are durable, easy to clean, and my little one loves wearing them.' },
  { name: 'Kavita D.', role: 'Mom of 3', rating: 5, text: 'Been buying from NestinoKids for years. The quality is consistent, the pricing is fair, and the delivery is always prompt.' },
  { name: 'Ritu P.', role: 'First-time Mom', rating: 5, text: 'The baby shower gift set was gorgeous! Everyone complimented it. Already placing my second order.' },
];

const ReviewsSection = () => {
  const scrollRef = useRef(null);

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
              key={i}
              variants={fadeUp}
              className="flex-shrink-0 w-[300px] md:w-[340px] bg-white rounded-2xl p-6 md:p-8 border border-gray-50 shadow-card snap-start"
            >
              <div className="flex gap-0.5 mb-3">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className={`w-3.5 h-3.5 ${j < review.rating ? 'text-gold fill-gold' : 'text-gray-200'}`} />
                ))}
              </div>
              <p className="text-sm text-text-muted leading-relaxed mb-5 line-clamp-4">&ldquo;{review.text}&rdquo;</p>
              <div>
                <p className="text-sm font-semibold text-text">{review.name}</p>
                <p className="text-xs text-text-muted">{review.role}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

/* ─── INSTAGRAM GALLERY ─── */
const InstagramSection = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    instagramAPI.getPosts()
      .then((res) => setPosts(res.data))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  const gradients = [
    'from-gold/10 to-amber-50',
    'from-rose-100 to-pink-50',
    'from-sky-100 to-blue-50',
    'from-green-100 to-emerald-50',
    'from-purple-100 to-violet-50',
    'from-amber-100 to-yellow-50',
  ];

  return (
    <section className="py-14 lg:py-20 bg-[#FFFCF7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Follow Us @nestinokids"
          subtitle="Tag us for a chance to be featured"
          linkTo="https://instagram.com/nestinokids"
          linkLabel="Follow on Instagram"
        />
        <motion.div
          variants={container}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4"
        >
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-xl bg-gray-100 animate-pulse"
                />
              ))
            : posts.map((post, i) => (
                <motion.a
                  key={post.id}
                  variants={fadeUp}
                  href={post.post_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group relative overflow-hidden rounded-xl aspect-square bg-gradient-to-br ${
                    gradients[i % gradients.length]
                  } border border-white/50`}
                >
                  {post.thumbnail_image ? (
                    <img
                      src={post.thumbnail_image}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Camera className="w-8 h-8 text-text/20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Camera className="w-4 h-4 text-white" />
                  </div>
                </motion.a>
              ))}
        </motion.div>
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
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, bannersRes] = await Promise.all([
          productsAPI.getProducts({ limit: 12, sort: 'created_at' }),
          productsAPI.getActiveBanners(),
        ]);
        setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
        setBanners(Array.isArray(bannersRes.data) ? bannersRes.data : []);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const bestSellers = products.slice(0, 4);
  const newArrivals = products.slice(4, 8);

  return (
    <div className="min-h-screen bg-[#FFFCF7]">
      {/* 1. Hero */}
      <HeroSection banners={banners} />

      {/* 2. Age-Based Shopping */}
      <AgeSection />

      {/* 3. Featured Collections */}
      <CollectionsSection />

      {/* 4. Best Sellers */}
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

      {/* 5. New Arrivals */}
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

      {/* 6. Why Parents Trust */}
      <TrustSection />

      {/* 7. Customer Reviews */}
      <ReviewsSection />

      {/* 8. Instagram Gallery */}
      <InstagramSection />

      {/* 9. Newsletter */}
      <NewsletterSection />
    </div>
  );
};

export default HomePage;
