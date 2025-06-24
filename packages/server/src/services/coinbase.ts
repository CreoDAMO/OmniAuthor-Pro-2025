import { Client, Charge, Webhook } from 'coinbase-commerce-node';
import { logger } from '../utils/logger';

// Initialize Coinbase Commerce Client
if (process.env.COINBASE_COMMERCE_API_KEY) {
  Client.init(process.env.COINBASE_COMMERCE_API_KEY);
} else {
  logger.warn('COINBASE_COMMERCE_API_KEY not set, Coinbase Commerce will not work');
}

export interface ChargeInput {
  name: string;
  description: string;
  amount: number;
  currency: string;
  userId: string;
  subscriptionId?: string;
}

export interface CoinbaseChargeResponse {
  id: string;
  code: string;
  name: string;
  description: string;
  hosted_url: string;
  created_at: string;
  expires_at: string;
  timeline: Array<{
    time: string;
    status: string;
  }>;
  metadata: {
    userId: string;
    subscriptionId?: string;
  };
  pricing: {
    local: { amount: string; currency: string };
    settlement: { amount: string; currency: string };
  };
  payments: Array<any>;
  addresses: Record<string, string>;
}

export const createCoinbaseCharge = async (input: ChargeInput): Promise<CoinbaseChargeResponse> => {
  try {
    const { name, description, amount, currency, userId, subscriptionId } = input;
    
    const chargeData = {
      name,
      description,
      local_price: {
        amount: amount.toFixed(2),
        currency: currency.toUpperCase(),
      },
      pricing_type: 'fixed_price' as const,
      metadata: { 
        userId,
        ...(subscriptionId && { subscriptionId })
      },
      redirect_url: `${process.env.CLIENT_URL}/payment/success`,
      cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
    };

    logger.info('Creating Coinbase charge', { chargeData });
    const charge = await Charge.create(chargeData);
    
    logger.info('Coinbase charge created successfully', { chargeId: charge.id });
    return charge as CoinbaseChargeResponse;
  } catch (error) {
    logger.error('Failed to create Coinbase charge', { error, input });
    throw new Error(`Failed to create Coinbase charge: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const retrieveCoinbaseCharge = async (chargeId: string): Promise<CoinbaseChargeResponse> => {
  try {
    logger.info('Retrieving Coinbase charge', { chargeId });
    const charge = await Charge.retrieve(chargeId);
    
    logger.info('Coinbase charge retrieved successfully', { chargeId });
    return charge as CoinbaseChargeResponse;
  } catch (error) {
    logger.error('Failed to retrieve Coinbase charge', { error, chargeId });
    throw new Error(`Failed to retrieve Coinbase charge: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const verifyWebhookSignature = (rawBody: string, signature: string): boolean => {
  try {
    if (!process.env.COINBASE_COMMERCE_WEBHOOK_SECRET) {
      logger.warn('COINBASE_COMMERCE_WEBHOOK_SECRET not set, webhook verification will fail');
      return false;
    }

    const event = Webhook.verifyEventBody(rawBody, signature, process.env.COINBASE_COMMERCE_WEBHOOK_SECRET);
    return !!event;
  } catch (error) {
    logger.error('Webhook signature verification failed', { error });
    return false;
  }
};

export const parseWebhookEvent = (rawBody: string, signature: string) => {
  try {
    if (!process.env.COINBASE_COMMERCE_WEBHOOK_SECRET) {
      throw new Error('COINBASE_COMMERCE_WEBHOOK_SECRET not set');
    }

    const event = Webhook.verifyEventBody(rawBody, signature, process.env.COINBASE_COMMERCE_WEBHOOK_SECRET);
    logger.info('Webhook event parsed successfully', { eventType: event.type, eventId: event.id });
    
    return event;
  } catch (error) {
    logger.error('Failed to parse webhook event', { error });
    throw new Error(`Failed to parse webhook event: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Export the Charge class for backward compatibility and testing
export { Charge };
