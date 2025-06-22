#!/bin/bash


# OmniAuthor Pro 2025 - Production Deployment Script
set -e


ENVIRONMENT=${1:-staging}
VERSION=${2:-latest}


echo "🚀 Deploying OmniAuthor Pro 2025 to $ENVIRONMENT..."


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
)


for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required environment variable $var is not set"
        exit 1
    fi
done


echo "✅ Environment validation passed"


# Build and test
echo "🔨 Building applications..."
npm run build
npm run test


# Deploy backend
echo "🚀 Deploying backend to Render..."
if [ "$ENVIRONMENT" = "production" ]; then
    SERVICE_ID="$RENDER_PRODUCTION_SERVICE_ID"
else
    SERVICE_ID="$RENDER_STAGING_SERVICE_ID"
fi


curl -X POST \
    -H "Authorization: Bearer $RENDER_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"serviceId\":\"$SERVICE_ID\"}" \
    https://api.render.com/v1/services/$SERVICE_ID/deploys


# Deploy frontend
echo "🚀 Deploying frontend to Vercel..."
cd packages/client


if [ "$ENVIRONMENT" = "production" ]; then
    npx vercel --prod --token $VERCEL_TOKEN
else
    npx vercel --token $VERCEL_TOKEN
fi


cd ../..


# Update database migrations
echo "🗄️ Running database migrations..."
cd packages/server
npm run db:migrate
cd ../..


# Deploy smart contracts (production only)
if [ "$ENVIRONMENT" = "production" ]; then
    echo "🔗 Deploying smart contracts..."
    cd packages/contracts
    
    # Deploy to Polygon mainnet
    npx hardhat run scripts/deploy.js --network polygon
    
    # Deploy to Base mainnet
    npx hardhat run scripts/deploy.js --network base
    
    # Deploy to Solana mainnet
    anchor deploy --provider.cluster mainnet
    
    cd ../..
fi


# Health checks
echo "🩺 Running health checks..."
sleep 30


# Check backend health
BACKEND_URL="https://api-$ENVIRONMENT.omniauthor.com"
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BACKEND_URL/health)


if [ "$HEALTH_STATUS" != "200" ]; then
    echo "❌ Backend health check failed (HTTP $HEALTH_STATUS)"
    exit 1
fi


# Check frontend health
FRONTEND_URL="https://$ENVIRONMENT.omniauthor.com"
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $FRONTEND_URL)


if [ "$FRONTEND_STATUS" != "200" ]; then
    echo "❌ Frontend health check failed (HTTP $FRONTEND_STATUS)"
    exit 1
fi


echo "✅ Health checks passed"


# Update monitoring
echo "📊 Updating monitoring configuration..."
curl -X POST \
    -H "Authorization: Bearer $GRAFANA_API_KEY" \
    -H "Content-Type: application/json" \
    -d @infrastructure/grafana/dashboard.json \
    https://grafana-$ENVIRONMENT.omniauthor.com/api/dashboards/db


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
                {\"title\": \"Frontend\", \"value\": \"$FRONTEND_URL\", \"short\": false}
            ]
        }]
    }" \
    $SLACK_WEBHOOK_URL


echo "✅ Deployment completed successfully!"
echo ""
echo "🌐 Application URLs:"
echo "Frontend: $FRONTEND_URL"
echo "Backend: $BACKEND_URL"
echo "Monitoring: https://grafana-$ENVIRONMENT.omniauthor.com"
echo ""
echo "📊 Key metrics to monitor:"
echo "- Response times < 500ms"
echo "- Error rate < 1%"
echo "- Active users growth"
echo "- AI usage patterns"
echo "- Blockchain transaction success rate"
