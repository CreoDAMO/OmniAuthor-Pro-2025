const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'OmniAuthor Pro 2025 Server is running'
  });
});

// Mock Coinbase Commerce endpoint
app.post('/api/payments/create-charge', (req, res) => {
  const { name, description, amount, currency } = req.body;
  
  // Mock charge response
  const mockCharge = {
    id: 'charge_' + Math.random().toString(36).substr(2, 9),
    code: 'CODE_' + Math.random().toString(36).substr(2, 6).toUpperCase(),
    name: name || 'Test Charge',
    description: description || 'Test Description',
    hosted_url: 'https://commerce.coinbase.com/charges/mock-charge-url',
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    pricing: {
      local: { amount: amount || '10.00', currency: currency || 'USD' },
      bitcoin: { amount: '0.00025', currency: 'BTC' },
      ethereum: { amount: '0.003', currency: 'ETH' }
    },
    timeline: [
      {
        time: new Date().toISOString(),
        status: 'NEW'
      }
    ]
  };
  
  console.log('Created mock Coinbase charge:', mockCharge.id);
  res.json(mockCharge);
});

// Mock Coinbase webhook endpoint
app.post('/api/coinbase/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-cc-webhook-signature'];
  
  console.log('Received Coinbase webhook:', {
    signature: signature ? 'present' : 'missing',
    bodyLength: req.body.length
  });
  
  // In a real implementation, we would verify the signature here
  res.status(200).send('OK');
});

// Mock OnchainKit endpoints
app.post('/api/blockchain/swap', (req, res) => {
  const { fromToken, toToken, amount } = req.body;
  
  const mockSwapResult = {
    success: true,
    transactionHash: '0x' + Math.random().toString(16).substr(2, 64),
    fromToken,
    toToken,
    amount,
    estimatedGas: '21000',
    gasPrice: '20000000000'
  };
  
  console.log('Mock blockchain swap:', mockSwapResult.transactionHash);
  res.json(mockSwapResult);
});

app.post('/api/blockchain/agent-command', (req, res) => {
  const { command } = req.body;
  
  const mockAgentResult = {
    success: true,
    command,
    result: 'Mock AI agent processed the command successfully',
    transactionHash: '0x' + Math.random().toString(16).substr(2, 64),
    timestamp: new Date().toISOString()
  };
  
  console.log('Mock AgentKit command:', command);
  res.json(mockAgentResult);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.originalUrl
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 OmniAuthor Pro 2025 Test Server running on http://0.0.0.0:${port}`);
  console.log(`📊 Health check: http://0.0.0.0:${port}/health`);
  console.log(`💳 Coinbase Commerce: http://0.0.0.0:${port}/api/payments/create-charge`);
  console.log(`🔗 Blockchain Operations: http://0.0.0.0:${port}/api/blockchain/swap`);
  console.log(`🤖 AI Agent Commands: http://0.0.0.0:${port}/api/blockchain/agent-command`);
});
