import React from 'react';
import { motion } from 'framer-motion';

const ReturnPolicyPage = () => {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold text-text mb-6">Return & Refund Policy</h1>
          <div className="prose prose-gray max-w-none space-y-4 text-gray-600">
            <p>We want you to be completely satisfied with your purchase. If for any reason you are not, here is how we handle returns and refunds.</p>

            <h2 className="text-xl font-bold text-text mt-8">Return Window</h2>
            <p>You may return any unused item within 7 days of delivery for a full refund or exchange.</p>

            <h2 className="text-xl font-bold text-text mt-8">Conditions for Return</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Items must be unused, unwashed, and in original condition</li>
              <li>All tags must be attached</li>
              <li>Original packaging must be intact</li>
              <li>Personalized or customized items cannot be returned</li>
            </ul>

            <h2 className="text-xl font-bold text-text mt-8">How to Initiate a Return</h2>
            <ol className="list-decimal pl-6 space-y-1">
              <li>Log in to your account and go to My Orders</li>
              <li>Select the order and click "Return"</li>
              <li>Choose the items you wish to return</li>
              <li>Select a reason for return</li>
              <li>Schedule a pickup or self-ship the item</li>
            </ol>

            <h2 className="text-xl font-bold text-text mt-8">Refund Processing</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Refunds are processed within 5-7 business days after we receive the returned item</li>
              <li>Refunds are credited to the original payment method</li>
              <li>Shipping charges are non-refundable unless the return is due to our error</li>
            </ul>

            <h2 className="text-xl font-bold text-text mt-8">Exchanges</h2>
            <p>We offer size exchanges subject to availability. Please initiate a return and place a new order for the desired size.</p>

            <h2 className="text-xl font-bold text-text mt-8">Damaged or Incorrect Items</h2>
            <p>If you received a damaged or incorrect item, please contact us within 48 hours of delivery at support@nestinokids.com with your order number and photos. We will arrange a free replacement or full refund.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ReturnPolicyPage;
