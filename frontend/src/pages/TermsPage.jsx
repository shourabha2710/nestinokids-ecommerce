import React from 'react';
import MobilePageHeader from '../components/MobilePageHeader';
import { motion } from 'framer-motion';

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <MobilePageHeader title="Terms &amp; Conditions" className="mb-4 -mx-4 -mt-2" />
          <h1 className="hidden md:block text-3xl font-bold text-text mb-6">Terms & Conditions</h1>
          <div className="prose prose-gray max-w-none space-y-4 text-gray-600">
            <p>Welcome to NestinoKids. By using our website and services, you agree to the following terms and conditions.</p>

            <h2 className="text-xl font-bold text-text mt-8">Account Registration</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.</p>

            <h2 className="text-xl font-bold text-text mt-8">Product Information</h2>
            <p>We strive to display accurate product descriptions, prices, and images. However, we do not guarantee that colors and details are exact due to screen variations.</p>

            <h2 className="text-xl font-bold text-text mt-8">Pricing</h2>
            <p>All prices are in Indian Rupees (INR) and inclusive of applicable taxes. We reserve the right to modify prices without prior notice.</p>

            <h2 className="text-xl font-bold text-text mt-8">Order Acceptance</h2>
            <p>We reserve the right to refuse or cancel any order for reasons including but not limited to product availability, pricing errors, or suspected fraud.</p>

            <h2 className="text-xl font-bold text-text mt-8">Intellectual Property</h2>
            <p>All content on this website — including text, images, logos, and designs — is the property of NestinoKids and may not be reproduced without permission.</p>

            <h2 className="text-xl font-bold text-text mt-8">Limitation of Liability</h2>
            <p>NestinoKids shall not be liable for any indirect, incidental, or consequential damages arising from the use of our products or services.</p>

            <h2 className="text-xl font-bold text-text mt-8">Governing Law</h2>
            <p>These terms are governed by the laws of India. Any disputes shall be subject to the jurisdiction of courts in New Delhi.</p>

            <h2 className="text-xl font-bold text-text mt-8">Contact</h2>
            <p>For questions about these terms, please contact us at support@nestinokids.com.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TermsPage;
