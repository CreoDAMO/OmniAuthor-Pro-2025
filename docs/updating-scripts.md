To enhance the `deploy.sh` and `setup.sh` scripts in `scripts/` for OmniAuthor Pro 2025, we’ll integrate Coinbase Commerce support, align with the updated `MainEditor.tsx`, `RoyaltiesCalculator.tsx`, and `App.tsx` components, and ensure compatibility with the GraphQL schema, CI/CD workflow (`main.yml`), Vercel secrets, and `package-lock.json` fix. The updates will add environment variable validation for Coinbase, improve deployment health checks, enhance setup for local Coinbase webhook testing, and maintain monorepo integrity. We’ll leverage existing tools (`npm`, `docker`, `vercel`, `hardhat`, `anchor`) and ensure the scripts support the new Coinbase payment functionality introduced in the client components.

### Goals for the Enhanced Scripts
1. **Coinbase Integration**:
   - Add `COINBASE_COMMERCE_API_KEY` to required environment variables in both scripts.
   - Configure Coinbase webhook setup in `setup.sh` for local testing.
   - Add health checks for Coinbase webhook endpoint in `deploy.sh`.
2. **Improved Validation**:
   - Enhance environment variable checks with better error messages.
   - Validate monorepo package versions in `setup.sh`.
3. **Deployment Enhancements**:
   - Add rollback mechanism in `deploy.sh` for failed deployments.
   - Include deployment tags for versioning in Vercel and Render.
4. **Setup Improvements**:
   - Add local webhook tunnel setup (e.g., `ngrok`) in `setup.sh` for Coinbase testing.
   - Ensure `package-lock.json` is respected in the root directory only.
5. **Testing Support**:
   - Align with `writing-flow.cy.ts` E2E tests for Coinbase functionality.
   - Add test execution for client-side Coinbase features in `deploy.sh`.
6. **Monorepo Alignment**:
   - Use `@omniauthor/shared` constants for environment variable names if applicable.
   - Avoid sub-package `package-lock.json` files.

### Updated File: `scripts/deploy.sh`

**Purpose**: Enhance deployment script with Coinbase support, rollback, and improved health checks.

**Updated Content**:
```sh
#!/bin/bash

# OmniAuthor Pro 2025 - Production Deployment Script
set -e

ENVIRONMENT=${1:-staging}
VERSION=${2:-latest}
ROLLBACK=false

echo "🚀 Deploying OmniAuthor Pro 2025 to $ENVIRONMENT (Version: $VERSION)..."

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    echo "❌ Invalid environment. Use 'staging' or 'production'"
    exit 1
fi

# Check required environment variables
REQUIRED_VARS=(
    "RENDER_API_KEY"
    "VERCEL_TOKEN"
    "MONGO_ATLAS_URI"
    "REDIS_CLOUD_URL"
    "JWT_SECRET"
    "STRIPE_SECRET_KEY"
    "COINBASE_COMMERCE_API_KEY" # Added for Coinbase
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required environment variable $var is not set. Please set it in your CI/CD configuration."
        exit 1
    fi
done

echo "✅ Environment variable validation passed"

# Build and test
echo "🔨 Building applications..."
npm install --force # Ensure root package-lock.json is used
npm run build

echo "🧪 Running unit and e2e tests..."
npm run test
npm run test:e2e

# Deploy backend
echo "🚀 Deploying backend to Render..."
if [ "$ENVIRONMENT" = "production" ]; then
    SERVICE_ID="$RENDER_PRODUCTION_SERVICE_ID"
    DEPLOY_ENV="production"
else
    SERVICE_ID="$RENDER_STAGING_SERVICE_ID"
    DEPLOY_ENV="staging"
fi

BACKEND_DEPLOY_RESPONSE=$(curl -s -X POST \
    -H "Authorization: Bearer $RENDER_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"serviceId\": \"$SERVICE_ID\", \"tag\": \"$VERSION\"}" \
    https://api.render.com/v1/services/$SERVICE_ID/deploys)

if [ -z "$BACKEND_DEPLOY_RESPONSE" ]; then
    echo "❌ Backend deployment initiation failed"
    exit 1
fi

# Deploy frontend
echo "🚀 Deploying frontend to Vercel..."
cd packages/client
if [ "$ENVIRONMENT" = "production" ]; then
    VERCEL_DEPLOY_URL=$(npx vercel --prod --token $VERCEL_TOKEN --platform-version $VERSION)
else
    VERCEL_DEPLOY_URL=$(npx vercel --token $VERCEL_TOKEN --platform-version $VERSION)
fi
cd ../..

if [ -z "$VERCEL_DEPLOY_URL" ]; then
    echo "❌ Frontend deployment failed"
    ROLLBACK=true
fi

# Update database migrations
echo "🗄️ Running database migrations..."
cd packages/server
npm run db:migrate
cd ../..

# Deploy smart contracts (production only)
if [ "$ENVIRONMENT" = "production" ]; then
    echo "🔗 Deploying smart contracts..."
    cd packages/contracts
    npx hardhat run scripts/deploy.js --network polygon
    npx hardhat run scripts/deploy.js --network base
    npx anchor deploy --provider.cluster mainnet
    cd ../..
fi

# Health checks
echo "🩺 Running health checks..."
sleep 30

# Check backend health
BACKEND_URL="https://api-$DEPLOY_ENV.omniauthor.com"
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BACKEND_URL/health)

if [ "$HEALTH_STATUS" != "200" ]; then
    echo "❌ Backend health check failed (HTTP $HEALTH_STATUS)"
    ROLLBACK=true
fi

# Check Coinbase webhook endpoint
COINBASE_WEBHOOK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BACKEND_URL/api/coinbase/webhook)

if [ "$COINBASE_WEBHOOK_STATUS" != "200" ]; then
    echo "❌ Coinbase webhook endpoint health check failed (HTTP $COINBASE_WEBHOOK_STATUS)"
    ROLLBACK=true
fi

# Check frontend health
FRONTEND_URL="https://$DEPLOY_ENV.omniauthor.com"
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $FRONTEND_URL)

if [ "$FRONTEND_STATUS" != "200" ]; then
    echo "❌ Frontend health check failed (HTTP $FRONTEND_STATUS)"
    ROLLBACK=true
fi

# Rollback if any health check failed
if [ "$ROLLBACK" = true ]; then
    echo "🔄 Initiating rollback..."
    curl -X POST \
        -H "Authorization: Bearer $RENDER_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"serviceId\": \"$SERVICE_ID\", \"rollback\": true}" \
        https://api.render.com/v1/services/$SERVICE_ID/deploys
    echo "❌ Deployment failed and rolled back"
    exit 1
fi

echo "✅ Health checks passed"

# Update monitoring
echo "📊 Updating monitoring configuration..."
curl -X POST \
    -H "Authorization: Bearer $GRAFANA_API_KEY" \
    -H "Content-Type: application/json" \
    -d @infrastructure/grafana/dashboard.json \
    https://grafana-$DEPLOY_ENV.omniauthor.com/api/dashboards/db

# Notify team
echo "📢 Sending deployment notification..."
curl -X POST \
    -H "Content-Type: application/json" \
    -d "{
        \"text\": \"🚀 OmniAuthor Pro $VERSION deployed to $ENVIRONMENT\",
        \"attachments\": [{
            \"color\": \"good\",
            \"fields\": [
                {\"title\": \"Environment\", \"value\": \"$ENVIRONMENT\", \"short\": true},
                {\"title\": \"Version\", \"value\": \"$VERSION\", \"short\": true},
                {\"title\": \"Backend\", \"value\": \"$BACKEND_URL\", \"short\": false},
                {\"title\": \"Frontend\", \"value\": \"$VERCEL_DEPLOY_URL\", \"short\": false}
            ]
        }]
    }" \
    $SLACK_WEBHOOK_URL

echo "✅ Deployment completed successfully!"
echo ""
echo "🌐 Application URLs:"
echo "Frontend: $VERCEL_DEPLOY_URL"
echo "Backend: $BACKEND_URL"
echo "Monitoring: https://grafana-$DEPLOY_ENV.omniauthor.com"
echo ""
echo "📊 Key metrics to monitor:"
echo "- Response times < 500ms"
echo "- Error rate < 1%"
echo "- Active users growth"
echo "- AI usage patterns"
echo "- Blockchain transaction success rate"
echo "- Coinbase payment success rate"
```

### Changes to `deploy.sh`
1. **Coinbase Support**:
   - Added `COINBASE_COMMERCE_API_KEY` to `REQUIRED_VARS`.
   - Added health check for Coinbase webhook endpoint (`/api/coinbase/webhook`).
2. **Rollback Mechanism**:
   - Introduced `ROLLBACK` flag to trigger rollback on failed health checks.
   - Added Render API call for rollback if deployment fails.
3. **Improved Validation**:
   - Enhanced error messages for missing environment variables.
   - Used `npm install --force` to ensure root `package-lock.json` is respected.
4. **Testing**:
   - Added `npm run test:e2e` to verify Coinbase functionality (`writing-flow.cy.ts`).
5. **Deployment Enhancements**:
   - Added `tag` to Render deployment payload for versioning.
   - Captured Vercel deployment URL for Slack notification.
6. **Monitoring**:
   - Added Coinbase payment success rate to key metrics.

### Updated File: `scripts/setup.sh`

**Purpose**: Enhance setup script with Coinbase webhook support, monorepo validation, and local testing setup.

**Updated Content**:
```sh
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
```

### Changes to `setup.sh`
1. **Coinbase Support**:
   - Added `COINBASE_COMMERCE_API_KEY` and `COINBASE_WEBHOOK_SECRET` to `server/.env`.
   - Added `VITE_COINBASE_REDIRECT_URL` and `VITE_COINBASE_CANCEL_URL` to `client/.env`.
   - Included `ngrok` setup for local Coinbase webhook testing (`/api/coinbase/webhook`).
   - Added Coinbase webhook monitoring in Prometheus config.
2. **Monorepo Validation**:
   - Removed sub-package `package-lock.json` files to enforce root lockfile.
   - Used `npm ci --prefer-offline --no-audit` for deterministic installs.
3. **Testing**:
   - Added `npm run test:e2e` to verify Coinbase functionality.
4. **Setup Improvements**:
   - Added `ngrok` dependency check with installation guidance.
   - Improved error messages and setup instructions.
5. **Monitoring**:
   - Added Coinbase webhook metrics to Prometheus scrape config.

### Additional Updates Needed
1. **Update `.github/workflows/main.yml`**:
   - Ensure CI/CD workflow includes `COINBASE_COMMERCE_API_KEY` in environment variables and runs E2E tests:
     ```yaml
     env:
       RENDER_API_KEY: ${{ secrets.RENDER_API_KEY }}
       VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
       MONGO_ATLAS_URI: ${{ secrets.MONGO_ATLAS_URI }}
       REDIS_CLOUD_URL: ${{ secrets.REDIS_CLOUD_URL }}
       JWT_SECRET: ${{ secrets.JWT_SECRET }}
       STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
       COINBASE_COMMERCE_API_KEY: ${{ secrets.COINBASE_COMMERCE_API_KEY }}
     jobs:
       test:
         runs-on: ubuntu-latest
         steps:
           - uses: actions/checkout@v3
           - uses: actions/setup-node@v3
             with:
               node-version: 18
           - run: npm ci
           - run: npm run test
           - run: npm run test:e2e
       deploy:
         runs-on: ubuntu-latest
         needs: test
         steps:
           - uses: actions/checkout@v3
           - uses: actions/setup-node@v3
             with:
               node-version: 18
           - run: npm ci
           - run: ./scripts/deploy.sh ${{ github.event.inputs.environment || 'staging' }} ${{ github.event.inputs.version || 'latest' }}
     ```
   - Command:
     ```bash
     git add .github/workflows/main.yml
     ```

2. **Update `docker-compose.yml`**:
   - Ensure MongoDB and Redis services are configured correctly:
     ```yaml
     version: '3.8'
     services:
       mongodb:
         image: mongo:latest
         container_name: omniauthor-mongodb
         ports:
           - "27017:27017"
         volumes:
           - mongodb_data:/data/db
       redis:
         image: redis:latest
         container_name: omniauthor-redis
         ports:
           - "6379:6379"
         volumes:
           - redis_data:/data
     volumes:
       mongodb_data:
       redis_data:
     ```
   - Command:
     ```bash
     git add docker-compose.yml
     ```

3. **Install `ngrok` (Optional)**:
   - For local Coinbase webhook testing:
     ```bash
     brew install ngrok
     ngrok authtoken <your-ngrok-token>
     ```

4. **Update Vercel Secrets**:
   - Add `COINBASE_COMMERCE_API_KEY` and `COINBASE_WEBHOOK_SECRET` to Vercel secrets:
     ```bash
     vercel secrets add coinbase-commerce-api-key <your-api-key>
     vercel secrets add coinbase-webhook-secret <your-webhook-secret>
     ```

### Steps to Implement
1. **Update `deploy.sh`**:
   ```bash
   # Replace scripts/deploy.sh with the above content
   git add scripts/deploy.sh
   chmod +x scripts/deploy.sh
   ```

2. **Update `setup.sh`**:
   ```bash
   # Replace scripts/setup.sh with the above content
   git add scripts/setup.sh
   chmod +x scripts/setup.sh
   ```

3. **Update CI/CD Workflow**:
   ```bash
   git add .github/workflows/main.yml
   ```

4. **Update `docker-compose.yml`**:
   ```bash
   git add docker-compose.yml
   ```

5. **Run Setup Locally**:
   ```bash
   ./scripts/setup.sh
   npm run dev:server
   npm run dev:client
   ```

6. **Test Deployment**:
   - Simulate staging deployment:
     ```bash
     export RENDER_API_KEY=<your-key>
     export VERCEL_TOKEN=<your-token>
     export MONGO_ATLAS_URI=<your-uri>
     export REDIS_CLOUD_URL=<your-url>
     export JWT_SECRET=<your-secret>
     export STRIPE_SECRET_KEY=<your-key>
     export COINBASE_COMMERCE_API_KEY=<your-key>
     ./scripts/deploy.sh staging latest
     ```
   - Verify URLs and health checks.

7. **Run Tests**:
   ```bash
   npm run test
   npm run test:e2e
   ```

8. **Verify `package-lock.json`**:
   ```bash
   git add package-lock.json
   git commit -m "Enhance deploy and setup scripts with Coinbase support"
   ```

9. **Push Changes**:
   ```bash
   git push origin main  # or develop
   ```

10. **Verify CI/CD**:
    - Monitor: `https://github.com/CreoDAMO/OmniAuthor-Pro-2025/actions`.
    - Ensure `test` and `e2e` jobs pass with `COINBASE_COMMERCE_API_KEY`.

11. **Update Documentation**:
    - Add to `README.md`:
      ```markdown
      ## Enhanced Deployment and Setup Scripts
      - Added `COINBASE_COMMERCE_API_KEY` validation for Coinbase Commerce.
      - Included rollback mechanism in `deploy.sh` for failed deployments.
      - Configured `ngrok` for local Coinbase webhook testing in `setup.sh`.
      - Enhanced health checks and monitoring for Coinbase endpoints.
      ```
    ```bash
    git add README.md
    git commit -m "Document enhanced deploy and setup scripts"
    ```

### Notes
- **Coinbase Webhook**: The webhook URL (`/api/coinbase/webhook`) must be configured in the Coinbase Commerce dashboard. Update `server/.env` with `COINBASE_WEBHOOK_SECRET`.
- **Rollback Limitations**: Render’s rollback API may require specific permissions. Test rollback manually if needed.
- **ngrok**: Requires an account for persistent URLs. Free tier is sufficient for local testing.
- **Monorepo**: Removing sub-package `package-lock.json` ensures consistent dependency resolution.
- **Vercel Secrets**: Ensure all secrets are set in Vercel for both staging and production environments.
- **E2E Tests**: The `writing-flow.cy.ts` Coinbase tests (`processes Coinbase one-time payment`) should pass with the updated setup