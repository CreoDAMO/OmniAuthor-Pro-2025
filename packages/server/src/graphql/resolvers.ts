import { AuthenticationError, ForbiddenError, UserInputError } from 'apollo-server-express';
import { withFilter } from 'graphql-subscriptions';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PubSub } from 'graphql-subscriptions';


import { User } from '../models/User';
import { Manuscript } from '../models/Manuscript';
import { Paragraph } from '../models/Paragraph';
import { Subscription as UserSubscription } from '../models/Subscription';
import { BlockchainTransaction } from '../models/BlockchainTransaction';
import { aiService } from '../services/aiService';
import { blockchainService } from '../services/blockchainService';
import { subscriptionService } from '../services/subscriptionService';
import { emailService } from '../services/emailService';
import { analyticsService } from '../services/analyticsService';
import { logger } from '../utils/logger';
import { validateInput } from '../utils/validation';
import { SUBSCRIPTION_PLANS, ROYALTY_RATES, BLOCKCHAIN_CONFIG } from '@omniauthor/shared';


const pubsub = new PubSub();


export const resolvers = {
  Query: {
    me: async (_: any, __: any, { user }: { user: any }) => {
      if (!user) throw new AuthenticationError('Must be authenticated');
      return await User.findById(user.id).populate('manuscripts');
    },


    manuscript: async (_: any, { id }: { id: string }, { user }: { user: any }) => {
      if (!user) throw new AuthenticationError('Must be authenticated');
      
      const manuscript = await Manuscript.findById(id)
        .populate('collaborators.user')
        .populate('paragraphs');
        
      if (!manuscript) throw new UserInputError('Manuscript not found');
      
      const hasAccess = manuscript.collaborators.some(
        (collab: any) => collab.userId === user.id
      );
      
      if (!hasAccess) throw new ForbiddenError('Access denied');
      
      return manuscript;
    },


    manuscripts: async (_: any, __: any, { user }: { user: any }) => {
      if (!user) throw new AuthenticationError('Must be authenticated');
      
      return await Manuscript.find({
        'collaborators.userId': user.id
      }).populate('collaborators.user');
    },


    paragraphs: async (_: any, { manuscriptId }: { manuscriptId: string }, { user }: { user: any }) => {
      if (!user) throw new AuthenticationError('Must be authenticated');
      
      const manuscript = await Manuscript.findById(manuscriptId);
      if (!manuscript) throw new UserInputError('Manuscript not found');
      
      return await Paragraph.find({ manuscriptId }).sort({ timestamp: 1 });
    },


    aiAnalysis: async (_: any, { manuscriptId, text }: { manuscriptId: string; text: string }, { user }: { user: any }) => {
      if (!user) throw new AuthenticationError('Must be authenticated');
      
      const userSubscription = await subscriptionService.getUserSubscription(user.id);
      const canUseAI = await subscriptionService.checkAIUsageLimit(user.id, userSubscription.tier);
      
      if (!canUseAI) {
        throw new ForbiddenError('AI usage limit exceeded. Please upgrade your subscription.');
      }
      
      const analysis = await aiService.analyzeText(text, manuscriptId);
      await analyticsService.trackAIUsage(user.id, 'analysis');
      
      return analysis;
    },


    calculateRoyalties: async (_: any, { input }: { input: any }) => {
      const { platform, format, price, pageCount, genre } = input;
      
      const baseRate = ROYALTY_RATES[platform.toUpperCase()][format.toLowerCase()];
      if (!baseRate) throw new UserInputError('Invalid platform or format');
      
      const platformFee = platform === 'NEURAL_BOOKS' ? price * (BLOCKCHAIN_CONFIG.PLATFORM_FEE / 100) : 0;
      const authorEarnings = (price * baseRate) - platformFee;
      
      return {
        platform,
        format,
        price,
        royaltyRate: baseRate,
        platformFee,
        authorEarnings,
        projections: {
          monthly: {
            conservative: authorEarnings * 50,
            moderate: authorEarnings * 150,
            optimistic: authorEarnings * 400,
          },
          annual: {
            conservative: authorEarnings * 600,
            moderate: authorEarnings * 1800,
            optimistic: authorEarnings * 4800,
          },
        },
      };
    },


    blockchainTransactions: async (_: any, __: any, { user }: { user: any }) => {
      if (!user) throw new AuthenticationError('Must be authenticated');
      
      return await BlockchainTransaction.find({ userId: user.id }).sort({ createdAt: -1 });
    },


    subscription: async (_: any, __: any, { user }: { user: any }) => {
      if (!user) throw new AuthenticationError('Must be authenticated');
      
      return await UserSubscription.findOne({ userId: user.id, status: 'ACTIVE' });
    },
  },


  Mutation: {
    register: async (_: any, { input }: { input: any }) => {
      const { email, password, name } = input;
      
      const validation = validateInput(input, ['email', 'password', 'name']);
      if (!validation.isValid) throw new UserInputError(validation.errors.join(', '));
      
      const existingUser = await User.findOne({ email });
      if (existingUser) throw new UserInputError('User already exists');
      
      const hashedPassword = await bcrypt.hash(password, 12);
      
      const user = new User({
        email,
        password: hashedPassword,
        name,
        subscriptionTier: 'FREE',
      });
      
      await user.save();
      
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );
      
      // Send welcome email
      await emailService.sendWelcomeEmail(email, name);
      
      // Track registration
      await analyticsService.trackUserRegistration(user.id);
      
      logger.info(`New user registered: ${email}`);
      
      return { token, user, subscription: null };
    },


    login: async (_: any, { input }: { input: any }) => {
      const { email, password } = input;
      
      const user = await User.findOne({ email });
      if (!user) throw new AuthenticationError('Invalid credentials');
      
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) throw new AuthenticationError('Invalid credentials');
      
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );
      
      const subscription = await UserSubscription.findOne({ 
        userId: user.id, 
        status: 'ACTIVE' 
      });
      
      // Track login
      await analyticsService.trackUserLogin(user.id);
      
      return { token, user, subscription };
    },


    createManuscript: async (_: any, { input }: { input: any }, { user }: { user: any }) => {
      if (!user) throw new AuthenticationError('Must be authenticated');
      
      const { title, genre, description } = input;
      
      const manuscript = new Manuscript({
        title,
        genre,
        description,
        wordCount: 0,
        progress: 0,
        collaborators: [{
          userId: user.id,
          role: 'AUTHOR',
          permissions: ['read', 'write', 'admin'],
          royaltyShare: 100,
        }],
        rightsSecured: false,
      });
      
      await manuscript.save();
      
      // Track manuscript creation
      await analyticsService.trackManuscriptCreation(user.id, manuscript.id);
      
      logger.info(`Manuscript created: ${manuscript.id} by user: ${user.id}`);
      
      return manuscript;
    },


    addParagraph: async (_: any, { input }: { input: any }, { user }: { user: any }) => {
      if (!user) throw new AuthenticationError('Must be authenticated');
      
      const { manuscriptId, text, source, aiPrompt } = input;
      
      const manuscript = await Manuscript.findById(manuscriptId);
      if (!manuscript) throw new UserInputError('Manuscript not found');
      
      const hasWriteAccess = manuscript.collaborators.some(
        (collab: any) => collab.userId === user.id && collab.permissions.includes('write')
      );
      
      if (!hasWriteAccess) throw new ForbiddenError('Write access denied');
      
      const paragraph = new Paragraph({
        manuscriptId,
        text,
        source,
        aiPrompt,
        authorId: user.id,
        timestamp: new Date(),
      });
      
      await paragraph.save();
      
      // Update manuscript word count
      const wordCount = text.split(' ').length;
      await Manuscript.findByIdAndUpdate(manuscriptId, {
        $inc: { wordCount },
        $set: { updatedAt: new Date() },
      });
      
      // Publish to subscriptions
      pubsub.publish(`PARAGRAPH_ADDED_${manuscriptId}`, {
        paragraphAdded: paragraph,
      });
      
      // Track writing activity
      await analyticsService.trackWritingActivity(user.id, manuscriptId, wordCount);
      
      return paragraph;
    },


    generateAISuggestion: async (_: any, { input }: { input: any }, { user }: { user: any }) => {
      if (!user) throw new AuthenticationError('Must be authenticated');
      
      const userSubscription = await subscriptionService.getUserSubscription(user.id);
      const canUseAI = await subscriptionService.checkAIUsageLimit(user.id, userSubscription.tier);
      
      if (!canUseAI) {
        throw new ForbiddenError('AI usage limit exceeded. Please upgrade your subscription.');
      }
      
      const { manuscriptId, context, type, previousParagraphs } = input;
      
      const suggestion = await aiService.generateSuggestion({
        manuscriptId,
        context,
        type,
        previousParagraphs,
        userId: user.id,
      });
      
      await analyticsService.trackAIUsage(user.id, 'suggestion');
      
      return suggestion;
    },


    secureRights: async (_: any, { manuscriptId, chain }: { manuscriptId: string; chain: string }, { user }: { user: any }) => {
      if (!user) throw new AuthenticationError('Must be authenticated');
      
      const manuscript = await Manuscript.findById(manuscriptId);
      if (!manuscript) throw new UserInputError('Manuscript not found');
      
      const isOwner = manuscript.collaborators.some(
        (collab: any) => collab.userId === user.id && collab.role === 'AUTHOR'
      );
      
      if (!isOwner) throw new ForbiddenError('Only authors can secure rights');
      
      if (manuscript.rightsSecured) {
        throw new UserInputError('Rights already secured for this manuscript');
      }
      
      const transaction = await blockchainService.registerRights({
        manuscriptId,
        userId: user.id,
        chain,
        title: manuscript.title,
        collaborators: manuscript.collaborators,
      });
      
      await Manuscript.findByIdAndUpdate(manuscriptId, {
        rightsSecured: true,
        blockchainTxHash: transaction.txHash,
      });
      
      logger.info(`Rights secured for manuscript: ${manuscriptId} on ${chain}`);
      
      return transaction;
    },


    processRoyaltyPayout: async (_: any, { input }: { input: any }, { user }: { user: any }) => {
      if (!user) throw new AuthenticationError('Must be authenticated');
      
      const { manuscriptId, amount, chain, recipientAddress } = input;
      
      const manuscript = await Manuscript.findById(manuscriptId);
      if (!manuscript) throw new UserInputError('Manuscript not found');
      
      const collaborator = manuscript.collaborators.find(
        (collab: any) => collab.userId === user.id
      );
      
      if (!collaborator) throw new ForbiddenError('Not a collaborator');
      
      const transaction = await blockchainService.processRoyaltyPayout({
        manuscriptId,
        userId: user.id,
        amount,
        chain,
        recipientAddress,
        royaltyShare: collaborator.royaltyShare,
      });
      
      logger.info(`Royalty payout processed: ${transaction.txHash}`);
      
      return transaction;
    },


    createSubscription: async (_: any, { tier }: { tier: string }, { user }: { user: any }) => {
      if (!user) throw new AuthenticationError('Must be authenticated');
      
      const existingSubscription = await UserSubscription.findOne({
        userId: user.id,
        status: 'ACTIVE',
      });
      
      if (existingSubscription) {
        throw new UserInputError('Active subscription already exists');
      }
      
      const subscription = await subscriptionService.createSubscription(user.id, tier);
      
      // Update user subscription tier
      await User.findByIdAndUpdate(user.id, { subscriptionTier: tier });
      
      logger.info(`Subscription created: ${subscription.id} for user: ${user.id}`);
      
      return subscription;
    },


    inviteCollaborator: async (_: any, { input }: { input: any }, { user }: { user: any }) => {
      if (!user) throw new AuthenticationError('Must be authenticated');
      
      const { manuscriptId, email, role, royaltyShare } = input;
      
      const manuscript = await Manuscript.findById(manuscriptId);
      if (!manuscript) throw new UserInputError('Manuscript not found');
      
      const isOwner = manuscript.collaborators.some(
        (collab: any) => collab.userId === user.id && collab.role === 'AUTHOR'
      );
      
      if (!isOwner) throw new ForbiddenError('Only authors can invite collaborators');
      
      const invitedUser = await User.findOne({ email });
      if (!invitedUser) throw new UserInputError('User not found');
      
      const existingCollaborator = manuscript.collaborators.find(
        (collab: any) => collab.userId === invitedUser.id
      );
      
      if (existingCollaborator) {
        throw new UserInputError('User is already a collaborator');
      }
      
      const collaborator = {
        userId: invitedUser.id,
        role,
        permissions: role === 'AUTHOR' ? ['read', 'write', 'admin'] : ['read', 'write'],
        royaltyShare,
      };
      
      await Manuscript.findByIdAndUpdate(manuscriptId, {
        $push: { collaborators: collaborator },
      });
      
      // Send invitation email
      await emailService.sendCollaborationInvite(email, manuscript.title, user.name);
      
      logger.info(`Collaborator invited: ${email} to manuscript: ${manuscriptId}`);
      
      return collaborator;
    },
  },


  Subscription: {
    paragraphAdded: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['PARAGRAPH_ADDED']),
        (payload, variables) => {
          return payload.paragraphAdded.manuscriptId === variables.manuscriptId;
        }
      ),
    },


    manuscriptUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['MANUSCRIPT_UPDATED']),
        (payload, variables) => {
          return payload.manuscriptUpdated.id === variables.manuscriptId;
        }
      ),
    },


    collaboratorActivity: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['COLLABORATOR_ACTIVITY']),
        (payload, variables) => {
          return payload.collaboratorActivity.manuscriptId === variables.manuscriptId;
        }
      ),
    },
  },


  // Field resolvers
  User: {
    manuscripts: async (parent: any) => {
      return await Manuscript.find({
        'collaborators.userId': parent.id
      });
    },
    
    usageStats: async (parent: any) => {
      return await analyticsService.getUserStats(parent.id);
    },
  },


  Manuscript: {
    paragraphs: async (parent: any) => {
      return await Paragraph.find({ manuscriptId: parent.id }).sort({ timestamp: 1 });
    },
    
    collaborators: async (parent: any) => {
      const collaborators = [];
      for (const collab of parent.collaborators) {
        const user = await User.findById(collab.userId);
        collaborators.push({
          ...collab.toObject(),
          user,
        });
      }
      return collaborators;
    },
  },
};
