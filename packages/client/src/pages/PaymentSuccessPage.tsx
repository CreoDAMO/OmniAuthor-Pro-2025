import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { CheckCircleIcon } from '@heroicons/react/outline';
import { toast } from 'react-hot-toast';

const PaymentSuccessPage: React.FC = () => {
  toast.success('Payment completed successfully!', { id: 'payment-success' });

  return (
    <motion.div
      className="payment-success-page p-6 max-w-md mx-auto text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      data-testid="payment-success-page"
    >
      <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
      <h2 className="text-2xl font-semibold mb-4">Payment Successful</h2>
      <p className="text-gray-600 mb-6">
        Your payment has been processed. You can now access premium features or view your transaction
        details in the dashboard.
      </p>
      <Link
        to="/dashboard"
        className="inline-block bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700"
        data-testid="back-to-dashboard-btn"
      >
        Back to Dashboard
      </Link>
    </motion.div>
  );
};

export default PaymentSuccessPage;
