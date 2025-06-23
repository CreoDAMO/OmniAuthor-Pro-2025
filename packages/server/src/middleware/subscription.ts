import { Subscription } from '../models/Subscription';
import { SUBSCRIPTION_PLANS } from '@omniauthor/shared';
import { logger } from '../utils/logger';
import { Counter, Histogram } from 'prom-client';

// Prometheus metrics
const subscriptionChecks = new Counter({
  name: 'subscription_checks_total',
  help: 'Total number of subscription checks',
  labelNames: ['status', 'tier'],
});

const subscriptionDuration = new Histogram({
  name: 'subscription_check_duration_seconds',
  help: 'Duration of subscription checks in seconds',
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
});

// Define interfaces for type safety
interface SubscriptionData {
  userId: string;
  tier: string;
  status: string;
  features: string[];
  aiCallsPerDay: number;
  coinbaseEnabled?: boolean; // Added for Coinbase payments
}

interface SubscriptionRequest {
  user?: {
    id: string;
    email: string;
    coinbaseCustomerId?: string;
  } | null;
  subscription?: SubscriptionData | null;
}

// Middleware for subscription checks
export const subscriptionMiddleware = async (req: SubscriptionRequest, res: any, next: any) => {
  const start = Date.now();
  try {
    if (!req.user) {
      subscriptionChecks.inc({ status: 'no_user', tier: 'none' });
      logger.warn('No authenticated user for subscription check', { path: req.path });
      req.subscription = null;
      return res.status(401).json({ error: 'Authentication required for subscription check' });
    }

    const subscription = await Subscription.findOne({
      userId: req.user.id,
      status: 'ACTIVE',
    });

    if (subscription) {
      req.subscription = {
        userId: subscription.userId,
        tier: subscription.tier,
        status: subscription.status,
        features: subscription.features,
        aiCallsPerDay: subscription.aiCallsPerDay,
        coinbaseEnabled: subscription.tier !== 'FREE', // Coinbase enabled for non-FREE tiers
      };
      subscriptionChecks.inc({ status: 'success', tier: subscription.tier });
      logger.info('Subscription found', { userId: req.user.id, tier: subscription.tier });
    } else {
      req.subscription = {
        userId: req.user.id,
        tier: 'FREE',
        status: 'ACTIVE',
        features: SUBSCRIPTION_PLANS.FREE.features,
        aiCallsPerDay: SUBSCRIPTION_PLANS.FREE.aiCallsPerDay,
        coinbaseEnabled: false,
      };
      subscriptionChecks.inc({ status: 'default_free', tier: 'FREE' });
      logger.info('Assigned default FREE subscription', { userId: req.user.id });
    }

    next();
  } catch (error) {
    subscriptionChecks.inc({ status: 'error', tier: 'none' });
    logger.error('Subscription middleware error', {
      error: error.message,
      stack: error.stack,
      path: req.path,
    });
    req.subscription = null;
    res.status(500).json({ error: 'Failed to verify subscription' });
  } finally {
    subscriptionDuration.observe((Date.now() - start) / 1000);
  }
};