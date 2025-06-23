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
