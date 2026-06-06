import React from 'react';
import { motion } from 'framer-motion';

const ShippingPolicyPage = () => {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold text-text mb-6">Shipping Policy</h1>
          <div className="prose prose-gray max-w-none space-y-4 text-gray-600">
            <p>At NestinoKids, we strive to deliver your orders quickly and safely. Please review our shipping policy below.</p>

            <h2 className="text-xl font-bold text-text mt-8">Shipping Coverage</h2>
            <p>We ship to all states and union territories across India.</p>

            <h2 className="text-xl font-bold text-text mt-8">Shipping Charges</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Free shipping on all orders above ₹500</li>
              <li>Standard shipping: ₹50 for orders below ₹500</li>
              <li>Express shipping: Available at additional cost (calculated at checkout)</li>
            </ul>

            <h2 className="text-xl font-bold text-text mt-8">Delivery Timeframes</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Metro cities: 3-5 business days</li>
              <li>Tier 2 & 3 cities: 5-7 business days</li>
              <li>Remote areas: 7-10 business days</li>
            </ul>

            <h2 className="text-xl font-bold text-text mt-8">Order Tracking</h2>
            <p>Once your order is shipped, you will receive a tracking ID via email and SMS. You can track your order in real-time through the link provided.</p>

            <h2 className="text-xl font-bold text-text mt-8">Shipping Partners</h2>
            <p>We partner with leading logistics providers including India Post, Delhivery, and Shiprocket to ensure reliable delivery.</p>

            <h2 className="text-xl font-bold text-text mt-8">Delayed Orders</h2>
            <p>If your order is delayed beyond the estimated time, please contact our support team at support@nestinokids.com with your order number.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ShippingPolicyPage;
