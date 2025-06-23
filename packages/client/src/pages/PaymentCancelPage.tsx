import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { XCircleIcon } from '@heroicons/react/outline';
import { toast } from 'react-hot-toast';

const PaymentCancelPage: React.FC = () => {
  toast.error('Payment was cancelled.', { id: 'payment-cancel' });

  return (
    <motion.div
      className="payment-cancel-page p-6 max-w-md mx-auto text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      data-testid="payment-cancel-page"
    >
      <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
      <h2 className="text-2xl font-semibold mb-4">Payment Cancelled</h2>
      <p className="text-gray-600 mb-6">
        Your payment was not completed. Please try again or contact support if you need assistance.
      </p>
      <Link
        to="/subscription"
        className="inline-block bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700"
        data-testid="try-again-btn"
      >
        Try Again
      </Link>
    </motion.div>
  );
};

export default PaymentCancelPage;