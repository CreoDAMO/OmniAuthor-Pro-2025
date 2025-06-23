// Mock Coinbase interfaces for testing
interface ChargeData {
  name: string;
  description: string;
  local_price: {
    amount: string;
    currency: string;
  };
  pricing_type: string;
  metadata: { userId: string };
  redirect_url: string;
  cancel_url: string;
}

interface ChargeInput {
  name: string;
  description: string;
  amount: number;
  currency: string;
  userId: string;
}

// Mock Charge class for testing
export const Charge = {
  create: async (data: ChargeData) => {
    // Mock implementation
    return {
      id: 'mock-charge-id',
      code: 'MOCK123',
      ...data,
    };
  },
};

export const createCoinbaseCharge = async (input: ChargeInput) => {
  const { name, description, amount, currency, userId } = input;
  
  const chargeData = {
    name,
    description,
    local_price: {
      amount: amount.toFixed(2),
      currency,
    },
    pricing_type: 'fixed_price',
    metadata: { userId },
    redirect_url: `${process.env.CLIENT_URL}/payment/success`,
    cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
  };

  return await Charge.create(chargeData);
};
