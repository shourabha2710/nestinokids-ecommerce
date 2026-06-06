import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const Footer = () => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

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
        { label: 'Instagram', path: 'https://instagram.com/nestinokids' },
        { label: 'Facebook', path: 'https://facebook.com/nestinokids' },
        { label: 'YouTube', path: 'https://youtube.com/@nestinokids' },
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

  return (
    <footer className="bg-text text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Newsletter */}
        <div className="py-12 border-b border-gray-700">
          <div className="max-w-md">
            <h3 className="text-lg font-bold mb-4">Subscribe to Our Newsletter</h3>
            <p className="text-sm text-gray-300 mb-4">Get updates on new arrivals and exclusive offers!</p>
            <form className="flex">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 rounded-l-lg text-text outline-none"
              />
              <button
                type="submit"
                className="px-6 py-2 bg-gold text-text font-semibold rounded-r-lg hover:bg-opacity-90"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        {/* Links */}
        <div className="py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          {footerNav.map((group) => (
            <motion.div
              key={group.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h4 className="text-lg font-bold mb-4 text-gold">{group.title}</h4>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <button
                      className="text-sm text-gray-300 hover:text-gold transition"
                      onClick={() => handleNavigate(link.path)}
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Brand Info */}
        <div className="py-8 border-t border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-bold text-gold mb-2">NestinoKids</h3>
              <p className="text-sm text-gray-300">Softness You Can Trust</p>
              <p className="text-xs text-gray-400 mt-2">Premium Kids Apparel & Essentials</p>
            </div>
            <div>
              <h4 className="font-semibold text-gold mb-2">Contact Us</h4>
              <p className="text-sm text-gray-300">Phone: 9015957377</p>
              <p className="text-sm text-gray-300">Email: support@nestinokids.com</p>
              <p className="text-sm text-gray-300 mt-2">F-3/339 Street No.</p>
              <p className="text-sm text-gray-300">Sangam Vihar, New Delhi 110080</p>
            </div>
            <div>
              <h4 className="font-semibold text-gold mb-2">We Accept</h4>
              <div className="flex space-x-2">
                <div className="bg-white px-2 py-1 rounded text-xs font-bold text-blue-600">CARD</div>
                <div className="bg-white px-2 py-1 rounded text-xs font-bold text-orange-600">UPI</div>
                <div className="bg-white px-2 py-1 rounded text-xs font-bold">NET</div>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="py-6 border-t border-gray-700 flex justify-between items-center">
          <p className="text-sm text-gray-400">
            &copy; {currentYear} NestinoKids Enterprises. All rights reserved.
          </p>
          <div className="text-xs text-gray-400">
            Made with ❤️ for happy kids
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
