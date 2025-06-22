import { Subscription } from '../models/Subscription';
import { SUBSCRIPTION_PLANS } from '@omniauthor/shared';


export const subscriptionMiddleware = async (req: any, res: any, next: any) => {
  if (!req.user) {
    req.subscription = null;
    return next();
  }


  try {
    const subscription = await Subscription.findOne({
      userId: req.user.id,
      status: 'ACTIVE',
    });


    if (subscription) {
      req.subscription = subscription;
    } else {
      // Default to free tier
      req.subscription = {
        tier: 'FREE',
        status: 'ACTIVE',
        features: SUBSCRIPTION_PLANS.FREE.features,
        aiCallsPerDay: SUBSCRIPTION_PLANS.FREE.aiCallsPerDay,
      };
    }


    next();
  } catch (error) {
    req.subscription = null;
    next();
  }
};
