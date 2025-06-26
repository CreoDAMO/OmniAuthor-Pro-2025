import React from 'react';
import { Link } from 'react-router-dom';

const PaymentCancelPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="card max-w-md mx-auto text-center">
        <div className="text-yellow-500 text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Payment Cancelled
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Your payment was cancelled. You can try again anytime.
        </p>
        <div className="space-y-3">
          <Link
            to="/subscription"
            className="btn btn-primary w-full justify-center"
          >
            Try Again
          </Link>
          <Link
            to="/dashboard"
            className="btn btn-secondary w-full justify-center"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancelPage;