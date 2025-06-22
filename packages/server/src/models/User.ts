import mongoose from 'mongoose';
import { User } from '@omniauthor/shared';


const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  subscriptionTier: {
    type: String,
    enum: ['FREE', 'PRO', 'ENTERPRISE'],
    default: 'FREE',
  },
  walletAddress: {
    type: String,
    sparse: true,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  lastLogin: {
    type: Date,
  },
  preferences: {
    aiMode: {
      type: String,
      default: 'creative-partner',
    },
    defaultGenre: String,
    notifications: {
      email: { type: Boolean, default: true },
      collaboration: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false },
    },
  },
}, {
  timestamps: true,
});


userSchema.index({ email: 1 });
userSchema.index({ subscriptionTier: 1 });


export const User = mongoose.model<User & mongoose.Document>('User', userSchema);
