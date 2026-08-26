import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] bg-ivory flex items-center justify-center py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-7xl font-bold text-gold mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-text mb-2">Page Not Found</h2>
        <p className="text-gray-500 mb-8 max-w-md">
          Sorry, the page you are looking for does not exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 border border-gray-300 rounded-lg text-text font-medium hover:bg-gray-50 transition"
          >
            Go Back
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gold text-white rounded-lg font-bold hover:bg-opacity-90 transition"
          >
            Back to Home
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFoundPage;
