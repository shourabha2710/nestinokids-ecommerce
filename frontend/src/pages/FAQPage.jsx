import React, { useState, useEffect } from 'react';
import MobilePageHeader from '../components/MobilePageHeader';
import { motion } from 'framer-motion';
import { ChevronDown, Search } from 'lucide-react';
import { faqAPI } from '../api/endpoints';

const FAQPage = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openIndex, setOpenIndex] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    faqAPI.getFAQs().then((res) => {
      setFaqs(res.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const grouped = faqs.reduce((acc, faq) => {
    const cat = faq.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(faq);
    return acc;
  }, {});

  const filtered = {};
  Object.keys(grouped).forEach((cat) => {
    const items = grouped[cat].filter(
      (f) =>
        f.question.toLowerCase().includes(search.toLowerCase()) ||
        f.answer.toLowerCase().includes(search.toLowerCase())
    );
    if (items.length > 0) filtered[cat] = items;
  });

  const categories = Object.keys(filtered);
  let globalIndex = 0;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <MobilePageHeader title="FAQ" className="mb-4 -mx-4 -mt-2" />
          <h1 className="hidden md:block text-3xl font-bold text-text mb-2">Frequently Asked Questions</h1>
          <p className="text-gray-500 mb-6">Find answers to common questions about our products and services.</p>

          <div className="relative mb-8">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search FAQs..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setOpenIndex(null); }}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-lg font-medium">No FAQs found</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          ) : (
            categories.map((category) => (
              <div key={category} className="mb-8">
                <h2 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
                  <span className="w-1 h-5 bg-gold rounded-full" />
                  {category}
                </h2>
                <div className="space-y-3">
                  {filtered[category].map((faq) => {
                    const idx = globalIndex++;
                    return (
                      <div
                        key={faq.id}
                        className="border border-gray-100 rounded-xl overflow-hidden"
                      >
                        <button
                          onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                        >
                          <span className="font-medium text-text pr-4">{faq.question}</span>
                          <ChevronDown
                            className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${
                              openIndex === idx ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        {openIndex === idx && (
                          <div className="px-5 pb-4 text-gray-600 text-sm leading-relaxed">
                            {faq.answer}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default FAQPage;
