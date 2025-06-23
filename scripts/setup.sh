#!/bin/bash

# OmniAuthor Pro 2025 - Production Setup Script
set -e

echo "🚀 Setting up OmniAuthor Pro 2025..."

# Check dependencies
echo "📋 Checking dependencies..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed. Aborting." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed. Aborting." >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed. Aborting." >&2; exit 1; }
command -v ngrok >/dev/null 2>&1 || { echo "⚠️ ngrok is recommended for Coinbase webhook testing. Install it with 'brew install ngrok' or skip webhook setup." >&2; }

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"
if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Required: $REQUIRED_VERSION or higher"
    exit 1
fi

echo "✅ Dependencies check passed"

# Environment setup
echo "🔧 Setting up environment..."

# Create environment files if they don't exist
if [ ! -f "packages/server/.env" ]; then
    echo "📝 Creating server environment file..."
    cat > packages/server/.env << EOF
# Database
MONGO_URI=mongodb://localhost:27017/omniauthor
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=$(openssl rand -base64 32)

# API Keys
OPENAI_API_KEY=your_openai_api_key_here
XAI_API_KEY=your_xai_api_key_here
COINBASE_COMMERCE_API_KEY=your_coinbase_commerce_api_key_here

# Blockchain
POLYGON_RPC_URL=https://polygon-rpc.com
BASE_RPC_URL=https://mainnet.base.org
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
PLATFORM_PRIVATE_KEY=your_private_key_here
SOLANA_PRIVATE_KEY=your_solana_private_key_here

# Contract Addresses
POLYGON_RIGHTS_CONTRACT=0x...
BASE_RIGHTS_CONTRACT=0x...
SOLANA_RIGHTS_PROGRAM=...

# External Services
STRIPE_SECRET_KEY=your_stripe_secret_key
SENDGRID_API_KEY=your_sendgrid_api_key

# URLs
CLIENT_URL=http://localhost:3000
COINBASE_WEBHOOK_SECRET=your_coinbase_webhook_secret
EOF
fi

if [ ! -f "packages/client/.env" ]; then
    echo "📝 Creating client environment file..."
    cat > packages/client/.env << EOF
VITE_GRAPHQL_URL=http://localhost:4000/graphql
VITE_WS_URL=ws://localhost:4000/graphql
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
VITE_COINBASE_REDIRECT_URL=http://localhost:3000/payment/success
VITE_COINBASE_CANCEL_URL=http://localhost:3000/payment/cancel
EOF
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --prefer-offline --no-audit # Respect root package-lock.json

# Validate monorepo packages
echo "🔍 Validating monorepo packages..."
for pkg in packages/*; do
    if [ -f "$pkg/package.json" ] && [ -f "$pkg/package-lock.json" ]; then
        echo "⚠️ Removing $pkg/package-lock.json to enforce root lockfile"
        rm -f "$pkg/package-lock.json"
    fi
done

# Build shared package
echo "🔨 Building shared package..."
cd packages/shared
npm run build
cd ../..

# Database setup
echo "🗄️ Setting up databases..."
docker-compose up -d mongodb redis

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Database initialization
echo "🗄️ Initializing database..."
cd packages/server
npm run db:init
cd ../..

# Build applications
echo "🔨 Building applications..."
cd packages/server
npm run build
cd ../client
npm run build
cd ../..

# Smart contracts setup
echo "🔗 Setting up smart contracts..."
cd packages/contracts
if [ ! -d "node_modules" ]; then
    npm install
fi
npx hardhat compile
if [ -n "$DEPLOY_TESTNET" ]; then
    echo "🚀 Deploying contracts to testnets..."
    npx hardhat run scripts/deploy.js --network polygon-testnet
    npx hardhat run scripts/deploy.js --network base-testnet
fi
cd ../..

# Coinbase webhook setup
if command -v ngrok >/dev/null 2>&1; then
    echo "🌐 Setting up Coinbase webhook tunnel with ngrok..."
    ngrok http 4000 > /dev/null &
    NGROK_PID=$!
    sleep 5
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url')
    if [ -n "$NGROK_URL" ]; then
        echo "✅ Coinbase webhook URL: $NGROK_URL/api/coinbase/webhook"
        echo "Update your Coinbase Commerce webhook settings with this URL."
    else
        echo "⚠️ Failed to retrieve ngrok URL. Skipping webhook setup."
    fi
else
    echo "⚠️ ngrok not installed. Skipping Coinbase webhook setup."
    echo "You can set up webhooks manually using: http://localhost:4000/api/coinbase/webhook"
fi

# Run tests
echo "🧪 Running tests..."
npm run test
npm run test:e2e

# Setup monitoring
echo "📊 Setting up monitoring..."
mkdir -p logs monitoring/prometheus/data monitoring/grafana/data
cat > monitoring/docker-compose.yml << EOF
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    container_name: omniauthor-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./prometheus/data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'

  grafana:
    image: grafana/grafana:latest
    container_name: omniauthor-grafana
    ports:
      - "3001:3000"
    volumes:
      - ./grafana/data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
EOF

mkdir -p monitoring/prometheus
cat > monitoring/prometheus/prometheus.yml << EOF
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'omniauthor-backend'
    static_configs:
      - targets: ['host.docker.internal:4000']
    metrics_path: '/metrics'
    scrape_interval: 5s
  - job_name: 'omniauthor-frontend'
    static_configs:
      - targets: ['host.docker.internal:3000']
    scrape_interval: 30s
  - job_name: 'coinbase-webhook'
    static_configs:
      - targets: ['host.docker.internal:4000']
    metrics_path: '/api/coinbase/webhook'
    scrape_interval: 30s
EOF

echo "✅ Setup completed successfully!"
echo ""
echo "🎉 OmniAuthor Pro 2025 is ready!"
echo ""
echo "📍 Next steps:"
echo "1. Update API keys in packages/server/.env (including COINBASE_COMMERCE_API_KEY)"
echo "2. Configure blockchain wallet private keys"
echo "3. Set up Coinbase webhook in Commerce dashboard"
echo "4. Start the development servers:"
echo "   npm run dev:server    # Backend (port 4000)"
echo "   npm run dev:client    # Frontend (port 3000)"
echo "5. Access the application at http://localhost:3000"
echo "6. Monitor at http://localhost:3001 (Grafana)"
echo ""
echo "📚 Documentation: https://docs.omniauthor.com"
echo "🐛 Issues: https://github.com/CreoDAMO/OmniAuthor-Pro-2025/issues"
echo ""
echo "Happy writing! ✍🏾"
