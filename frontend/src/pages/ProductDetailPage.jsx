import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { productsAPI, shoppingAPI } from '../api/endpoints';
import { addToCart } from '../store/slices/cartSlice';
import { motion } from 'framer-motion';

const PLACEHOLDER = '/images/placeholder-product.svg';

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

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!slug) return;
    fetchProduct();
  }, [slug]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await productsAPI.getProduct(slug);
      setProduct(res.data);
    } catch {
      setError('Product not found');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (adding) return;
    setAdding(true);
    try {
      await shoppingAPI.addToCart(product.id, { quantity });
      dispatch(addToCart({ ...product, quantity }));
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch {
      // silently fail
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="h-96 bg-gray-200 rounded-lg" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4" />
            <div className="h-6 bg-gray-200 rounded w-1/4" />
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-5/6" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
            <div className="h-12 bg-gray-200 rounded w-1/3" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-text mb-4">{error || 'Product not found'}</h2>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/')}
          className="bg-gold text-white px-6 py-2 rounded-lg font-semibold"
        >
          Back to Home
        </motion.button>
      </div>
    );
  }

  const images = product.images?.length > 0
    ? product.images
    : [{ image_url: PLACEHOLDER, is_primary: true, alt_text: product.name }];
  const discount = product.discount_price
    ? Math.round(((product.price - product.discount_price) / product.price) * 100)
    : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6">
        <button onClick={() => navigate('/')} className="hover:text-gold">Home</button>
        {product.category && (
          <>
            <span className="mx-2">/</span>
            <span className="text-text">{product.category?.name}</span>
          </>
        )}
        <span className="mx-2">/</span>
        <span className="text-text font-semibold">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Images */}
        <div>
          <motion.div
            key={selectedImage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-ivory rounded-lg overflow-hidden h-96"
          >
            <img
              src={images[selectedImage]?.image_url || PLACEHOLDER}
              alt={images[selectedImage]?.alt_text || product.name}
              className="w-full h-full object-cover"
              onError={(e) => { e.target.src = PLACEHOLDER; }}
            />
          </motion.div>
          {images.length > 1 && (
            <div className="flex gap-2 mt-4">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`w-16 h-16 rounded border-2 overflow-hidden ${
                    i === selectedImage ? 'border-gold' : 'border-gray-200'
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

        {/* Details */}
        <div>
          <h1 className="text-3xl font-bold text-text mb-3">{product.name}</h1>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <span key={i} className={`text-sm ${i < Math.round(product.rating) ? 'text-gold' : 'text-gray-300'}`}>
                  ★
                </span>
              ))}
            </div>
            <span className="text-sm text-gray-500">({product.review_count} reviews)</span>
          </div>

          {/* Price */}
          <div className="mb-6">
            {product.discount_price ? (
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-gold">₹{product.discount_price}</span>
                <span className="text-xl text-gray-400 line-through">₹{product.price}</span>
                <span className="bg-red-500 text-white px-2 py-1 rounded text-sm font-bold">
                  -{discount}%
                </span>
              </div>
            ) : (
              <span className="text-3xl font-bold text-gold">₹{product.price}</span>
            )}
          </div>

          {/* Description */}
          <p className="text-gray-600 mb-6 leading-relaxed">{product.description}</p>

          {product.short_description && (
            <p className="text-gray-500 text-sm mb-6 italic">{product.short_description}</p>
          )}

          {/* Quantity */}
          <div className="flex items-center gap-4 mb-6">
            <span className="font-semibold text-text">Quantity:</span>
            <div className="flex items-center border rounded">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3 py-2 hover:bg-gray-100"
              >
                -
              </button>
              <span className="px-4 py-2 font-semibold min-w-[3rem] text-center">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="px-3 py-2 hover:bg-gray-100"
              >
                +
              </button>
            </div>
          </div>

          {/* Add to Cart */}
          <motion.button
            whileHover={adding ? {} : { scale: 1.02 }}
            whileTap={adding ? {} : { scale: 0.98 }}
            onClick={handleAddToCart}
            disabled={adding}
            className={`w-full py-3 rounded-lg font-bold text-lg transition ${
              added ? 'bg-green-500 text-white' : adding ? 'bg-gold bg-opacity-60 text-white cursor-not-allowed' : 'bg-gold text-white hover:bg-opacity-90'
            }`}
          >
            {added ? 'Added to Cart!' : adding ? 'Adding...' : `Add to Cart - ₹${(product.discount_price || product.price) * quantity}`}
          </motion.button>

          {/* SKU */}
          <p className="text-xs text-gray-400 mt-4">SKU: {product.sku}</p>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
