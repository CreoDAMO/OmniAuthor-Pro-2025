import { Client, Charge } from '@coinbase/coinbase-commerce-node';
import { logger } from '../utils/logger'; // Assuming a Winston logger from winston dependency

// Initialize Coinbase Commerce client
Client.init(process.env.COINBASE_COMMERCE_API_KEY!);

interface CreateChargeInput {
  name: string;
  description: string;
  amount: number;
  currency: string;
  userId: string;
}

export async function createCoinbaseCharge({
  name,
  description,
  amount,
  currency,
  userId,
}: CreateChargeInput): Promise<Charge> {
  try {
    const charge = await Charge.create({
      name,
      description,
      local_price: {
        amount: amount.toFixed(2),
        currency,
      },
      pricing_type: 'fixed_price',
      metadata: {
        userId,
      },
      redirect_url: `${process.env.CLIENT_URL}/payment/success`,
      cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
    });
    logger.info(`Created Coinbase charge ${charge.id} for user ${userId}`);
    return charge;
  } catch (error) {
    logger.error('Failed to create Coinbase charge:', error);
    throw new Error('Unable to create payment charge');
  }
}