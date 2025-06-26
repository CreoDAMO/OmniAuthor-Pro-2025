import React from 'react';
import { useSubscription } from '../contexts/SubscriptionContext';

const SubscriptionPage: React.FC = () => {
  const { subscription, upgradeSubscription } = useSubscription();

  const plans = [
    {
      name: 'Free',
      price: '$0',
      tier: 'FREE' as const,
      features: ['Basic writing tools', '1 manuscript', 'Community support']
    },
    {
      name: 'Premium',
      price: '$9.99',
      tier: 'PREMIUM' as const,
      features: ['AI writing assistance', 'Unlimited manuscripts', 'Real-time collaboration', 'Priority support']
    },
    {
      name: 'Enterprise',
      price: '$29.99',
      tier: 'ENTERPRISE' as const,
      features: ['All Premium features', 'Blockchain royalties', 'Advanced analytics', 'Custom integrations']
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Subscription Plans
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Choose the plan that's right for you
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.tier}
            className={`card ${
              subscription?.tier === plan.tier
                ? 'ring-2 ring-blue-500 border-blue-500'
                : ''
            }`}
          >
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
              <div className="text-3xl font-bold text-blue-600 mb-4">
                {plan.price}
                {plan.tier !== 'FREE' && <span className="text-sm text-gray-500">/month</span>}
              </div>

              <ul className="space-y-2 mb-6 text-left">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-sm">
                    <span className="text-green-500 mr-2">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              {subscription?.tier === plan.tier ? (
                <button className="btn btn-secondary w-full" disabled>
                  Current Plan
                </button>
              ) : plan.tier === 'FREE' ? (
                <button className="btn btn-secondary w-full" disabled>
                  Downgrade
                </button>
              ) : (
                <button
                  onClick={() => upgradeSubscription(plan.tier)}
                  className="btn btn-primary w-full"
                >
                  Upgrade
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubscriptionPage;