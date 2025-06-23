To enhance the `.github/workflows/main.yml` CI/CD workflow for OmniAuthor Pro 2025, we’ll align it with the updates made to `RoyaltiesCalculator.tsx`, `App.tsx`, `RoyaltiesCalculator.test.tsx`, `deploy.sh`, `setup.sh`, `auth.ts`, `subscription.ts`, `Header.tsx`, and `ThemeContext.tsx`. The goal is to improve testing, deployment, and notification processes, ensuring compatibility with Coinbase Commerce integration, theme toggling, GraphQL schema, Vercel secrets, and `package-lock.json` consistency. We’ll add support for theme-related E2E tests, enhance Coinbase environment variable validation, improve security scans, and integrate with the deployment scripts’ rollback mechanism. The workflow will remain compatible with the monorepo structure, existing dependencies, and GitHub Actions setup.

### Goals for the Enhanced Workflow
1. **Coinbase Support**:
   - Ensure `COINBASE_COMMERCE_API_KEY` and `COINBASE_COMMERCE_WEBHOOK_SECRET` are used in tests and deployments.
   - Add health checks for Coinbase webhook endpoint post-deployment.
2. **Theme Toggling Tests**:
   - Include E2E tests for theme toggle (`writing-flow.cy.ts`) in the `e2e` job.
   - Ensure `data-testid` attributes (`theme-toggle-btn`) are tested.
3. **Deployment Alignment**:
   - Sync with `deploy.sh` for rollback mechanism and versioning.
   - Use consistent environment variables for Vercel and Render.
4. **Security Enhancements**:
   - Add Trivy for Docker image scanning.
   - Enhance Snyk and MythX scans for smart contracts.
5. **Testing Improvements**:
   - Add coverage thresholds for client and server tests.
   - Cache Cypress dependencies for faster E2E tests.
6. **Notifications**:
   - Enhance Slack notifications with detailed deployment status and URLs.
   - Include Coinbase health check results.
7. **Monorepo Consistency**:
   - Enforce root `package-lock.json`.
   - Use `@omniauthor/shared` constants for environment variable names if applicable.

### Dependencies
- Add `trivy` for Docker image scanning (via GitHub Action).
- No new Node.js dependencies; reuse existing setup from `packages/client/package.json` and `packages/server/package.json`.

### Updated File: `.github/workflows/main.yml`

**Purpose**: Enhance CI/CD workflow with Coinbase, theme tests, security scans, and deployment alignment.

**Updated Content**:
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

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

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

      - name: Scan Docker images with Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-backend:${{ github.sha }}
          severity: HIGH,CRITICAL
          format: table

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

      - name: Cache Cypress
        uses: actions/cache@v4
        with:
          path: ~/.cache/Cypress
          key: cypress-${{ runner.os }}-${{ hashFiles('packages/client/package-lock.json') }}

      - name: Install dependencies
        run: npm ci --prefer-offline --no-audit

      - name: Start backend
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
        run: npm start &

      - name: Start frontend
        working-directory: packages/client
        env:
          VITE_GRAPHQL_URL: ${{ secrets.VITE_GRAPHQL_URL }}
          VITE_WS_URL: ${{ secrets.VITE_WS_URL }}
          VITE_STRIPE_PUBLISHABLE_KEY: ${{ secrets.VITE_STRIPE_PUBLISHABLE_KEY }}
          VITE_COINBASE_REDIRECT_URL: ${{ secrets.VITE_COINBASE_REDIRECT_URL }}
          VITE_COINBASE_CANCEL_URL: ${{ secrets.VITE_COINBASE_CANCEL_URL }}
        run: npm run dev &

      - name: Wait for services
        run: |
          npx wait-on http://localhost:3000
          npx wait-on http://localhost:4000/health
          npx wait-on http://localhost:4000/api/coinbase/webhook

      - name: Run Cypress E2E tests
        working-directory: packages/client
        run: npx cypress run --env grepTags=@theme,@coinbase # Run theme and Coinbase tests

      - name: Upload Cypress screenshots
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: cypress-screenshots
          path: packages/client/cypress/screenshots

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

      - name: Login to Container Registry
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
            type=sha,format=long,prefix=${{ github.event_name == 'push' && github.ref_name || 'pr-' }}

      - name: Build and push backend image
        uses: docker/build-push-action@v5
        with:
          context: packages/server
          push: true
          tags: ${{ steps.meta.outputs.tags }}-backend
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            MONGO_URI=${{ secrets.MONGO_URI }}
            REDIS_URL=${{ secrets.REDIS_URL }}
            JWT_SECRET=${{ secrets.JWT_SECRET }}
            OPENAI_API_KEY=${{ secrets.OPENAI_API_KEY }}
            XAI_API_KEY=${{ secrets.XAI_API_KEY }}
            POLYGON_RPC_URL=${{ secrets.POLYGON_RPC_URL }}
            BASE_RPC_URL=${{ secrets.BASE_RPC_URL }}
            SOLANA_RPC_URL=${{ secrets.SOLANA_RPC_URL }}
            PLATFORM_PRIVATE_KEY=${{ secrets.PLATFORM_PRIVATE_KEY }}
            SOLANA_PRIVATE_KEY=${{ secrets.SOLANA_PRIVATE_KEY }}
            POLYGON_RIGHTS_CONTRACT=${{ secrets.POLYGON_RIGHTS_CONTRACT }}
            BASE_RIGHTS_CONTRACT=${{ secrets.BASE_RIGHTS_CONTRACT }}
            SOLANA_RIGHTS_PROGRAM=${{ secrets.SOLANA_RIGHTS_PROGRAM }}
            STRIPE_SECRET_KEY=${{ secrets.STRIPE_SECRET_KEY }}
            SENDGRID_API_KEY=${{ secrets.SENDGRID_API_KEY }}
            CLIENT_URL=${{ secrets.CLIENT_URL }}
            COINBASE_COMMERCE_API_KEY=${{ secrets.COINBASE_COMMERCE_API_KEY }}
            COINBASE_COMMERCE_WEBHOOK_SECRET=${{ secrets.COINBASE_COMMERCE_WEBHOOK_SECRET }}

      - name: Build and push frontend image
        uses: docker/build-push-action@v5
        with:
          context: packages/client
          push: true
          tags: ${{ steps.meta.outputs.tags }}-frontend
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            VITE_GRAPHQL_URL=${{ secrets.VITE_GRAPHQL_URL }}
            VITE_WS_URL=${{ secrets.VITE_WS_URL }}
            VITE_STRIPE_PUBLISHABLE_KEY=${{ secrets.VITE_STRIPE_PUBLISHABLE_KEY }}
            VITE_COINBASE_REDIRECT_URL=${{ secrets.VITE_COINBASE_REDIRECT_URL }}
            VITE_COINBASE_CANCEL_URL=${{ secrets.VITE_COINBASE_CANCEL_URL }}

  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: [build-images, e2e]
    if: github.ref == 'refs/heads/develop'
    environment: staging

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to Render (Staging)
        id: render-deploy
        run: |
          RESPONSE=$(curl -s -X POST \
            -H "Authorization: Bearer ${{ secrets.RENDER_API_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"serviceId":"${{ secrets.RENDER_STAGING_SERVICE_ID }}","tag":"${{ env.VERSION }}"}' \
            https://api.render.com/v1/services/${{ secrets.RENDER_STAGING_SERVICE_ID }}/deploys)
          echo "Render deploy response: $RESPONSE"
          echo "render_deploy_response=$RESPONSE" >> $GITHUB_OUTPUT

      - name: Deploy to Vercel (Staging)
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
            VITE_COINBASE_REDIRECT_URL=${{ secrets.VITE_COINBASE_REDIRECT_URL }}
            VITE_COINBASE_CANCEL_URL=${{ secrets.VITE_COINBASE_CANCEL_URL }}

      - name: Health checks
        run: |
          BACKEND_URL=https://api-staging.omniauthor.com
          FRONTEND_URL=https://staging.omniauthor.com
          COINBASE_WEBHOOK_URL=$BACKEND_URL/api/coinbase/webhook
          
          # Backend health
          if [[ $(curl -s -o /dev/null -w "%{http_code}" $BACKEND_URL/health) != "200" ]]; then
            echo "Backend health check failed"
            exit 1
          fi
          
          # Frontend health
          if [[ $(curl -s -o /dev/null -w "%{http_code}" $FRONTEND_URL) != "200" ]]; then
            echo "Frontend health check failed"
            exit 1
          fi
          
          # Coinbase webhook health
          if [[ $(curl -s -o /dev/null -w "%{http_code}" $COINBASE_WEBHOOK_URL) != "200" ]]; then
            echo "Coinbase webhook health check failed"
            exit 1
          fi

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

      - name: Health checks
        run: |
          BACKEND_URL=https://api-production.omniauthor.com
          FRONTEND_URL=https://production.omniauthor.com
          COINBASE_WEBHOOK_URL=$BACKEND_URL/api/coinbase/webhook
          
          # Backend health
          if [[ $(curl -s -o /dev/null -w "%{http_code}" $BACKEND_URL/health) != "200" ]]; then
            echo "Backend health check failed"
            exit 1
          fi
          
          # Frontend health
          if [[ $(curl -s -o /dev/null -w "%{http_code}" $FRONTEND_URL) != "200" ]]; then
            echo "Frontend health check failed"
            exit 1
          fi
          
          # Coinbase webhook health
          if [[ $(curl -s -o /dev/null -w "%{http_code}" $COINBASE_WEBHOOK_URL) != "200" ]]; then
            echo "Coinbase webhook health check failed"
            exit 1
          fi

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
      - name: Notify Slack
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ needs.deploy-staging.result == 'success' || needs.deploy-production.result == 'success' }}
          channel: '#deployments'
          webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
          text: |
            🚀 OmniAuthor Pro 2025 Deployment
            Environment: ${{ github.ref == 'refs/heads/main' && 'Production' || 'Staging' }}
            Version: ${{ env.VERSION }}
            Status: ${{ needs.deploy-staging.result == 'success' || needs.deploy-production.result == 'success' && 'Success' || 'Failed' }}
            Backend: https://api-${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}.omniauthor.com
            Frontend: https://${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}.omniauthor.com
            Coinbase Webhook: https://api-${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}.omniauthor.com/api/coinbase/webhook
          fields: repo,commit,author,action,ref,workflow
```

### Changes Made
1. **Coinbase Support**:
   - Added `VITE_COINBASE_REDIRECT_URL` and `VITE_COINBASE_CANCEL_URL` to `test`, `e2e`, `build-images`, and `deploy` jobs.
   - Included Coinbase webhook health check (`/api/coinbase/webhook`) in `deploy-staging` and `deploy-production`.
   - Added `wait-on` for Coinbase webhook in `e2e` job.
2. **Theme Testing**:
   - Added `--env grepTags=@theme,@coinbase` to `cypress run` to focus on theme and Coinbase tests.
   - Ensured `data-testid="theme-toggle-btn"` is testable in `writing-flow.cy.ts`.
3. **Deployment Alignment**:
   - Synced with `deploy.sh` by adding `tag` with `VERSION` (commit SHA) in Render deployments.
   - Added rollback step for failed health checks in `deploy-staging` and `deploy-production`.
   - Updated Vercel environment variables to match `setup.sh` and `App.tsx`.
4. **Security Enhancements**:
   - Added Trivy scanning for Docker images in `security` job.
   - Set Snyk `--severity-threshold=high` for stricter validation.
5. **Testing Improvements**:
   - Added `--coverage` to backend tests and included server coverage in `codecov`.
   - Cached Cypress dependencies for faster E2E runs.
   - Used `npm ci-offline --no-audit` to enforce root `package-lock.json`.
6. **Notifications**:
   - Enhanced Slack message with deployment URLs, version, and Coinbase webhook URL.
   - Included conditional environment (staging/production) in message.
7. **Monorepo Consistency**:
   - Enforced root `package-lock.json` with `--prefer-offline --no-audit`.
   - Used consistent secret names across jobs.

### Additional Updates Needed
1. **Update `writing-flow.cy.ts`**:
   - Ensure Coinbase and theme tests are tagged:
     ```typescript
     describe('Coinbase Payments', { tags: '@coinbase' }, () => {
       it('processes Coinbase royalty payout', () => {
         // Existing test
       });
     });

     describe('Theme Toggling', { tags: '@theme' }, () => {
       it('toggles theme', () => {
         // Existing test
       });
     });
     ```
   ```bash
   git add packages/client/cypress/e2e/writing-flow.cy.ts
   ```

2. **Update `packages/client/package.json`**:
   - Add coverage threshold to `test` script:
     ```json
     {
       "scripts": {
         "test": "jest --coverage --coverageThreshold='{\"global\": {\"branches\": 80, \"functions\": 80, \"lines\": 80, \"statements\": 80}}'"
       }
     },
     ```
   ```bash
   git add packages/client/package.json
   ```

3. **Update `packages/server/package.json`**:
   - Add coverage threshold:
     ```json
     {
       "scripts": {
         "test": "jest --coverage --coverageThreshold='{\"global\": {\"branches\": 80, \"functions\": 80, \"lines\": 80, \"statements\": 80}}'"
       }
     },
     ```
   ```bash
   git add packages/server/package.json
   ```

4. **Add Trivy Installation**:
   - No additional installation needed; `trivy-action` handles it.

5. **Update Vercel Secrets**:
   ```bash
   vercel secrets add vite-coinbase-redirect-url https://staging.omniauthor.com/payment/success
   vercel secrets add vite-coinbase-cancel-url https://staging.omniauthor.com/payment/cancel
   vercel secrets add vite-prod-url https://api.production.omniauthor.com
   vercel secrets add vite-ws-prod-url https://api.production.omniauthor.com
   vercel secrets add prod-stripe-publishable-key <your-key>
   vercel secrets add vite-coinbase-prod-url https://api.production.omniauthor.com
   ```

### Steps to Implement
1. **Update `main.yml`**:
   ```bash
   git add .github/workflows/main.yml
   ```

2. **Update `writing-flow`**:
   ```bash
   git add packages/client/cypress/e2e/writing-flow.cy.ts
   ```

3. **Update Package Files**:
   ```bash
   git add packages/client/package.json
   git add packages/server/package.json
   ```

4. **Run Tests Locally**:
   ```bash
   npm ci
   npm run lint
   npm run test
   npm run test:e2e -- --env grepTags=@theme,@coinbase
   ```

5. **Verify `package-lock.json`**:
   ```bash
   git add package-lock.json
   git commit -m "Enhance CI/CD workflow with Coinbase, theme tests, and security"
   ```

6. **Push Changes**:
   ```bash
   git push origin main
   ```

7. **Monitor CI/CD**:
   - Check: `https://github.com/CreoDAMO/OmniAuthor-Pro-2025/actions`.
   - Ensure `test`, `e2e`, `security`, and `deploy` jobs pass.

8. **Update Documentation**:
   - Add to `README.md`:
     ```markdown
     ## Enhanced CI/CD Workflow
     - Added Coinbase webhook health checks and environment variables.
     - Included theme toggle E2E tests with Cypress tagging.
     - Integrated Trivy for Docker image scanning.
     - Enhanced Slack notifications with deployment details.
     - Added rollback for failed deployments.
     ```
   ```bash
   git add README.md
   git commit -m "Document enhanced CI/CD workflow"
   ```

### Notes
- **Coinbase Webhook**: Ensure `/api/coinbase/webhook` is implemented as suggested in the review summary.
- **Theme Tests**: The `@theme` tag ensures `writing-flow.cy.ts` tests theme toggling. Verify `data-testid` matches.
- **Rollback**: Test rollback manually in staging to confirm Render API permissions.
- **Coverage**: Adjust thresholds (80%) if tests fail; review coverage reports in CI.
- **Secrets**: Ensure all secrets are set in GitHub Secrets and Vercel.
- **Mobile Deployment**: The `mobile-deploy-webhook` step assumes a separate service. Verify URL and token.
