import mongoose from 'mongoose';
import { Paragraph } from '@omniauthor/shared';


const paragraphSchema = new mongoose.Schema({
  manuscriptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Manuscript',
    required: true,
  },
  text: {
    type: String,
    required: true,
    maxlength: 10000,
  },
  source: {
    type: String,
    enum: ['HUMAN', 'AI'],
    required: true,
  },
  aiPrompt: {
    type: String,
    maxlength: 500,
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  version: {
    type: Number,
    default: 1,
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Paragraph',
  },
  metadata: {
    aiModel: String,
    confidence: Number,
    suggestions: [String],
    emotions: [String],
    topics: [String],
  },
  editHistory: [{
    text: String,
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    editedAt: {
      type: Date,
      default: Date.now,
    },
  }],
}, {
  timestamps: true,
});


paragraphSchema.index({ manuscriptId: 1, timestamp: 1 });
paragraphSchema.index({ authorId: 1 });
paragraphSchema.index({ source: 1 });


export const Paragraph = mongoose.model<Paragraph & mongoose.Document>('Paragraph', paragraphSchema);
