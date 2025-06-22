import { gql } from 'apollo-server-express';


export const typeDefs = gql`
  scalar Date


  type User {
    id: ID!
    email: String!
    name: String!
    subscriptionTier: SubscriptionTier!
    walletAddress: String
    createdAt: Date!
    manuscripts: [Manuscript!]!
    usageStats: UsageStats!
  }


  type UsageStats {
    wordsWritten: Int!
    aiCallsToday: Int!
    manuscriptsCreated: Int!
    collaborations: Int!
  }


  enum SubscriptionTier {
    FREE
    PRO
    ENTERPRISE
  }


  type Manuscript {
    id: ID!
    title: String!
    genre: String!
    wordCount: Int!
    progress: Float!
    paragraphs: [Paragraph!]!
    collaborators: [Collaborator!]!
    rightsSecured: Boolean!
    blockchainTxHash: String
    createdAt: Date!
    updatedAt: Date!
  }


  type Paragraph {
    id: ID!
    text: String!
    source: ParagraphSource!
    aiPrompt: String
    authorId: String!
    timestamp: Date!
  }


  enum ParagraphSource {
    HUMAN
    AI
  }


  type Collaborator {
    userId: String!
    user: User!
    role: CollaboratorRole!
    permissions: [String!]!
    royaltyShare: Float
  }


  enum CollaboratorRole {
    AUTHOR
    EDITOR
    BETA_READER
  }


  type AIAnalysis {
    originality: Float!
    voiceMatch: Float!
    pacing: Float!
    engagement: Float!
    suggestions: [AISuggestion!]!
  }


  type AISuggestion {
    id: ID!
    type: SuggestionType!
    text: String!
    confidence: Float!
    reasoning: String!
  }


  enum SuggestionType {
    IMPROVE_STYLE
    EXPAND_SCENE
    CHARACTER_DEVELOPMENT
    CONTINUE_WRITING
  }


  type RoyaltyCalculation {
    platform: Platform!
    format: BookFormat!
    price: Float!
    royaltyRate: Float!
    platformFee: Float!
    authorEarnings: Float!
    projections: RoyaltyProjections!
  }


  enum Platform {
    KDP
    NEURAL_BOOKS
    INGRAMSPARK
  }


  enum BookFormat {
    EBOOK
    PAPERBACK
    HARDCOVER
    AUDIOBOOK
  }


  type RoyaltyProjections {
    monthly: ProjectionRange!
    annual: ProjectionRange!
  }


  type ProjectionRange {
    conservative: Float!
    moderate: Float!
    optimistic: Float!
  }


  type BlockchainTransaction {
    id: ID!
    txHash: String!
    chain: BlockchainNetwork!
    type: TransactionType!
    amount: Float!
    status: TransactionStatus!
    createdAt: Date!
  }


  enum BlockchainNetwork {
    POLYGON
    BASE
    SOLANA
  }


  enum TransactionType {
    ROYALTY_PAYOUT
    RIGHTS_REGISTRATION
    PLATFORM_FEE
  }


  enum TransactionStatus {
    PENDING
    CONFIRMED
    FAILED
  }


  type Subscription {
    id: ID!
    userId: String!
    tier: SubscriptionTier!
    status: SubscriptionStatus!
    currentPeriodEnd: Date!
    cancelAtPeriodEnd: Boolean!
  }


  enum SubscriptionStatus {
    ACTIVE
    CANCELED
    PAST_DUE
    INCOMPLETE
  }


  type Query {
    me: User!
    manuscript(id: ID!): Manuscript!
    manuscripts: [Manuscript!]!
    paragraphs(manuscriptId: ID!): [Paragraph!]!
    aiAnalysis(manuscriptId: ID!, text: String!): AIAnalysis!
    calculateRoyalties(input: RoyaltyInput!): RoyaltyCalculation!
    blockchainTransactions: [BlockchainTransaction!]!
    subscription: Subscription
  }


  type Mutation {
    # Authentication
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    logout: Boolean!
    
    # Manuscripts
    createManuscript(input: CreateManuscriptInput!): Manuscript!
    updateManuscript(id: ID!, input: UpdateManuscriptInput!): Manuscript!
    deleteManuscript(id: ID!): Boolean!
    
    # Paragraphs
    addParagraph(input: AddParagraphInput!): Paragraph!
    updateParagraph(id: ID!, text: String!): Paragraph!
    deleteParagraph(id: ID!): Boolean!
    
    # AI Features
    generateAISuggestion(input: AIGenerationInput!): AISuggestion!
    applyAISuggestion(suggestionId: ID!, manuscriptId: ID!): Paragraph!
    
    # Collaboration
    inviteCollaborator(input: InviteCollaboratorInput!): Collaborator!
    updateCollaboratorRole(userId: ID!, manuscriptId: ID!, role: CollaboratorRole!): Collaborator!
    removeCollaborator(userId: ID!, manuscriptId: ID!): Boolean!
    
    # Blockchain
    secureRights(manuscriptId: ID!, chain: BlockchainNetwork!): BlockchainTransaction!
    processRoyaltyPayout(input: RoyaltyPayoutInput!): BlockchainTransaction!
    
    # Subscriptions
    createSubscription(tier: SubscriptionTier!): Subscription!
    cancelSubscription: Subscription!
    updatePaymentMethod(paymentMethodId: String!): Boolean!
  }


  type Subscription {
    paragraphAdded(manuscriptId: ID!): Paragraph!
    manuscriptUpdated(manuscriptId: ID!): Manuscript!
    collaboratorActivity(manuscriptId: ID!): CollaboratorActivity!
    aiAnalysisComplete(manuscriptId: ID!): AIAnalysis!
  }


  type CollaboratorActivity {
    userId: String!
    action: String!
    timestamp: Date!
    manuscriptId: String!
  }


  # Input Types
  input RegisterInput {
    email: String!
    password: String!
    name: String!
  }


  input LoginInput {
    email: String!
    password: String!
  }


  input CreateManuscriptInput {
    title: String!
    genre: String!
    description: String
  }


  input UpdateManuscriptInput {
    title: String
    genre: String
    description: String
  }


  input AddParagraphInput {
    manuscriptId: ID!
    text: String!
    source: ParagraphSource!
    aiPrompt: String
  }


  input AIGenerationInput {
    manuscriptId: ID!
    context: String!
    type: SuggestionType!
    previousParagraphs: [String!]
  }


  input InviteCollaboratorInput {
    manuscriptId: ID!
    email: String!
    role: CollaboratorRole!
    royaltyShare: Float
  }


  input RoyaltyInput {
    platform: Platform!
    format: BookFormat!
    price: Float!
    pageCount: Int
    genre: String
  }


  input RoyaltyPayoutInput {
    manuscriptId: ID!
    amount: Float!
    chain: BlockchainNetwork!
    recipientAddress: String!
  }


  type AuthPayload {
    token: String!
    user: User!
    subscription: Subscription
  }
`;
