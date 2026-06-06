import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { productsAPI, shoppingAPI } from '../api/endpoints';
import { addToCart } from '../store/slices/cartSlice';
import { addWishlistItem, removeWishlistItem } from '../store/slices/wishlistSlice';
import MobilePageHeader from '../components/MobilePageHeader';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ShoppingBag, Star, Shield, Truck, RefreshCw, ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';
import RelatedProducts from '../components/RelatedProducts';

const PLACEHOLDER = '/images/placeholder-product.svg';

const stagger = {
  animate: {
    transition: { staggerChildren: 0.06 },
  },
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const ProductDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const { isAuthenticated } = useSelector((state) => state.auth);
  const wishlistIds = useSelector((state) => state.wishlist.ids);
  const isInWishlist = product ? wishlistIds.includes(product.id) : false;

  useEffect(() => {
    if (!slug) return;
    fetchProduct();
  }, [slug]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await productsAPI.getProduct(slug);
      setProduct(res.data);
      setSelectedImage(0);
      setQuantity(1);
    } catch {
      setError('Product not found');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleWishlist = async () => {
    if (!isAuthenticated || wishlistLoading || !product) return;
    setWishlistLoading(true);
    try {
      if (isInWishlist) {
        await shoppingAPI.removeFromWishlist(product.id);
        dispatch(removeWishlistItem(product.id));
      } else {
        await shoppingAPI.addToWishlist(product.id);
        dispatch(addWishlistItem(product));
      }
    } catch {
      // silently fail
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (adding || !product) return;
    setAdding(true);
    try {
      await shoppingAPI.addToCart(product.id, { quantity });
      dispatch(addToCart({ ...product, quantity }));
      setAdded(true);
      setTimeout(() => setAdded(false), 2500);
    } catch {
      // silently fail
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFCF7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="aspect-square bg-gray-200 rounded-2xl" />
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 rounded w-1/4" />
              <div className="h-10 bg-gray-200 rounded w-3/4" />
              <div className="h-5 bg-gray-200 rounded w-1/3" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-5/6" />
              <div className="h-12 bg-gray-200 rounded w-2/3 mt-8" />
              <div className="h-14 bg-gray-200 rounded w-full mt-4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#FFFCF7] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-text mb-4">{error || 'Product not found'}</h2>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/')}
            className="bg-gold text-white px-6 py-3 rounded-xl font-semibold"
          >
            Back to Home
          </motion.button>
        </div>
      </div>
    );
  }

  const images = product.images?.length > 0
    ? product.images
    : [{ image_url: PLACEHOLDER, is_primary: true, alt_text: product.name }];
  const discount = product.discount_price
    ? Math.round(((product.price - product.discount_price) / product.price) * 100)
    : 0;
  const stars = Math.round(product.rating);

  const trustBadges = [
    { icon: Shield, label: 'Premium Quality', desc: 'Safe & tested materials' },
    { icon: Truck, label: 'Fast Delivery', desc: '2-5 business days' },
    { icon: RefreshCw, label: 'Easy Returns', desc: '7-day return policy' },
  ];

  return (
    <div className="min-h-screen bg-[#FFFCF7]">
      <MobilePageHeader title={product.name} className="mb-4 -mx-4 -mt-2" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Breadcrumb */}
        <nav className="hidden md:flex items-center text-sm text-text-muted mb-8">
          <button onClick={() => navigate('/')} className="hover:text-gold transition-colors">Home</button>
          <ChevronRight className="w-3.5 h-3.5 mx-2" />
          {product.category && (
            <>
              <button onClick={() => navigate(`/products?category=${product.category.id}`)} className="hover:text-gold transition-colors">
                {product.category.name}
              </button>
              <ChevronRight className="w-3.5 h-3.5 mx-2" />
            </>
          )}
          <span className="text-text font-medium truncate max-w-[200px]">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14">
          {/* LEFT — Image Gallery */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <motion.div layout className="relative bg-ivory rounded-2xl overflow-hidden aspect-square mb-4 shadow-card">
              <AnimatePresence mode="wait">
                <motion.img
                  key={selectedImage}
                  src={images[selectedImage]?.image_url || PLACEHOLDER}
                  alt={images[selectedImage]?.alt_text || product.name}
                  initial={{ opacity: 0, scale: 1.02 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.src = PLACEHOLDER; }}
                />
              </AnimatePresence>

              {/* Nav arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedImage((i) => (i - 1 + images.length) % images.length); }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-text" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedImage((i) => (i + 1) % images.length); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-text" />
                  </button>
                </>
              )}
            </motion.div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                      i === selectedImage ? 'border-gold shadow-premium' : 'border-gray-100 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img.image_url}
                      alt={img.alt_text || `View ${i + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = PLACEHOLDER; }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — Product Details */}
          <motion.div variants={stagger} initial="initial" animate="animate" className="flex flex-col">
            <motion.div variants={fadeUp}>
              <p className="text-xs font-semibold text-gold uppercase tracking-[0.15em] mb-2">
                {product.category?.name || 'General'}
              </p>
              <h1 className="font-display text-3xl lg:text-4xl font-bold text-text leading-tight mb-4">
                {product.name}
              </h1>
            </motion.div>

            {/* Rating */}
            <motion.div variants={fadeUp} className="flex items-center gap-2 mb-5">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < stars ? 'text-gold fill-gold' : 'text-gray-200'}`}
                  />
                ))}
              </div>
              <span className="text-sm text-text-muted">({product.review_count} reviews)</span>
            </motion.div>

            {/* Price */}
            <motion.div variants={fadeUp} className="mb-6">
              {product.discount_price ? (
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl lg:text-4xl font-bold text-gold">₹{product.discount_price}</span>
                  <span className="text-lg text-text-muted line-through">₹{product.price}</span>
                  <span className="bg-red-500/10 text-red-500 text-xs font-bold px-2.5 py-1 rounded-full">
                    Save {discount}%
                  </span>
                </div>
              ) : (
                <span className="text-3xl lg:text-4xl font-bold text-gold">₹{product.price}</span>
              )}
            </motion.div>

            {/* Description */}
            <motion.div variants={fadeUp} className="mb-6">
              <p className="text-text-muted leading-relaxed">{product.description}</p>
            </motion.div>

            {/* Quantity */}
            <motion.div variants={fadeUp} className="flex items-center gap-4 mb-6">
              <span className="text-sm font-semibold text-text">Quantity</span>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 transition-colors text-text-muted hover:text-text"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-12 text-center font-semibold text-text text-sm">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 transition-colors text-text-muted hover:text-text"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div variants={fadeUp} className="flex gap-3 mb-6">
              <motion.button
                whileHover={adding ? {} : { scale: 1.01 }}
                whileTap={adding ? {} : { scale: 0.99 }}
                onClick={handleAddToCart}
                disabled={adding}
                className={`flex-1 h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                  added
                    ? 'bg-green-500 text-white'
                    : adding
                    ? 'bg-gold/60 text-white cursor-not-allowed'
                    : 'bg-gold text-white hover:bg-gold-dark shadow-premium'
                }`}
              >
                {added ? (
                  <><ShoppingBag className="w-4 h-4" /> Added to Cart</>
                ) : adding ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Adding...</>
                ) : (
                  <><ShoppingBag className="w-4 h-4" /> Add to Cart — ₹{(product.discount_price || product.price) * quantity}</>
                )}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleToggleWishlist}
                disabled={wishlistLoading}
                className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all ${
                  isInWishlist
                    ? 'border-red-200 bg-red-50 text-red-500'
                    : 'border-gray-200 text-text-muted hover:border-red-200 hover:text-red-400'
                }`}
                title={isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
              >
                <Heart className={`w-5 h-5 ${isInWishlist ? 'fill-current' : ''}`} />
              </motion.button>
            </motion.div>

            {/* Trust Badges */}
            <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3 mb-6">
              {trustBadges.map((badge, i) => (
                <div key={i} className="bg-ivory rounded-xl p-3 text-center">
                  <badge.icon className="w-4 h-4 text-gold mx-auto mb-1.5" />
                  <p className="text-[11px] font-semibold text-text">{badge.label}</p>
                  <p className="text-[10px] text-text-muted">{badge.desc}</p>
                </div>
              ))}
            </motion.div>

            {/* SKU */}
            <motion.p variants={fadeUp} className="text-xs text-text-muted">
              SKU: {product.sku}
            </motion.p>
          </motion.div>
        </div>

        {/* Related Products */}
        {product.id && (
          <div className="mt-16 lg:mt-20">
            <RelatedProducts productId={product.id} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetailPage;
