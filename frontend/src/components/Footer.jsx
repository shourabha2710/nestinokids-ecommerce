import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Heart } from 'lucide-react';
import { settingsAPI } from '../api/endpoints';

const Footer = () => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    settingsAPI.getPublic()
      .then((res) => setSettings(res.data))
      .catch(() => {});
  }, []);

  const s = {
    instagram_url: settings?.instagram_url || 'https://instagram.com/nestinokids',
    facebook_url: settings?.facebook_url || 'https://facebook.com/nestinokids',
    youtube_url: settings?.youtube_url || 'https://youtube.com/@nestinokids',
    support_phone: settings?.support_phone || '9015957377',
    support_email: settings?.support_email || 'support@nestinokids.com',
    address: settings?.address || 'F-3/339 Street No., Sangam Vihar, New Delhi 110080',
  };

  const footerNav = [
    {
      title: 'Company',
      links: [
        { label: 'About Us', path: '/about' },
        { label: 'Contact Us', path: '/contact' },
        { label: 'FAQ', path: '/faq' },
        { label: 'Shipping Policy', path: '/shipping-policy' },
      ],
    },
    {
      title: 'Customer Service',
      links: [
        { label: 'Return & Refund Policy', path: '/return-policy' },
        { label: 'Privacy Policy', path: '/privacy-policy' },
        { label: 'Terms & Conditions', path: '/terms' },
      ],
    },
    {
      title: 'Shop',
      links: [
        { label: 'All Products', path: '/products' },
        { label: 'Categories', path: '/categories' },
        { label: 'Best Sellers', path: '/bestsellers' },
        { label: 'New Arrivals', path: '/new-arrivals' },
      ],
    },
    {
      title: 'Social',
      links: [
        { label: 'Instagram', path: s.instagram_url },
        { label: 'Facebook', path: s.facebook_url },
        { label: 'YouTube', path: s.youtube_url },
      ],
    },
  ];

  const handleNavigate = (path) => {
    window.scrollTo(0, 0);
    if (path.startsWith('http')) {
      window.open(path, '_blank', 'noopener,noreferrer');
    } else {
      navigate(path);
    }
  };

  const container = {
    animate: { transition: { staggerChildren: 0.06 } },
  };

  const fadeUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <footer className="bg-text text-white">
      {/* Newsletter */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-xl mx-auto text-center"
          >
            <h3 className="font-display text-2xl lg:text-3xl font-bold text-white mb-3">
              Join the NestinoKids Family
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              Subscribe for exclusive offers, new arrivals, and parenting tips.
            </p>
            <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-5 py-3 rounded-xl text-text outline-none text-sm"
                required
              />
              <button
                type="submit"
                className="px-8 py-3 bg-gold text-text font-semibold rounded-xl hover:bg-gold-light transition-colors text-sm whitespace-nowrap"
              >
                Subscribe
              </button>
            </form>
          </motion.div>
        </div>
      </div>

      {/* Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
        <motion.div
          variants={container}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12"
        >
          {footerNav.map((group) => (
            <motion.div key={group.title} variants={fadeUp}>
              <h4 className="font-display text-base font-bold text-gold mb-4">{group.title}</h4>
              <ul className="space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <button
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                      onClick={() => handleNavigate(link.path)}
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Brand Info */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center md:text-left"
            >
              <img
                src="/images/logo.png"
                alt="NestinoKids"
                className="h-20 w-auto object-contain mx-auto md:mx-0 mb-4"
              />
              <h3 className="font-display text-xl font-bold text-gold mb-1">NestinoKids</h3>
              <p className="text-sm text-gray-400 mb-3">Softness You Can Trust</p>
              <p className="text-xs text-gray-500">Premium Kids Apparel &amp; Essentials</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <h4 className="font-display text-base font-bold text-gold mb-4">Contact Us</h4>
              <ul className="space-y-3">
                <li className="flex items-center gap-2.5 text-sm text-gray-400">
                  <Phone className="w-4 h-4 text-gold flex-shrink-0" />
                  <span>{s.support_phone}</span>
                </li>
                <li className="flex items-center gap-2.5 text-sm text-gray-400">
                  <Mail className="w-4 h-4 text-gold flex-shrink-0" />
                  <span>{s.support_email}</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-gray-400">
                  <MapPin className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
                  <span>{s.address}</span>
                </li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <h4 className="font-display text-base font-bold text-gold mb-4">We Accept</h4>
              <div className="flex flex-wrap gap-2">
                <div className="bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-semibold text-white">Visa</div>
                <div className="bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-semibold text-white">Mastercard</div>
                <div className="bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-semibold text-white">UPI</div>
                <div className="bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-semibold text-white">Net Banking</div>
                <div className="bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-semibold text-white">COD</div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-sm text-gray-500">
            &copy; {currentYear} NestinoKids Enterprises. All rights reserved.
          </p>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            Made with <Heart className="w-3 h-3 text-red-400" /> for happy kids
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
