export const BLOCKCHAIN_CONFIG = {
  POLYGON_WALLET: '0xCc380FD8bfbdF0c020de64075b86C84c2BB0AE79',
  BASE_WALLET: '0xCc380FD8bfbdF0c020de64075b86C84c2BB0AE79',
  SOLANA_WALLET: '3E8keZHkH1AHvRfbmq44tEmBgJYz1NjkhBE41C4gJHUn',
  PLATFORM_FEE: 5, // 5%
};


export const SUBSCRIPTION_PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    features: ['5K words/month', 'Basic AI suggestions', '1 manuscript'],
    aiCallsPerDay: 10,
  },
  PRO: {
    name: 'Pro',
    price: 15,
    features: ['Unlimited words', 'Advanced AI modes', 'Unlimited manuscripts', 'Collaboration'],
    aiCallsPerDay: -1, // Unlimited
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 50,
    features: ['Everything in Pro', 'Priority support', 'Custom integrations', 'White-label'],
    aiCallsPerDay: -1,
  },
};


export const ROYALTY_RATES = {
  KDP: { ebook: 0.7, paperback: 0.6, hardcover: 0.6 },
  NEURAL_BOOKS: { ebook: 0.85, paperback: 0.75, hardcover: 0.75 },
  INGRAMSPARK: { ebook: 0.7, paperback: 0.6, hardcover: 0.6 },
};
