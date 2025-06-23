import mongoose from 'mongoose';
import { logger } from '../utils/logger';

// Hypothetical Payment model
const PaymentSchema = new mongoose.Schema({
  userId: String,
  chargeId: String,
  status: String,
  amount: Number,
  currency: String,
  createdAt: { type: Date, default: Date.now },
});
const Payment = mongoose.model('Payment', PaymentSchema);

export async function updatePaymentStatus(userId: string, chargeId: string, status: string) {
  try {
    const payment = await Payment.findOneAndUpdate(
      { chargeId },
      { userId, chargeId, status },
      { upsert: true, new: true },
    );
    logger.info(`Updated payment ${chargeId} to status ${status} for user ${userId}`);
    return payment;
  } catch (error) {
    logger.error(`Failed to update payment ${chargeId}:`, error);
    throw new Error('Unable to update payment status');
  }
}