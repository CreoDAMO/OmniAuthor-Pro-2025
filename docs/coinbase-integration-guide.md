# Coinbase Integration Guide

This guide covers the comprehensive Coinbase integration implemented in OmniAuthor Pro 2025, including Commerce, OnchainKit, AgentKit, and Base Appchains support.

## Overview

The integration includes:
- **Coinbase Commerce**: Payment processing with cryptocurrency
- **OnchainKit**: Blockchain operations and wallet connectivity
- **AgentKit**: AI-powered blockchain interactions
- **Base Appchains**: Scalable blockchain operations
- **Bundler and Paymaster**: Gas optimization

## Environment Variables

### Required Environment Variables

Add these to your `.env` files:

```bash
# Coinbase Commerce (Payment Processing)
COINBASE_COMMERCE_API_KEY=your_commerce_api_key
COINBASE_COMMERCE_WEBHOOK_SECRET=your_webhook_secret

# Coinbase Developer Platform
COINBASE_API_KEY=your_cdp_api_key
CDP_API_KEY_NAME=your_cdp_api_key_name
CDP_PRIVATE_KEY=your_cdp_private_key
CDP_NETWORK_ID=base-mainnet

# RPC URLs
BASE_RPC_URL=https://mainnet.base.org
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/your_key

# Frontend Environment Variables
VITE_COINBASE_API_KEY=your_frontend_api_key
VITE_COINBASE_REDIRECT_URL=https://your-domain.com/payment/success
VITE_COINBASE_CANCEL_URL=https://your-domain.com/payment/cancel
```

## Backend Integration

### 1. Coinbase Commerce Service

The `coinbaseService.ts` provides:
- Charge creation and management
- Webhook verification
- Payment status tracking

```typescript
import { createCoinbaseCharge, verifyWebhookSignature } from '../services/coinbase';

// Create a payment charge
const charge = await createCoinbaseCharge({
  name: 'Premium Subscription',
  description: 'Monthly premium subscription',
  amount: 29.99,
  currency: 'USD',
  userId: 'user123',
  subscriptionId: 'sub456'
});
```

### 2. OnchainKit Service

The `onchainService.ts` provides:
- Token swaps
- NFT minting
- Balance queries
- Transaction status tracking

```typescript
import { onchainService } from '../services/onchainService';

// Build a swap transaction
const swapResult = await onchainService.buildSwap({
  fromAddress: '0x...',
  toAddress: '0x...',
  fromToken: '0x...',
  toToken: '0x...',
  amount: '1000000000000000000', // 1 ETH in wei
  slippage: 0.5
});
```

### 3. AgentKit Service

The `agentKitService.ts` provides:
- AI-powered blockchain operations
- Natural language transaction processing
- Smart contract deployment

```typescript
import { agentKitService } from '../services/agentKitService';

// Execute natural language command
const result = await agentKitService.executeNaturalLanguageCommand(
  'Transfer 0.1 ETH to 0x742d35Cc6634C0532925a3b8D4C9db96c4b4d8b'
);

// Execute specific action
const actionResult = await agentKitService.executeAction({
  type: 'deploy_contract',
  parameters: {
    contractType: 'ERC721',
    name: 'OmniAuthor NFTs',
    symbol: 'OMNFT'
  },
  description: 'Deploy NFT contract for digital rights'
});
```

## Frontend Integration

### 1. OnchainKit Provider Setup

Wrap your app with the OnchainProvider:

```tsx
import { OnchainProvider } from './components/Coinbase/OnchainProvider';

function App() {
  return (
    <OnchainProvider>
      <YourAppContent />
    </OnchainProvider>
  );
}
```

### 2. Wallet Connection

Use the WalletConnect component:

```tsx
import { WalletConnect } from './components/Coinbase/WalletConnect';

function Header() {
  return (
    <header className="flex justify-between items-center p-4">
      <h1>OmniAuthor Pro</h1>
      <WalletConnect />
    </header>
  );
}
```

### 3. Payment Integration

```tsx
import { useState } from 'react';

function SubscriptionPage() {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/payments/create-charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Premium Subscription',
          amount: 29.99,
          currency: 'USD'
        })
      });
      
      const { hosted_url } = await response.json();
      window.location.href = hosted_url;
    } catch (error) {
      console.error('Payment failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handlePayment} 
      disabled={loading}
      className="bg-blue-500 text-white px-4 py-2 rounded"
    >
      {loading ? 'Processing...' : 'Pay with Crypto'}
    </button>
  );
}
```

## API Endpoints

### Payment Endpoints

```typescript
// POST /api/payments/create-charge
app.post('/api/payments/create-charge', async (req, res) => {
  try {
    const { name, description, amount, currency } = req.body;
    const userId = req.user.id;
    
    const charge = await createCoinbaseCharge({
      name,
      description,
      amount,
      currency,
      userId
    });
    
    res.json(charge);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/coinbase/webhook
app.post('/api/coinbase/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-cc-webhook-signature'];
  const rawBody = req.body.toString();
  
  if (!verifyWebhookSignature(rawBody, signature)) {
    return res.status(400).send('Invalid signature');
  }
  
  const event = parseWebhookEvent(rawBody, signature);
  
  // Handle payment events
  switch (event.type) {
    case 'charge:confirmed':
      // Payment confirmed
      break;
    case 'charge:failed':
      // Payment failed
      break;
  }
  
  res.status(200).send('OK');
});
```

### Blockchain Endpoints

```typescript
// POST /api/blockchain/swap
app.post('/api/blockchain/swap', async (req, res) => {
  try {
    const result = await onchainService.buildSwap(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/blockchain/agent-command
app.post('/api/blockchain/agent-command', async (req, res) => {
  try {
    const { command } = req.body;
    const result = await agentKitService.executeNaturalLanguageCommand(command);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Security Considerations

### 1. Webhook Verification

Always verify webhook signatures:

```typescript
const isValid = verifyWebhookSignature(rawBody, signature);
if (!isValid) {
  throw new Error('Invalid webhook signature');
}
```

### 2. Environment Variables

- Never expose private keys in frontend code
- Use different API keys for development and production
- Rotate keys regularly

### 3. Rate Limiting

Implement rate limiting for blockchain operations:

```typescript
import rateLimit from 'express-rate-limit';

const blockchainLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many blockchain requests'
});

app.use('/api/blockchain', blockchainLimiter);
```

## Testing

### 1. Unit Tests

```typescript
import { createCoinbaseCharge } from '../services/coinbase';

describe('Coinbase Service', () => {
  it('should create a charge', async () => {
    const charge = await createCoinbaseCharge({
      name: 'Test Charge',
      description: 'Test Description',
      amount: 10,
      currency: 'USD',
      userId: 'test-user'
    });
    
    expect(charge.id).toBeDefined();
    expect(charge.hosted_url).toBeDefined();
  });
});
```

### 2. Integration Tests

```typescript
describe('Payment Flow', () => {
  it('should handle complete payment flow', async () => {
    // Create charge
    const charge = await request(app)
      .post('/api/payments/create-charge')
      .send({
        name: 'Test Payment',
        amount: 10,
        currency: 'USD'
      });
    
    expect(charge.status).toBe(200);
    
    // Simulate webhook
    const webhook = await request(app)
      .post('/api/coinbase/webhook')
      .set('x-cc-webhook-signature', 'valid-signature')
      .send({
        type: 'charge:confirmed',
        data: { id: charge.body.id }
      });
    
    expect(webhook.status).toBe(200);
  });
});
```

## Monitoring and Logging

### 1. Payment Monitoring

```typescript
import { logger } from '../utils/logger';

// Log all payment events
app.post('/api/coinbase/webhook', (req, res) => {
  const event = parseWebhookEvent(req.body, req.headers['x-cc-webhook-signature']);
  
  logger.info('Coinbase webhook received', {
    eventType: event.type,
    chargeId: event.data.id,
    timestamp: new Date().toISOString()
  });
});
```

### 2. Blockchain Monitoring

```typescript
// Monitor blockchain transactions
const monitorTransaction = async (txHash: string) => {
  const status = await onchainService.getTransactionStatus(txHash);
  
  logger.info('Transaction status', {
    txHash,
    status: status.status,
    blockNumber: status.blockNumber,
    gasUsed: status.gasUsed
  });
};
```

## Troubleshooting

### Common Issues

1. **Webhook Verification Fails**
   - Check webhook secret configuration
   - Ensure raw body is used for verification
   - Verify signature header name

2. **OnchainKit Connection Issues**
   - Verify API key configuration
   - Check network configuration
   - Ensure proper chain setup

3. **AgentKit Initialization Fails**
   - Verify CDP credentials
   - Check network permissions
   - Ensure proper wallet configuration

### Debug Mode

Enable debug logging:

```typescript
// Set environment variable
DEBUG=coinbase:*,onchainkit:*,agentkit:*

// Or in code
logger.level = 'debug';
```

## Production Deployment

### 1. Environment Setup

```bash
# Production environment variables
NODE_ENV=production
COINBASE_COMMERCE_API_KEY=live_api_key
CDP_NETWORK_ID=base-mainnet
```

### 2. Health Checks

```typescript
app.get('/health/coinbase', async (req, res) => {
  try {
    // Test Coinbase Commerce connection
    await Client.init(process.env.COINBASE_COMMERCE_API_KEY);
    
    // Test OnchainKit connection
    const walletInfo = await agentKitService.getWalletInfo();
    
    res.json({
      status: 'healthy',
      coinbase: 'connected',
      onchainkit: 'connected',
      agentkit: walletInfo ? 'connected' : 'disconnected'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

## Support and Resources

- [Coinbase Commerce Documentation](https://docs.cloud.coinbase.com/commerce/docs)
- [OnchainKit Documentation](https://onchainkit.xyz)
- [AgentKit Documentation](https://docs.cdp.coinbase.com/agentkit/docs)
- [Base Documentation](https://docs.base.org)

For additional support, check the GitHub issues or contact the development team.
