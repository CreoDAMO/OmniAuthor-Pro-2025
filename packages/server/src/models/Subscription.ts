import mongoose from 'mongoose';

export interface ISubscription {
  userId: string;
  tier: 'FREE' | 'PRO' | 'ENTERPRISE';
  status: 'active' | 'inactive' | 'cancelled';
  stripeSubscriptionId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new mongoose.Schema<ISubscription>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  tier: {
    type: String,
    enum: ['FREE', 'PRO', 'ENTERPRISE'],
    default: 'FREE'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'cancelled'],
    default: 'active'
  },
  stripeSubscriptionId: {
    type: String,
    sparse: true
  },
  currentPeriodStart: {
    type: Date,
    required: true
  },
  currentPeriodEnd: {
    type: Date,
    required: true
  },
  cancelAtPeriodEnd: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

export const Subscription = mongoose.model<ISubscription>('Subscription', subscriptionSchema);
