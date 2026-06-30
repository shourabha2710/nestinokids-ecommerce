import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { shoppingAPI } from '../api/endpoints';
import { addToCart } from '../store/slices/cartSlice';
import { addWishlistItem, removeWishlistItem } from '../store/slices/wishlistSlice';
import { motion } from 'framer-motion';
import { Heart, ShoppingBag, Star } from 'lucide-react';
import ProductImage from './ProductImage';

const PLACEHOLDER = '/images/placeholder-product.svg';

const ProductCard = ({ product, index = 0 }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const { isAuthenticated } = useSelector((state) => state.auth);
  const wishlistIds = useSelector((state) => state.wishlist.ids);
  const isInWishlist = wishlistIds.includes(product.id);

  const primaryImage = product.images?.find((img) => img.is_primary)?.image_url;
  const fallbackImage = product.images?.[0]?.image_url;
  const imageUrl = primaryImage || fallbackImage || PLACEHOLDER;
  const discount = product.discount_price
    ? Math.round(((product.price - product.discount_price) / product.price) * 100)
    : 0;

  const handleWishlist = async (e) => {
    e.stopPropagation();
    if (!isAuthenticated || wishlistLoading) return;
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

  const handleQuickAdd = async (e) => {
    e.stopPropagation();
    if (adding) return;
    setAdding(true);
    try {
      await shoppingAPI.addToCart(product.id, { quantity: 1 });
      dispatch(addToCart({ ...product, quantity: 1 }));
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch {
      // silently fail
    } finally {
      setAdding(false);
    }
  };

  const stars = Math.round(product.rating);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      whileHover={{ y: -8 }}
      className="group bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-500 cursor-pointer"
      onClick={() => navigate(`/products/${product.slug}`)}
    >
      {/* Image container */}
      <div className="relative overflow-hidden bg-ivory aspect-square">
        <ProductImage
          variant="card"
          src={imageUrl}
          alt={product.name}
          imgClassName="transition-transform duration-600 hover:scale-[1.15]"
        />

        {/* Discount ribbon */}
        {discount > 0 && (
          <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            -{discount}%
          </div>
        )}

        {/* Featured badge */}
        {product.is_featured && !discount && (
          <div className="absolute top-3 left-3 bg-gold text-white text-xs font-bold px-2.5 py-1 rounded-full">
            Featured
          </div>
        )}

        {/* Wishlist button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleWishlist}
          className={`absolute top-3 right-3 p-2 rounded-full transition-colors z-10 ${
            isInWishlist
              ? 'bg-red-50 text-red-500'
              : 'bg-white/80 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100'
          }`}
          title={isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
        >
          <Heart className={`w-4 h-4 ${isInWishlist ? 'fill-current' : ''}`} />
        </motion.button>

        {/* Quick add button */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleQuickAdd}
          disabled={adding}
          className="absolute bottom-3 left-3 right-3 py-2.5 bg-white/90 backdrop-blur-sm rounded-xl text-sm font-semibold text-text opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg"
        >
          {added ? (
            <span className="flex items-center justify-center gap-1.5 text-green-600">
              <ShoppingBag className="w-4 h-4" /> Added
            </span>
          ) : adding ? (
            <span className="flex items-center justify-center gap-1.5">
              <span className="w-4 h-4 border-2 border-text border-t-transparent rounded-full animate-spin" /> Adding
            </span>
          ) : (
            <span className="flex items-center justify-center gap-1.5">
              <ShoppingBag className="w-4 h-4" /> Quick Add
            </span>
          )}
        </motion.button>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Category */}
        <p className="text-[11px] font-semibold text-gold uppercase tracking-wider mb-1">
          {product.category?.name || 'Category'}
        </p>

        {/* Name */}
        <h3 className="font-display font-semibold text-text text-base leading-snug mb-2 line-clamp-1">
          {product.name}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-1.5 mb-2.5">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-3 h-3 ${i < stars ? 'text-gold fill-gold' : 'text-gray-200'}`}
              />
            ))}
          </div>
          <span className="text-[11px] text-text-muted">({product.review_count})</span>
        </div>

        {/* Price */}
        <div className="flex items-center gap-2">
          {product.discount_price ? (
            <>
              <span className="text-lg font-bold text-gold">₹{product.discount_price}</span>
              <span className="text-sm text-text-muted line-through">₹{product.price}</span>
            </>
          ) : (
            <span className="text-lg font-bold text-gold">₹{product.price}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
