import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Subscription {
  tier: 'FREE' | 'PREMIUM' | 'ENTERPRISE';
  status: 'active' | 'inactive' | 'cancelled';
  expiresAt?: Date;
}

interface SubscriptionContextType {
  subscription: Subscription | null;
  upgradeSubscription: (tier: 'PREMIUM' | 'ENTERPRISE') => Promise<void>;
  cancelSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  const [subscription, setSubscription] = useState<Subscription>({
    tier: 'FREE',
    status: 'active'
  });

  const upgradeSubscription = async (tier: 'PREMIUM' | 'ENTERPRISE') => {
    // Mock upgrade - in real app, this would handle payment processing
    setSubscription({
      tier,
      status: 'active',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    });
  };

  const cancelSubscription = async () => {
    setSubscription({
      tier: 'FREE',
      status: 'active'
    });
  };

  return (
    <SubscriptionContext.Provider value={{ subscription, upgradeSubscription, cancelSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = (): SubscriptionContextType => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};