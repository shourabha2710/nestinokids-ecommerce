import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

const PromotionDeleteDialog = ({ promotion, onConfirm, onCancel, deleting }) => {
  if (!promotion) return null;

  return (
    <AnimatePresence>
      {promotion && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 py-4"
          onClick={onCancel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-auto max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div className="min-w-0">
                <h3 id="delete-dialog-title" className="text-lg font-bold text-gray-900">Delete Promotion</h3>
                <p className="text-sm text-gray-500">{promotion.name}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              This action cannot be undone. <span className="font-semibold text-gray-900">{promotion.name}</span> will be permanently removed.
            </p>
            <div className="flex flex-col-reverse sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 justify-end">
              <button
                onClick={onCancel}
                disabled={deleting}
                className="px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all text-sm w-full sm:w-auto disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all text-sm w-full sm:w-auto disabled:opacity-50"
              >
                {deleting ? (
                  <span className="inline-flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </span>
                ) : (
                  'Delete Promotion'
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PromotionDeleteDialog;
