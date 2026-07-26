import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

const CouponDeleteDialog = ({ coupon, onConfirm, onCancel, deleting }) => (
  <AnimatePresence>
    {coupon && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        onClick={onCancel}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-50 rounded-full">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Delete Coupon</h3>
          </div>
          <p className="text-sm text-gray-500 mb-2">
            Are you sure you want to delete coupon <span className="font-mono font-bold">{coupon.code}</span>?
          </p>
          <p className="text-sm text-gray-400 mb-6">This action cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default CouponDeleteDialog;
