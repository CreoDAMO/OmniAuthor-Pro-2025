import mongoose from 'mongoose';

export interface IBlockchainTransaction {
  userId: string;
  transactionHash: string;
  blockchain: 'ethereum' | 'solana' | 'polygon';
  type: 'payment' | 'royalty' | 'mint' | 'transfer';
  amount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber?: number;
  gasUsed?: number;
  gasFee?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const blockchainTransactionSchema = new mongoose.Schema<IBlockchainTransaction>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  transactionHash: {
    type: String,
    required: true,
    unique: true
  },
  blockchain: {
    type: String,
    enum: ['ethereum', 'solana', 'polygon'],
    required: true
  },
  type: {
    type: String,
    enum: ['payment', 'royalty', 'mint', 'transfer'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'failed'],
    default: 'pending'
  },
  blockNumber: {
    type: Number
  },
  gasUsed: {
    type: Number
  },
  gasFee: {
    type: Number
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

export const BlockchainTransaction = mongoose.model<IBlockchainTransaction>('BlockchainTransaction', blockchainTransactionSchema);
