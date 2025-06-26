import React from 'react';
import { Link } from 'react-router-dom';

const PaymentSuccessPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="card max-w-md mx-auto text-center">
        <div className="text-green-500 text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Payment Successful!
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Thank you for your purchase. Your subscription has been activated.
        </p>
        <Link
          to="/dashboard"
          className="btn btn-primary"
        >
          Continue to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;