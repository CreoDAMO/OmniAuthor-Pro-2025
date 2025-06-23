import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Subscription {
  id: string;
  tier: 'FREE' | 'PRO' | 'ENTERPRISE';
  status: 'active' | 'inactive' | 'cancelled';
  expiresAt?: Date;
}

interface SubscriptionContextType {
  subscription: Subscription | null;
  loading: boolean;
  updateSubscription: (subscription: Subscription) => void;
  cancelSubscription: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = (): SubscriptionContextType => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

interface SubscriptionProviderProps {
  children: ReactNode;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load subscription from localStorage or API
    const loadSubscription = async () => {
      try {
        const savedSubscription = localStorage.getItem('subscription');
        if (savedSubscription) {
          setSubscription(JSON.parse(savedSubscription));
        }
      } catch (error) {
        console.error('Failed to load subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSubscription();
  }, []);

  const updateSubscription = (newSubscription: Subscription) => {
    setSubscription(newSubscription);
    localStorage.setItem('subscription', JSON.stringify(newSubscription));
  };

  const cancelSubscription = () => {
    setSubscription(null);
    localStorage.removeItem('subscription');
  };

  const value: SubscriptionContextType = {
    subscription,
    loading,
    updateSubscription,
    cancelSubscription,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
