import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { shoppingAPI } from '../api/endpoints';
import { addToCart } from '../store/slices/cartSlice';
import { motion } from 'framer-motion';

const PLACEHOLDER = '/images/placeholder-product.svg';

const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [imgError, setImgError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    setImgError(false);
  }, [product]);

  const primaryImage = product.images?.find((img) => img.is_primary)?.image_url;
  const fallbackImage = product.images?.[0]?.image_url;
  const imageUrl = primaryImage || fallbackImage || PLACEHOLDER;
  const discount = product.discount_price
    ? Math.round(((product.price - product.discount_price) / product.price) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -5 }}
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
    >
      {/* Image */}
      <div className="relative overflow-hidden bg-ivory h-64">
        <img
          src={imgError ? PLACEHOLDER : imageUrl}
          alt={product.name}
          className="w-full h-full object-cover cursor-pointer hover:scale-110 transition"
          onClick={() => navigate(`/products/${product.slug}`)}
          onError={() => setImgError(true)}
        />
        {discount > 0 && (
          <div className="absolute top-4 right-4 bg-red-500 text-white px-2 py-1 rounded-lg text-sm font-bold">
            -{discount}%
          </div>
        )}
        {product.is_featured && (
          <div className="absolute top-4 left-4 bg-gold text-white px-2 py-1 rounded-lg text-xs font-bold">
            Featured
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Category */}
        <p className="text-xs text-gold font-semibold mb-1">{product.category?.name}</p>

        {/* Name */}
        <h3
          className="font-semibold text-text mb-2 cursor-pointer hover:text-gold"
          onClick={() => navigate(`/products/${product.slug}`)}
        >
          {product.name.substring(0, 40)}...
        </h3>

        {/* Price */}
        <div className="flex items-center space-x-2 mb-3">
          {product.discount_price ? (
            <>
              <span className="text-lg font-bold text-gold">₹{product.discount_price}</span>
              <span className="text-sm text-gray-400 line-through">₹{product.price}</span>
            </>
          ) : (
            <span className="text-lg font-bold text-gold">₹{product.price}</span>
          )}
        </div>

        {/* Rating */}
        <div className="flex items-center space-x-1 mb-3">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <span
                key={i}
                className={`text-xs ${
                  i < Math.round(product.rating) ? 'text-gold' : 'text-gray-300'
                }`}
              >
                ★
              </span>
            ))}
          </div>
          <span className="text-xs text-gray-500">({product.review_count})</span>
        </div>

        {/* Buttons */}
        <div className="flex space-x-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={async () => {
              if (adding) return;
              setAdding(true);
              try {
                await shoppingAPI.addToCart(product.id, { quantity: 1 });
                dispatch(addToCart({ ...product, quantity: 1 }));
                setAdded(true);
                setTimeout(() => setAdded(false), 2000);
              } catch {
                // silently fail — item stays in local state
              } finally {
                setAdding(false);
              }
            }}
            className={`flex-1 py-2 rounded-lg font-semibold transition ${
              added ? 'bg-green-500 text-white' : adding ? 'bg-gold bg-opacity-60 text-white cursor-not-allowed' : 'bg-gold text-white hover:bg-opacity-90'
            }`}
          >
            {added ? 'Added!' : adding ? 'Adding...' : 'Add to Cart'}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
