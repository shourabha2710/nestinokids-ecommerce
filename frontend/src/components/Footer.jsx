import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Heart, Sparkles, CheckCircle } from 'lucide-react';
import { settingsAPI } from '../api/endpoints';

const SvgIcon = ({ children, className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {children}
  </svg>
);

const InstagramIcon = ({ className }) => (
  <SvgIcon className={className}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </SvgIcon>
);

const FacebookIcon = ({ className }) => (
  <SvgIcon className={className}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </SvgIcon>
);

const YoutubeIcon = ({ className }) => (
  <SvgIcon className={className}>
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
  </SvgIcon>
);

const FooterColumn = ({ title, links, onNavigate, ...anim }) => (
  <motion.div {...anim}>
    <h4 className="font-display text-sm font-bold text-gold-dark uppercase tracking-wider mb-4">{title}</h4>
    <ul className="space-y-2.5">
      {links.map((link) => (
        <li key={link.label}>
          <button
            className="text-sm text-text-muted hover:text-gold-dark transition-colors text-left"
            onClick={() => onNavigate(link.path)}
          >
            {link.label}
          </button>
        </li>
      ))}
    </ul>
  </motion.div>
);

const Footer = () => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [settings, setSettings] = useState(null);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

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

  const quickLinks = [
    { label: 'All Products', path: '/products' },
    { label: 'Categories', path: '/categories' },
    { label: 'Best Sellers', path: '/bestsellers' },
    { label: 'New Arrivals', path: '/new-arrivals' },
    { label: 'About Us', path: '/about' },
  ];

  const customerService = [
    { label: 'Contact Us', path: '/contact' },
    { label: 'FAQ', path: '/faq' },
    { label: 'Return & Refund Policy', path: '/return-policy' },
    { label: 'Shipping Policy', path: '/shipping-policy' },
  ];

  const policies = [
    { label: 'Privacy Policy', path: '/privacy-policy' },
    { label: 'Terms & Conditions', path: '/terms' },
  ];

  const social = [
    { label: 'Instagram', path: s.instagram_url, icon: InstagramIcon },
    { label: 'Facebook', path: s.facebook_url, icon: FacebookIcon },
    { label: 'YouTube', path: s.youtube_url, icon: YoutubeIcon },
  ];

  const handleNavigate = (path) => {
    window.scrollTo(0, 0);
    if (path.startsWith('http')) {
      window.open(path, '_blank', 'noopener,noreferrer');
    } else {
      navigate(path);
    }
  };

  const handleSubscribe = (e) => {
    e.preventDefault();
    const value = email.trim();
    if (value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setSubscribed(true);
    }
  };

  const fadeUp = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.5 },
  };

  return (
    <footer className="bg-ivory-light text-text border-t border-gold/20">
      {/* Newsletter — integrated into the footer */}
      <div className="relative overflow-hidden border-b border-gold/10">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-[#EAF0E2]/70 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-14">
            <div className="flex-1 text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-3 mb-2">
                <span className="hidden sm:flex items-center justify-center w-11 h-11 rounded-full bg-gold/10 border border-gold/30 text-gold-dark flex-shrink-0">
                  <Sparkles className="w-5 h-5" />
                </span>
                <h3 className="font-display text-2xl lg:text-3xl font-bold text-gold-dark">
                  Join the NestinoKids Family
                </h3>
              </div>
              <p className="text-sm text-text-muted max-w-xl mx-auto lg:mx-0">
                Subscribe for exclusive offers, new arrivals, and parenting tips — delivered straight to your inbox.
              </p>
            </div>

            {subscribed ? (
              <div className="w-full lg:w-auto lg:flex-1 flex items-center justify-center gap-2 bg-white/80 border border-gold/30 rounded-full px-5 py-4">
                <CheckCircle className="w-5 h-5 text-[#7A8B6F] flex-shrink-0" />
                <p className="text-sm font-medium text-gold-dark">Thank you for subscribing! Welcome to the NestinoKids family.</p>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="w-full lg:flex-1 flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="flex-1 min-w-0 px-5 py-3.5 rounded-full border border-gold/30 bg-white text-text outline-none text-sm placeholder-text-muted focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
                />
                <button
                  type="submit"
                  className="px-8 py-3.5 bg-gold text-text font-semibold rounded-full hover:bg-gold-dark hover:text-white transition-colors text-sm whitespace-nowrap shadow-premium"
                >
                  Subscribe
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Link columns */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-8 gap-y-10 lg:gap-x-8">
          {/* Brand */}
          <motion.div {...fadeUp} className="col-span-2 md:col-span-3 lg:col-span-2">
            <img
              src="/images/logo1.png"
              alt="NestinoKids"
              className="h-[90px] w-auto lg:h-[110px] object-contain mb-4"
            />
            <p className="text-xs text-text-muted leading-relaxed mb-5">
              Premium kids apparel &amp; essentials for newborns, toddlers, and growing kids.
            </p>

            <ul className="space-y-2.5 mb-5">
              <li className="flex items-center gap-2.5 text-xs text-text-muted">
                <Phone className="w-4 h-4 text-gold-dark flex-shrink-0" />
                <span>{s.support_phone}</span>
              </li>
              <li className="flex items-center gap-2.5 text-xs text-text-muted">
                <Mail className="w-4 h-4 text-gold-dark flex-shrink-0" />
                <span className="break-words">{s.support_email}</span>
              </li>
              <li className="flex items-start gap-2.5 text-xs text-text-muted">
                <MapPin className="w-4 h-4 text-gold-dark flex-shrink-0 mt-0.5" />
                <span>{s.address}</span>
              </li>
            </ul>

            <div className="flex items-center gap-2.5">
              {social.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    aria-label={item.label}
                    onClick={() => handleNavigate(item.path)}
                    className="w-9 h-9 rounded-full border border-gold/40 bg-white text-gold-dark hover:bg-gold hover:text-white hover:border-gold transition-colors flex items-center justify-center"
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </motion.div>

          <FooterColumn {...fadeUp} title="Quick Links" links={quickLinks} onNavigate={handleNavigate} />
          <FooterColumn {...fadeUp} title="Customer Service" links={customerService} onNavigate={handleNavigate} />
          <FooterColumn {...fadeUp} title="Policies" links={policies} onNavigate={handleNavigate} />

          <motion.div {...fadeUp}>
            <h4 className="font-display text-sm font-bold text-gold-dark uppercase tracking-wider mb-4">Social</h4>
            <ul className="space-y-2.5">
              {social.map((item) => (
                <li key={item.label}>
                  <button
                    className="flex items-center gap-2 text-sm text-text-muted hover:text-gold-dark transition-colors"
                    onClick={() => handleNavigate(item.path)}
                  >
                    <item.icon className="w-4 h-4 text-gold-dark" />
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>

      {/* Payment / security + copyright */}
      <div className="border-t border-gold/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-text-muted text-center md:text-left">
            &copy; {currentYear} NestinoKids Enterprises. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {['Visa', 'Mastercard', 'UPI', 'Net Banking', 'COD'].map((m) => (
              <span key={m} className="bg-white border border-gold/25 rounded-lg px-3 py-1 text-[11px] font-semibold text-gold-dark">
                {m}
              </span>
            ))}
          </div>
          <p className="text-xs text-text-muted flex items-center gap-1">
            Made with <Heart className="w-3 h-3 text-[#C96F5A]" /> for happy kids
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
