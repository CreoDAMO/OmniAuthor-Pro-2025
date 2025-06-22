export interface User {
  id: string;
  email: string;
  name: string;
  subscriptionTier: 'free' | 'pro' | 'enterprise';
  walletAddress?: string;
  createdAt: Date;
}


export interface Manuscript {
  id: string;
  title: string;
  genre: string;
  wordCount: number;
  progress: number;
  paragraphs: Paragraph[];
  collaborators: Collaborator[];
  rightsSecured: boolean;
  blockchainTxHash?: string;
}


export interface Paragraph {
  id: string;
  text: string;
  source: 'human' | 'ai';
  aiPrompt?: string;
  authorId: string;
  timestamp: Date;
}


export interface Collaborator {
  userId: string;
  role: 'author' | 'editor' | 'beta-reader';
  permissions: string[];
  royaltyShare?: number;
}


export interface RoyaltyCalculation {
  platform: 'kdp' | 'neural-books' | 'ingramspark';
  format: 'ebook' | 'paperback' | 'hardcover' | 'audiobook';
  price: number;
  royaltyRate: number;
  platformFee: number;
  authorEarnings: number;
  projections: {
    monthly: { conservative: number; moderate: number; optimistic: number };
    annual: { conservative: number; moderate: number; optimistic: number };
  };
}


export interface BlockchainConfig {
  polygonWallet: string;
  baseWallet: string;
  solanaWallet: string;
  platformFeePercentage: number;
}


export interface AIAnalysis {
  originality: number;
  voiceMatch: number;
  pacing: number;
  engagement: number;
  suggestions: AISuggestion[];
}


export interface AISuggestion {
  id: string;
  type: 'improve-style' | 'expand-scene' | 'character-development';
  text: string;
  confidence: number;
  reasoning: string;
}
