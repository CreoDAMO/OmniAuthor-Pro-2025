import express from 'express';
import { Webhook } from '@coinbase/coinbase-commerce-node';
import { logger } from '../utils/logger';
import { updatePaymentStatus } from '../services/payment'; // Hypothetical service
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Define rate limiter: maximum of 100 requests per 15 minutes
const webhookRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

router.post('/coinbase/webhook', webhookRateLimiter, express.raw({ type: 'application/json' }), async (req, res) => {
  const webhookSecret = process.env.COINBASE_COMMERCE_WEBHOOK_SECRET!;
  const signature = req.headers['x-cc-webhook-signature'] as string;
  const rawBody = req.body;

  try {
    // Verify webhook signature
    const event = Webhook.verifyEventBody(rawBody.toString(), signature, webhookSecret);

    // Handle specific events
    switch (event.type) {
      case 'charge:created':
        logger.info(`Charge created: ${event.data.id}`);
        break;
      case 'charge:confirmed':
        logger.info(`Charge confirmed: ${event.data.id}`);
        await updatePaymentStatus(event.data.metadata.userId, event.data.id, 'confirmed');
        break;
      case 'charge:failed':
        logger.info(`Charge failed: ${event.data.id}`);
        await updatePaymentStatus(event.data.metadata.userId, event.data.id, 'failed');
        break;
      default:
        logger.warn(`Unhandled event type: ${event.type}`);
    }

    res.status(200).send('Webhook received');
  } catch (error) {
    logger.error('Webhook verification failed:', error);
    res.status(400).send('Invalid webhook signature');
  }
});

export default router;