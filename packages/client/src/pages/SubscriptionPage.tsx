import React from 'react';
import { motion } from 'framer-motion';
import { SUBSCRIPTION_PLANS } from '@omniauthor/shared';

const SubscriptionPage: React.FC = () => {
  const plans = Object.values(SUBSCRIPTION_PLANS);

  const handleSubscribe = (planName: string) => {
    // Handle subscription logic here
    console.log(`Subscribing to ${planName} plan`);
  };

  return (
    <motion.div
      className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
            Choose Your Plan
          </h2>
          <p className="mt-4 text-xl text-gray-600 dark:text-gray-400">
            Select the perfect plan for your writing journey
          </p>
        </div>

        <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm divide-y divide-gray-200 dark:divide-gray-700"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  {plan.name}
                </h3>
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                  Perfect for {plan.name === 'Free' ? 'getting started' : plan.name === 'Pro' ? 'serious writers' : 'teams and organizations'}
                </p>
                <p className="mt-8">
                  <span className="text-4xl font-extrabold text-gray-900 dark:text-white">
                    ${plan.price}
                  </span>
                  <span className="text-base font-medium text-gray-500 dark:text-gray-400">
                    /month
                  </span>
                </p>
                <button
                  onClick={() => handleSubscribe(plan.name)}
                  className={`mt-8 block w-full py-2 px-4 border border-transparent rounded-md text-sm font-medium text-center transition-colors ${
                    plan.name === 'Pro'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-800 dark:bg-gray-600 text-white hover:bg-gray-900 dark:hover:bg-gray-700'
                  }`}
                >
                  {plan.name === 'Free' ? 'Current Plan' : 'Subscribe'}
                </button>
              </div>
              <div className="pt-6 pb-8 px-6">
                <h4 className="text-xs font-medium text-gray-900 dark:text-white tracking-wide uppercase">
                  What's included
                </h4>
                <ul className="mt-6 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex space-x-3">
                      <svg
                        className="flex-shrink-0 h-5 w-5 text-green-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default SubscriptionPage;
