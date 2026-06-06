import React from 'react';
import { motion } from 'framer-motion';

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold text-text mb-6">Privacy Policy</h1>
          <div className="prose prose-gray max-w-none space-y-4 text-gray-600">
            <p>At NestinoKids, we take your privacy seriously. This policy describes how we collect, use, and protect your personal information.</p>

            <h2 className="text-xl font-bold text-text mt-8">Information We Collect</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Name, email address, phone number</li>
              <li>Shipping and billing addresses</li>
              <li>Order history and preferences</li>
              <li>Payment information (processed securely by our payment partners)</li>
            </ul>

            <h2 className="text-xl font-bold text-text mt-8">How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>To process and fulfill your orders</li>
              <li>To communicate with you about your orders</li>
              <li>To send promotional offers (with your consent)</li>
              <li>To improve our products and services</li>
            </ul>

            <h2 className="text-xl font-bold text-text mt-8">Data Protection</h2>
            <p>We implement industry-standard security measures to protect your personal information. All payment transactions are encrypted and processed through secure payment gateways.</p>

            <h2 className="text-xl font-bold text-text mt-8">Third-Party Sharing</h2>
            <p>We do not sell, trade, or rent your personal information to third parties. We may share necessary information with shipping partners and payment processors solely for order fulfillment.</p>

            <h2 className="text-xl font-bold text-text mt-8">Your Rights</h2>
            <p>You have the right to access, update, or delete your personal information at any time. You can do this through your account settings or by contacting us.</p>

            <h2 className="text-xl font-bold text-text mt-8">Contact</h2>
            <p>For privacy-related queries, please contact us at support@nestinokids.com.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
