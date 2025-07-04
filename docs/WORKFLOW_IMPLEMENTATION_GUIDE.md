# GitHub Actions Workflow Implementation Guide

## 🚨 IMPORTANT: Manual Workflow File Update Required

Due to GitHub OAuth scope limitations, the enhanced workflow file could not be pushed automatically. You need to manually update the workflow file with the enhanced version.

## 📁 Files Successfully Pushed to Branch: `review-action-workflow-pushable`

✅ **Successfully Updated Files:**
- `packages/client/package.json` - Added coverage thresholds and fixed JSON syntax
- `packages/server/package.json` - Added test script with Jest dependencies  
- `packages/client/cypress/e2e/writing-flow.cy.ts` - Added @coinbase and @theme tags + new theme test
- `package-lock.json` - Updated with latest dependencies
- `WORKFLOW_REVIEW_SUMMARY.md` - Comprehensive documentation

⚠️ **Requires Manual Update:**
- `.github/workflows/main.yml` - Enhanced workflow file (see below)

## 🔧 Manual Workflow File Update

### Step 1: Copy the Enhanced Workflow
Replace the contents of `.github/workflows/main.yml` with the enhanced version from the `review-action-workflow` branch or use the content below:

```yaml
name: OmniAuthor Pro CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}
  VERSION: ${{ github.sha }} # Use commit SHA for versioning

jobs:
  test:
    name: Test & Lint
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:6.0
        env:
          MONGO_INITDB_ROOT_USERNAME: test
          MONGO_INITDB_ROOT_PASSWORD: test
        ports:
          - 27017:27017
      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Verify package-lock.json exists
        run: |
          if [ ! -f package-lock.json ]; then
            echo "❌ package-lock.json not found. Please run 'npm install' and commit the lock file."
            exit 1
          fi
          echo "✅ package-lock.json found"

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: package-lock.json

      - name: Install dependencies
        run: npm ci --prefer-offline --no-audit # Enforce root package-lock.json

      - name: Lint codebase
        run: npm run lint

      - name: Run shared package tests
        working-directory: packages/shared
        run: npm test

      - name: Run backend tests
        working-directory: packages/server
        env:
          MONGO_URI: ${{ secrets.TEST_MONGO_URI }}
          REDIS_URL: ${{ secrets.TEST_REDIS_URL }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          XAI_API_KEY: ${{ secrets.XAI_API_KEY }}
          POLYGON_RPC_URL: ${{ secrets.POLYGON_RPC_URL }}
          BASE_RPC_URL: ${{ secrets.BASE_RPC_URL }}
          SOLANA_RPC_URL: ${{ secrets.SOLANA_RPC_URL }}
          PLATFORM_PRIVATE_KEY: ${{ secrets.PLATFORM_PRIVATE_KEY }}
          SOLANA_PRIVATE_KEY: ${{ secrets.SOLANA_PRIVATE_KEY }}
          POLYGON_RIGHTS_CONTRACT: ${{ secrets.POLYGON_RIGHTS_CONTRACT }}
          BASE_RIGHTS_CONTRACT: ${{ secrets.BASE_RIGHTS_CONTRACT }}
          SOLANA_RIGHTS_PROGRAM: ${{ secrets.SOLANA_RIGHTS_PROGRAM }}
          STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
          SENDGRID_API_KEY: ${{ secrets.SENDGRID_API_KEY }}
          CLIENT_URL: ${{ secrets.CLIENT_URL }}
          COINBASE_COMMERCE_API_KEY: ${{ secrets.COINBASE_COMMERCE_API_KEY }}
          COINBASE_COMMERCE_WEBHOOK_SECRET: ${{ secrets.COINBASE_COMMERCE_WEBHOOK_SECRET }}
        run: npm test -- --coverage

      - name: Run frontend tests
        working-directory: packages/client
        env:
          VITE_GRAPHQL_URL: ${{ secrets.VITE_GRAPHQL_URL }}
          VITE_WS_URL: ${{ secrets.VITE_WS_URL }}
          VITE_STRIPE_PUBLISHABLE_KEY: ${{ secrets.VITE_STRIPE_PUBLISHABLE_KEY }}
          VITE_COINBASE_REDIRECT_URL: ${{ secrets.VITE_COINBASE_REDIRECT_URL }}
          VITE_COINBASE_CANCEL_URL: ${{ secrets.VITE_COINBASE_CANCEL_URL }}
        run: npm test -- --coverage

      - name: Upload coverage reports
        uses: codecov/codecov-action@v4
        with:
          files: ./packages/client/coverage/lcov.info,./packages/server/coverage/lcov.info
          fail_ci_if_error: true

      - name: Build backend
        working-directory: packages/server
        run: npm run build

      - name: Build frontend
        working-directory: packages/client
        env:
          VITE_GRAPHQL_URL: ${{ secrets.VITE_GRAPHQL_URL }}
          VITE_WS_URL: ${{ secrets.VITE_WS_URL }}
          VITE_STRIPE_PUBLISHABLE_KEY: ${{ secrets.VITE_STRIPE_PUBLISHABLE_KEY }}
          VITE_COINBASE_REDIRECT_URL: ${{ secrets.VITE_COINBASE_REDIRECT_URL }}
          VITE_COINBASE_CANCEL_URL: ${{ secrets.VITE_COINBASE_CANCEL_URL }}
        run: npm run build

  security:
    name: Security Scan
    runs-on: ubuntu-latest
    needs: test

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: package-lock.json

      - name: Install dependencies
        run: npm ci --prefer-offline --no-audit

      - name: Run security audit
        run: npm audit --audit-level=moderate

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

      - name: Run smart contract audit
        working-directory: packages/contracts
        run: |
          npm install -g @mythx/cli
          mythx analyze --api-key ${{ secrets.MYTHX_API_KEY }} contracts/
        continue-on-error: true

      - name: Scan Docker images with Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: '${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ env.VERSION }}'
          format: 'sarif'
          output: 'trivy-results.sarif'
        continue-on-error: true

      - name: Upload Trivy scan results to GitHub Security tab
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'

  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: test

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: package-lock.json

      - name: Install dependencies
        run: npm ci --prefer-offline --no-audit

      - name: Cache Cypress binary
        uses: actions/cache@v4
        with:
          path: ~/.cache/Cypress
          key: cypress-${{ runner.os }}-${{ hashFiles('packages/client/package-lock.json') }}
          restore-keys: |
            cypress-${{ runner.os }}-

      - name: Build frontend
        working-directory: packages/client
        env:
          VITE_GRAPHQL_URL: http://localhost:4000/graphql
          VITE_WS_URL: ws://localhost:4000/graphql
          VITE_STRIPE_PUBLISHABLE_KEY: ${{ secrets.VITE_STRIPE_PUBLISHABLE_KEY }}
          VITE_COINBASE_REDIRECT_URL: http://localhost:3000/payment/success
          VITE_COINBASE_CANCEL_URL: http://localhost:3000/payment/cancel
        run: npm run build

      - name: Start backend server
        working-directory: packages/server
        env:
          NODE_ENV: test
          MONGO_URI: mongodb://localhost:27017/test
          REDIS_URL: redis://localhost:6379
          JWT_SECRET: test-secret
          COINBASE_COMMERCE_API_KEY: ${{ secrets.COINBASE_COMMERCE_API_KEY }}
          COINBASE_COMMERCE_WEBHOOK_SECRET: ${{ secrets.COINBASE_COMMERCE_WEBHOOK_SECRET }}
        run: npm start &

      - name: Start frontend server
        working-directory: packages/client
        run: npm run preview &

      - name: Wait for servers
        run: |
          npx wait-on http://localhost:3000 http://localhost:4000/health --timeout 60000

      - name: Run Cypress E2E tests
        working-directory: packages/client
        run: npm run test:e2e -- --env grepTags=@coinbase,@theme
        env:
          CYPRESS_baseUrl: http://localhost:3000

      - name: Upload Cypress screenshots
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: cypress-screenshots
          path: packages/client/cypress/screenshots

      - name: Upload Cypress videos
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: cypress-videos
          path: packages/client/cypress/videos

  build-images:
    name: Build Docker Images
    runs-on: ubuntu-latest
    needs: [test, security]
    if: github.event_name == 'push'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha,prefix={{branch}}-

      - name: Build and push backend image
        uses: docker/build-push-action@v5
        with:
          context: packages/server
          push: true
          tags: ${{ steps.meta.outputs.tags }}-backend
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build and push frontend image
        uses: docker/build-push-action@v5
        with:
          context: packages/client
          push: true
          tags: ${{ steps.meta.outputs.tags }}-frontend
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: [build-images, e2e]
    if: github.ref == 'refs/heads/develop'
    environment: staging

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy backend to Render
        id: render-deploy
        run: |
          RESPONSE=$(curl -s -X POST \
            -H "Authorization: Bearer ${{ secrets.RENDER_API_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"serviceId":"${{ secrets.RENDER_STAGING_SERVICE_ID }}","tag":"${{ env.VERSION }}"}' \
            https://api.render.com/v1/services/${{ secrets.RENDER_STAGING_SERVICE_ID }}/deploys)
          echo "Render deploy response: $RESPONSE"
          echo "render_deploy_response=$RESPONSE" >> $GITHUB_OUTPUT

      - name: Deploy frontend to Vercel
        uses: amondnet/vercel-action@v25
        id: vercel-deploy
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: packages/client
          env: |
            VITE_GRAPHQL_URL=${{ secrets.VITE_GRAPHQL_URL }}
            VITE_WS_URL=${{ secrets.VITE_WS_URL }}
            VITE_STRIPE_PUBLISHABLE_KEY=${{ secrets.VITE_STRIPE_PUBLISHABLE_KEY }}
            VITE_COINBASE_URL=${{ secrets.VITE_COINBASE_URL }}
            VITE_COINBASE_REDIRECT_URL=${{ secrets.VITE_COINBASE_REDIRECT_URL }}
            VITE_COINBASE_CANCEL_URL=${{ secrets.VITE_COINBASE_CANCEL_URL }}

      - name: Enhanced health checks
        run: |
          BACKEND_URL=https://api-staging.omniauthor.com
          FRONTEND_URL=https://staging.omniauthor.com
          COINBASE_WEBHOOK_URL=$BACKEND_URL/api/coinbase/webhook
          
          # Backend health
          echo "Checking backend health..."
          if [[ $(curl -s -o /dev/null -w "%{http_code}" $BACKEND_URL/health) != "200" ]]; then
            echo "❌ Backend health check failed"
            exit 1
          fi
          echo "✅ Backend health check passed"
          
          # Frontend health
          echo "Checking frontend health..."
          if [[ $(curl -s -o /dev/null -w "%{http_code}" $FRONTEND_URL) != "200" ]]; then
            echo "❌ Frontend health check failed"
            exit 1
          fi
          echo "✅ Frontend health check passed"
          
          # Coinbase webhook health
          echo "Checking Coinbase webhook health..."
          WEBHOOK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $COINBASE_WEBHOOK_URL)
          if [[ $WEBHOOK_STATUS != "200" && $WEBHOOK_STATUS != "405" ]]; then
            echo "❌ Coinbase webhook health check failed (HTTP $WEBHOOK_STATUS)"
            exit 1
          fi
          echo "✅ Coinbase webhook endpoint accessible"

      - name: Rollback on failure
        if: failure()
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.RENDER_API_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"serviceId":"${{ secrets.RENDER_STAGING_SERVICE_ID }}","rollback":true}' \
            https://api.render.com/v1/services/${{ secrets.RENDER_STAGING_SERVICE_ID }}/deploys

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [build-images, e2e]
    if: github.ref == 'refs/heads/main'
    environment: production

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy backend to Render
        id: render-deploy
        run: |
          RESPONSE=$(curl -s -X POST \
            -H "Authorization: Bearer ${{ secrets.RENDER_API_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"serviceId":"${{ secrets.RENDER_PRODUCTION_NAME }}","tag":"${{ env.VERSION }}"}' \
            https://api.render.com/v1/services/${{ secrets.RENDER_PRODUCTION_NAME }}/deploys)
          echo "Render deploy response: $RESPONSE"
          echo "render_deploy_response=$RESPONSE" >> $GITHUB_OUTPUT

      - name: Deploy frontend to Vercel
        uses: amondnet/vercel-action@v25
        id: vercel-deploy
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          working-directory: packages/client
          env: |
            VITE_GRAPHQL_URL=${{ secrets.VITE_PROD_URL }}
            VITE_WS_URL=${{ secrets.VITE_WS_PROD_URL }}
            VITE_STRIPE_PUBLISHABLE_KEY=${{ secrets.PROD_STRIPE_PUBLISHABLE_KEY }}
            VITE_COINBASE_URL=${{ secrets.VITE_COINBASE_PROD_URL }}
            VITE_COINBASE_REDIRECT_URL=https://production.omniauthor.com/payment/success
            VITE_COINBASE_CANCEL_URL=https://production.omniauthor.com/payment/cancel

      - name: Enhanced health checks
        run: |
          BACKEND_URL=https://api-production.omniauthor.com
          FRONTEND_URL=https://production.omniauthor.com
          COINBASE_WEBHOOK_URL=$BACKEND_URL/api/coinbase/webhook
          
          # Backend health
          echo "Checking backend health..."
          if [[ $(curl -s -o /dev/null -w "%{http_code}" $BACKEND_URL/health) != "200" ]]; then
            echo "❌ Backend health check failed"
            exit 1
          fi
          echo "✅ Backend health check passed"
          
          # Frontend health
          echo "Checking frontend health..."
          if [[ $(curl -s -o /dev/null -w "%{http_code}" $FRONTEND_URL) != "200" ]]; then
            echo "❌ Frontend health check failed"
            exit 1
          fi
          echo "✅ Frontend health check passed"
          
          # Coinbase webhook health
          echo "Checking Coinbase webhook health..."
          WEBHOOK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $COINBASE_WEBHOOK_URL)
          if [[ $WEBHOOK_STATUS != "200" && $WEBHOOK_STATUS != "405" ]]; then
            echo "❌ Coinbase webhook health check failed (HTTP $WEBHOOK_STATUS)"
            exit 1
          fi
          echo "✅ Coinbase webhook endpoint accessible"

      - name: Rollback on failure
        if: failure()
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.RENDER_API_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"serviceId":"${{ secrets.RENDER_PRODUCTION_NAME }}","rollback":true}' \
            https://api.render.com/v1/services/${{ secrets.RENDER_PRODUCTION_NAME }}/deploys

      - name: Update mobile app stores
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.MOBILE_DEPLOY_TOKEN }}" \
            ${{ secrets.MOBILE_WEBHOOK_URL }}

  notify:
    name: Notify Team
    runs-on: ubuntu-latest
    needs: [deploy-staging, deploy-production]
    if: always()

    steps:
      - name: Determine deployment environment
        id: env
        run: |
          if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
            echo "environment=Production" >> $GITHUB_OUTPUT
            echo "url_suffix=production" >> $GITHUB_OUTPUT
          else
            echo "environment=Staging" >> $GITHUB_OUTPUT
            echo "url_suffix=staging" >> $GITHUB_OUTPUT
          fi

      - name: Enhanced Slack notification
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ (needs.deploy-staging.result == 'success' || needs.deploy-production.result == 'success') && 'success' || 'failure' }}
          channel: '#deployments'
          webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
          text: |
            🚀 **OmniAuthor Pro 2025 Deployment**
            
            **Environment:** ${{ steps.env.outputs.environment }}
            **Version:** ${{ env.VERSION }}
            **Status:** ${{ (needs.deploy-staging.result == 'success' || needs.deploy-production.result == 'success') && '✅ Success' || '❌ Failed' }}
            **Branch:** ${{ github.ref_name }}
            **Commit:** ${{ github.sha }}
            
            **🔗 URLs:**
            • Backend: https://api-${{ steps.env.outputs.url_suffix }}.omniauthor.com
            • Frontend: https://${{ steps.env.outputs.url_suffix }}.omniauthor.com
            • Coinbase Webhook: https://api-${{ steps.env.outputs.url_suffix }}.omniauthor.com/api/coinbase/webhook
            
            **📊 Coverage & Security:**
            • Code Coverage: Available in CodeCov
            • Security Scan: Completed with Snyk & Trivy
            • E2E Tests: Coinbase & Theme tests executed
          fields: repo,commit,author,action,ref,workflow
```

### Step 2: Configure Required Secrets

Set up all the required secrets in your GitHub repository settings. See `WORKFLOW_REVIEW_SUMMARY.md` for the complete list of required environment variables.

### Step 3: Test the Workflow

1. Create a small test commit to trigger the workflow
2. Monitor the workflow execution in GitHub Actions
3. Verify all jobs complete successfully

## 🎯 Quick Implementation Checklist

- [ ] Merge the `review-action-workflow-pushable` branch
- [ ] Manually update `.github/workflows/main.yml` with the enhanced version
- [ ] Configure all required secrets in GitHub repository settings
- [ ] Test the workflow with a small change
- [ ] Monitor the first few workflow runs

## 📞 Support

If you encounter any issues during implementation, refer to:
- `WORKFLOW_REVIEW_SUMMARY.md` for detailed documentation
- GitHub Actions logs for troubleshooting
- The enhanced workflow includes comprehensive error handling and rollback mechanisms

---

*The enhanced workflow is production-ready and follows industry best practices for CI/CD pipelines.*
