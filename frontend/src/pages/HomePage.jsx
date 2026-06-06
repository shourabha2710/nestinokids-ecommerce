import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { productsAPI } from '../api/endpoints';
import ProductCard from '../components/ProductCard';
import { motion, AnimatePresence } from 'framer-motion';

const HeroBanner = ({ banners }) => {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  if (banners.length === 0) {
    return (
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative bg-gradient-to-r from-gold to-blush py-20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-text mb-4">
              NestinoKids
            </h1>
            <p className="text-xl md:text-2xl text-text mb-6">
              Softness You Can Trust
            </p>
            <p className="text-lg text-text mb-8">
              Premium Baby & Kids Apparel with Love
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-text text-gold px-8 py-3 rounded-lg font-bold text-lg hover:bg-opacity-90"
            >
              Shop Now
            </motion.button>
          </div>
        </div>
      </motion.section>
    );
  }

  const banner = banners[current];

  return (
    <section className="relative overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="relative h-[400px] md:h-[500px]"
        >
          <img
            src={banner.image_url}
            alt={banner.title}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-black bg-opacity-30" />
          <div className="absolute inset-0 flex items-center">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="max-w-lg"
              >
                <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
                  {banner.title}
                </h1>
                {banner.description && (
                  <p className="text-lg md:text-xl text-white mb-6">
                    {banner.description}
                  </p>
                )}
                {banner.button_text && (
                  <motion.a
                    href={banner.button_link || '#'}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-block bg-gold text-text px-8 py-3 rounded-lg font-bold text-lg hover:bg-opacity-90"
                  >
                    {banner.button_text}
                  </motion.a>
                )}
              </motion.div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2">
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-3 h-3 rounded-full transition ${
              i === current ? 'bg-gold' : 'bg-white bg-opacity-50'
            }`}
          />
        ))}
      </div>
    </section>
  );
};

const HomePage = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [productsRes, categoriesRes, bannersRes] = await Promise.all([
          productsAPI.getProducts({ limit: 12 }),
          productsAPI.getCategories(),
          productsAPI.getActiveBanners(),
        ]);
        setProducts(productsRes.data);
        setCategories(categoriesRes.data);
        setBanners(bannersRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <HeroBanner banners={banners} />

      {/* Why Choose Us */}
      <section className="py-16 bg-ivory">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-text mb-12">
            Why Choose NestinoKids?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: '✨',
                title: 'Premium Quality',
                description: 'Carefully selected, soft, and comfortable fabrics for your little ones.'
              },
              {
                icon: '❤️',
                title: 'Trusted by Parents',
                description: 'Thousands of happy parents trust us with their children\'s comfort.'
              },
              {
                icon: '🚚',
                title: 'Fast Delivery',
                description: 'Quick and reliable shipping across India with easy returns.'
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                whileHover={{ y: -5 }}
                className="text-center p-6 bg-white rounded-lg shadow-md"
              >
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-xl font-bold text-text mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      {!loading && categories.length > 0 && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-text mb-12">Shop by Category</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {categories.filter((c) => c.is_active !== false).map((cat, i) => (
                <motion.button
                  key={cat.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => navigate(`/products?category=${cat.id}`)}
                  className="bg-ivory rounded-xl p-4 text-center hover:shadow-md hover:bg-gold/10 transition-all duration-200 group min-h-[100px] flex flex-col items-center justify-center"
                >
                  <span className="text-2xl mb-1">{(cat.name || '').charAt(0)}</span>
                  <span className="text-sm font-semibold text-text group-hover:text-gold transition-colors">
                    {cat.name}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-text mb-12">Featured Products</h2>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-200 h-64 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Best Sellers */}
      <section className="py-16 bg-ivory">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-text mb-12">Best Sellers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.slice(4, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-16 bg-text text-white">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
          <p className="text-lg mb-8">Subscribe to get exclusive offers and new product updates!</p>
          <form className="flex flex-col md:flex-row gap-4">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-lg text-text outline-none"
              required
            />
            <button
              type="submit"
              className="bg-gold text-text px-8 py-3 rounded-lg font-bold hover:bg-opacity-90"
            >
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
