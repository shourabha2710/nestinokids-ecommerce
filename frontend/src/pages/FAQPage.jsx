import React, { useState } from 'react';
import MobilePageHeader from '../components/MobilePageHeader';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    q: 'What age groups do you cater to?',
    a: 'We offer clothing for newborns up to age 14, with sizes ranging from 0-3 months to 14 years.',
  },
  {
    q: 'How do I choose the right size?',
    a: 'Please refer to our size guide available on each product page. We recommend measuring your child and comparing with our size chart for the best fit.',
  },
  {
    q: 'What is your shipping policy?',
    a: 'We offer free shipping on orders above ₹500. Standard delivery takes 3-7 business days across India. Express shipping is available at an additional cost.',
  },
  {
    q: 'Do you accept returns?',
    a: 'Yes, we offer easy returns within 7 days of delivery. Items must be unused with tags intact. Please visit our Return Policy page for detailed information.',
  },
  {
    q: 'How can I track my order?',
    a: 'Once your order is shipped, you will receive a tracking link via email and SMS. You can also track your order from the My Orders section in your account.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit/debit cards, UPI, net banking, and digital wallets. All payments are processed securely.',
  },
  {
    q: 'How do I care for the clothing?',
    a: 'We recommend washing our garments in cold water and avoiding harsh detergents to maintain softness and color. Detailed care instructions are on each product tag.',
  },
  {
    q: 'Can I cancel my order?',
    a: 'Orders can be cancelled within 24 hours of placement. After that, the order may already be processed. Please contact our support team for assistance.',
  },
];

const FAQPage = () => {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <MobilePageHeader title="FAQ" className="mb-4 -mx-4 -mt-2" />
          <h1 className="hidden md:block text-3xl font-bold text-text mb-2">Frequently Asked Questions</h1>
          <p className="text-gray-500 mb-8">Find answers to common questions about our products and services.</p>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="border border-gray-100 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-text pr-4">{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${
                      openIndex === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openIndex === index && (
                  <div className="px-5 pb-4 text-gray-600 text-sm leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default FAQPage;
