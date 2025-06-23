import mongoose from 'mongoose';
import { Manuscript as ManuscriptType } from '@omniauthor/shared';


const collaboratorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: {
    type: String,
    enum: ['AUTHOR', 'EDITOR', 'BETA_READER'],
    required: true,
  },
  permissions: [{
    type: String,
    enum: ['read', 'write', 'comment', 'admin'],
  }],
  royaltyShare: {
    type: Number,
    min: 0,
    max: 100,
  },
  invitedAt: {
    type: Date,
    default: Date.now,
  },
  acceptedAt: Date,
});


const manuscriptSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  genre: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    maxlength: 1000,
  },
  wordCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  collaborators: [collaboratorSchema],
  rightsSecured: {
    type: Boolean,
    default: false,
  },
  blockchainTxHash: String,
  targetWordCount: {
    type: Number,
    default: 70000,
  },
  status: {
    type: String,
    enum: ['DRAFT', 'EDITING', 'REVIEW', 'PUBLISHED'],
    default: 'DRAFT',
  },
  tags: [String],
  coverImageUrl: String,
  publishedAt: Date,
  royaltySettings: {
    defaultSplit: {
      type: Map,
      of: Number,
    },
    platforms: [{
      name: String,
      royaltyRate: Number,
      enabled: { type: Boolean, default: true },
    }],
  },
}, {
  timestamps: true,
});


manuscriptSchema.index({ 'collaborators.userId': 1 });
manuscriptSchema.index({ genre: 1 });
manuscriptSchema.index({ status: 1 });
manuscriptSchema.index({ createdAt: -1 });


// Virtual for calculating progress
manuscriptSchema.virtual('calculatedProgress').get(function() {
  if (this.targetWordCount === 0) return 0;
  return Math.min((this.wordCount / this.targetWordCount) * 100, 100);
});


export const Manuscript = mongoose.model<ManuscriptType & mongoose.Document>('Manuscript', manuscriptSchema);
