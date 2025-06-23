import { Subscription, ISubscription } from '../models/Subscription';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2022-11-15',
});

export class SubscriptionService {
  async createSubscription(userId: string, tier: string, stripeCustomerId: string): Promise<ISubscription> {
    const now = new Date();
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const subscription = new Subscription({
      userId,
      tier,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: endDate,
      cancelAtPeriodEnd: false
    });

    return await subscription.save();
  }

  async updateSubscription(subscriptionId: string, updates: Partial<ISubscription>): Promise<ISubscription | null> {
    return await Subscription.findByIdAndUpdate(subscriptionId, updates, { new: true });
  }

  async cancelSubscription(subscriptionId: string): Promise<ISubscription | null> {
    return await Subscription.findByIdAndUpdate(
      subscriptionId,
      { 
        status: 'cancelled',
        cancelAtPeriodEnd: true
      },
      { new: true }
    );
  }

  async getUserSubscription(userId: string): Promise<ISubscription | null> {
    return await Subscription.findOne({ userId, status: { $ne: 'cancelled' } });
  }

  async checkAIUsageLimit(userId: string, tier: string): Promise<boolean> {
    // In a real implementation, you would check usage limits based on tier
    const limits = {
      FREE: 10,
      PRO: 100,
      ENTERPRISE: -1 // unlimited
    };
    
    // For now, just return true for PRO and ENTERPRISE, check limits for FREE
    if (tier === 'ENTERPRISE') return true;
    if (tier === 'PRO') return true;
    
    // For FREE tier, you would check actual usage here
    return true; // Simplified for now
  }

  async handleStripeWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'customer.subscription.created':
        // Handle subscription creation
        break;
      case 'customer.subscription.updated':
        // Handle subscription update
        break;
      case 'customer.subscription.deleted':
        // Handle subscription cancellation
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }
}

export const subscriptionService = new SubscriptionService();
