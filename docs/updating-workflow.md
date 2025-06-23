To update the provided GitHub Actions CI/CD workflow (`OmniAuthor Pro CI/CD`) to use Vercel environment secrets for all `.env` variables, eliminating the need for local `.env` files, we need to ensure that all environment variables previously defined in `packages/server/.env`, `packages/client/.env`, and any additional ones (e.g., for Coinbase Commerce) are stored in Vercel and accessed appropriately in the workflow. The workflow already uses some secrets (e.g., `secrets.VERCEL_TOKEN`, `secrets.RENDER_API_KEY`), but we’ll modify it to rely entirely on Vercel environment secrets for runtime configuration and remove any reliance on local `.env` files. Additionally, we’ll incorporate Coinbase Commerce variables as requested.

### Key Changes to the Workflow

1. **Remove `.env` File Dependencies**:
   - The workflow currently sets some environment variables directly in the YAML (e.g., `MONGO_URI`, `REDIS_URL`, `JWT_SECRET` in the `test` and `e2e` jobs). These will be replaced with references to Vercel environment secrets or GitHub Secrets, which should mirror the Vercel configuration.
   - The `build-images` job builds Docker images for `packages/server` and `packages/client`. We’ll ensure Docker containers fetch environment variables from Vercel or the deployment platform (Render for backend, Vercel for frontend).
   - The `deploy-staging` and `deploy-production` jobs will rely on Vercel’s environment secrets for frontend deployments and Render’s environment variables for backend deployments.

2. **Incorporate Coinbase Commerce Variables**:
   - Add `COINBASE_COMMERCE_API_KEY` and `COINBASE_COMMERCE_WEBHOOK_SECRET` to the list of variables stored in Vercel for the backend (`packages/server`).
   - Ensure these are available in the `test`, `e2e`, `build-images`, and deployment jobs where relevant.

3. **Update Secret References**:
   - Replace hardcoded or locally defined environment variables with GitHub Secrets that correspond to Vercel environment secrets.
   - Use the Vercel CLI to pull environment variables for local testing if needed, but primarily rely on Vercel’s runtime environment for deployments.

4. **Environment-Specific Configuration**:
   - Ensure variables are scoped to the appropriate Vercel environments (Production, Preview, Development, or custom like Staging).
   - Update the workflow to pass necessary secrets to Render and Vercel deployments.

5. **Security Considerations**:
   - Ensure all sensitive variables (e.g., `JWT_SECRET`, `COINBASE_COMMERCE_API_KEY`, `PLATFORM_PRIVATE_KEY`) are marked as sensitive in Vercel and stored securely in GitHub Secrets.
   - Avoid exposing sensitive variables in logs or CI/CD outputs.

### Updated Environment Variables

Based on the previous context, the complete list of environment variables for OmniAuthor Pro 2025 (including Coinbase Commerce) to be stored in Vercel is:

#### `packages/server` Variables
| **Variable Name**           | **Purpose**                                                                 | **Sensitive** |
|-----------------------------|-----------------------------------------------------------------------------|---------------|
| `MONGO_URI`                 | MongoDB connection string                                                   | Yes           |
| `REDIS_URL`                 | Redis connection string                                                     | Yes           |
| `JWT_SECRET`                | Secret for signing JWTs                                                     | Yes           |
| `OPENAI_API_KEY`            | OpenAI API key for AI services                                              | Yes           |
| `XAI_API_KEY`               | xAI/Grok API key for AI-driven features                                     | Yes           |
| `POLYGON_RPC_URL`           | RPC URL for Polygon zkEVM                                                   | No            |
| `BASE_RPC_URL`              | RPC URL for Base blockchain                                                 | No            |
| `SOLANA_RPC_URL`            | RPC URL for Solana blockchain                                               | No            |
| `PLATFORM_PRIVATE_KEY`      | Private key for Ethereum-compatible wallet                                  | Yes           |
| `SOLANA_PRIVATE_KEY`        | Private key for Solana wallet                                               | Yes           |
| `POLYGON_RIGHTS_CONTRACT`   | Address of Polygon rights management contract                               | No            |
| `BASE_RIGHTS_CONTRACT`      | Address of Base rights management contract                                  | No            |
| `SOLANA_RIGHTS_PROGRAM`     | Solana rights management program ID                                         | No            |
| `STRIPE_SECRET_KEY`         | Stripe secret key for payments                                              | Yes           |
| `SENDGRID_API_KEY`          | SendGrid API key for emails                                                 | Yes           |
| `CLIENT_URL`                | Comma-separated list of allowed client origins                              | No            |
| `COINBASE_COMMERCE_API_KEY` | Coinbase Commerce API key for crypto payments                               | Yes           |
| `COINBASE_COMMERCE_WEBHOOK_SECRET` | Secret for validating Coinbase Commerce webhooks                   | Yes           |

#### `packages/client` Variables
| **Variable Name**                 | **Purpose**                                                                 | **Sensitive** |
|-----------------------------------|-----------------------------------------------------------------------------|---------------|
| `VITE_GRAPHQL_URL`                | GraphQL API endpoint URL                                                    | No            |
| `VITE_WS_URL`                     | WebSocket URL for real-time subscriptions                                   | No            |
| `VITE_STRIPE_PUBLISHABLE_KEY`     | Stripe publishable key for client-side payments                             | Yes           |

#### Deployment Variables (CI/CD)
These are typically stored in GitHub Secrets, not Vercel, as they’re used for deployment orchestration:
| **Variable Name**                 | **Purpose**                                                                 | **Sensitive** |
|-----------------------------------|-----------------------------------------------------------------------------|---------------|
| `RENDER_API_KEY`                  | API key for Render deployments                                              | Yes           |
| `VERCEL_TOKEN`                    | Token for Vercel deployments                                                | Yes           |
| `VERCEL_ORG_ID`                   | Vercel organization ID                                                      | Yes           |
| `VERCEL_PROJECT_ID`               | Vercel project ID                                                          | Yes           |
| `RENDER_PRODUCTION_SERVICE_ID`    | Render production service ID                                                | Yes           |
| `RENDER_STAGING_SERVICE_ID`       | Render staging service ID                                                  | Yes           |
| `GRAFANA_API_KEY`                 | API key for Grafana dashboard updates                                       | Yes           |
| `SLACK_WEBHOOK_URL`               | Webhook URL for Slack notifications (optional)                              | Yes           |
| `MOBILE_DEPLOY_TOKEN`             | Token for triggering mobile app deployments                                 | Yes           |
| `MOBILE_DEPLOY_WEBHOOK`           | Webhook URL for mobile app deployments                                      | Yes           |
| `SNYK_TOKEN`                      | Token for Snyk security scans                                               | Yes           |
| `MYTHX_API_KEY`                   | API key for MythX smart contract audits                                     | Yes           |

### Storing Variables in Vercel

1. **Add to Vercel Environment Secrets**:
   - In the Vercel dashboard, go to your project’s **Settings** > **Environment Variables**.
   - Add each variable from the `server` and `client` lists above, specifying the environment (Production, Preview, Development, or Staging).
   - Mark sensitive variables (e.g., `JWT_SECRET`, `COINBASE_COMMERCE_API_KEY`) as **Sensitive**.
   - Example:
     - Key: `MONGO_URI`, Value: `mongodb://<user>:<pass>@<host>/omniauthor`, Environment: All, Sensitive: Yes.
     - Key: `VITE_GRAPHQL_URL`, Value: `https://your-backend.com/graphql`, Environment: All, Sensitive: No.
     - Key: `COINBASE_COMMERCE_API_KEY`, Value: `your_coinbase_api_key`, Environment: All, Sensitive: Yes.

2. **Sync with GitHub Secrets**:
   - For CI/CD, store the same variables in GitHub Secrets to ensure the workflow can access them during testing and deployment.
   - In your GitHub repository, go to **Settings** > **Secrets and variables** > **Actions** > **Secrets** > **Repository secrets**.
   - Add each variable, mirroring the Vercel configuration. For example:
     - `MONGO_URI`, `REDIS_URL`, `JWT_SECRET`, etc.
     - `COINBASE_COMMERCE_API_KEY`, `COINBASE_COMMERCE_WEBHOOK_SECRET`.
   - Deployment-specific secrets (e.g., `VERCEL_TOKEN`, `RENDER_API_KEY`) should already be in GitHub Secrets, as shown in the workflow.

3. **Remove Local `.env` Files**:
   - Ensure `.env` files (`packages/server/.env`, `packages/client/.env`) are removed from the repository and added to `.gitignore`.
   - Update your local development setup to use `vercel env pull .env.local` or `vercel dev` to fetch environment variables.

### Updated GitHub Actions Workflow

Below is the updated `ci.yml` workflow, modified to use Vercel environment secrets and GitHub Secrets for all `.env` variables, including Coinbase Commerce. Changes are highlighted in comments.

```yml
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
        run: npm ci

      - name: Lint codebase
        run: npm run lint

      - name: Run shared package tests
        working-directory: packages/shared
        run: npm test

      - name: Run backend tests
        working-directory: packages/server
        env:
          # Replaced hardcoded values with GitHub Secrets mirroring Vercel
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
        run: npm test

      - name: Run frontend tests
        working-directory: packages/client
        env:
          # Use secrets for client variables
          VITE_GRAPHQL_URL: ${{ secrets.VITE_GRAPHQL_URL }}
          VITE_WS_URL: ${{ secrets.VITE_WS_URL }}
          VITE_STRIPE_PUBLISHABLE_KEY: ${{ secrets.VITE_STRIPE_PUBLISHABLE_KEY }}
        run: npm test -- --coverage

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          directory: ./packages/client/coverage

      - name: Build backend
        working-directory: packages/server
        run: npm run build

      - name: Build frontend
        working-directory: packages/client
        env:
          VITE_GRAPHQL_URL: ${{ secrets.VITE_GRAPHQL_URL }}
          VITE_WS_URL: ${{ secrets.VITE_WS_URL }}
          VITE_STRIPE_PUBLISHABLE_KEY: ${{ secrets.VITE_STRIPE_PUBLISHABLE_KEY }}
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
        run: npm ci

      - name: Run security audit
        run: npm audit --audit-level=moderate

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

      - name: Run smart contract audit
        working-directory: packages/contracts
        run: |
          npm install -g @mythx/cli
          mythx analyze --api-key ${{ secrets.MYTHX_API_KEY }} contracts/

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

      - name: Install dependencies
        run: npm ci

      - name: Start backend
        working-directory: packages/server
        env:
          # Use secrets for all backend variables
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
        run: npm run dev &

      - name: Wait for services
        run: |
          npx wait-on http://localhost:3000
          npx wait-on http://localhost:4000/health

      - name: Run Cypress E2E tests
        working-directory: packages/client
        run: npx cypress run

      - name: Upload Cypress screenshots
        uses: actions/upload-artifact@v3
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

      - name: Build and push backend image
        uses: docker/build-push-action@v5
        with:
          context: packages/server
          push: true
          tags: ${{ steps.meta.outputs.tags }}-backend
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          # Pass environment variables to Docker build
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
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.RENDER_API_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"serviceId":"${{ secrets.RENDER_STAGING_SERVICE_ID }}"}' \
            https://api.render.com/v1/services/${{ secrets.RENDER_STAGING_SERVICE_ID }}/deploys

      - name: Deploy to Vercel (Staging)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: packages/client
          # Ensure Vercel pulls environment variables from its secrets
          env: |
            VITE_GRAPHQL_URL=${{ secrets.VITE_GRAPHQL_URL }}
            VITE_WS_URL=${{ secrets.VITE_WS_URL }}
            VITE_STRIPE_PUBLISHABLE_KEY=${{ secrets.VITE_STRIPE_PUBLISHABLE_KEY }}

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [build-images, e2e]
    if: github.ref == 'refs/heads/main'
    environment: production

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy backend to Render (Production)
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.RENDER_API_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"serviceId":"${{ secrets.RENDER_PRODUCTION_SERVICE_ID }}"}' \
            https://api.render.com/v1/services/${{ secrets.RENDER_PRODUCTION_SERVICE_ID }}/deploys

      - name: Deploy frontend to Vercel (Production)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          working-directory: packages/client
          env: |
            VITE_GRAPHQL_URL=${{ secrets.VITE_GRAPHQL_URL }}
            VITE_WS_URL=${{ secrets.VITE_WS_URL }}
            VITE_STRIPE_PUBLISHABLE_KEY=${{ secrets.VITE_STRIPE_PUBLISHABLE_KEY }}

      - name: Update mobile app stores
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.MOBILE_DEPLOY_TOKEN }}" \
            ${{ secrets.MOBILE_DEPLOY_WEBHOOK }}

  notify:
    name: Notify Team
    runs-on: ubuntu-latest
    needs: [deploy-production]
    if: always()

    steps:
      - name: Notify Slack
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ needs.deploy-production.result }}
          channel: '#deployments'
          webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}  # Updated to match variable name
          fields: repo,message,commit,author,action,eventName,ref,workflow
```

### Key Changes Made

1. **Test Job**:
   - Replaced hardcoded `MONGO_URI`, `REDIS_URL`, and `JWT_SECRET` with `secrets.TEST_MONGO_URI`, `secrets.TEST_REDIS_URL`, and `secrets.JWT_SECRET`.
   - Added all backend variables (including `COINBASE_COMMERCE_API_KEY`, `COINBASE_COMMERCE_WEBHOOK_SECRET`) as GitHub Secrets to ensure tests have access to the full environment.
   - Updated frontend tests to use `secrets.VITE_*` variables consistently.

2. **E2E Job**:
   - Updated the `Start backend` step to include all backend variables from GitHub Secrets, mirroring Vercel’s configuration.
   - Ensured frontend variables are sourced from secrets for consistency.

3. **Build-Images Job**:
   - Added `build-args` to pass all environment variables to the Docker build process for both backend and frontend images.
   - This ensures the Docker images can access the same variables as Vercel’s runtime environment, though Render and Vercel will override these with their own environment secrets during deployment.

4. **Deploy-Staging and Deploy-Production Jobs**:
   - Added `env` field to the Vercel deployment steps to explicitly pass client-side variables (`VITE_*`), ensuring consistency with Vercel’s environment secrets.
   - For Render deployments (backend), ensured that environment variables are set in Render’s dashboard to match Vercel’s secrets for consistency (e.g., `MONGO_URI`, `COINBASE_COMMERCE_API_KEY`).

5. **Notify Job**:
   - Updated `SLACK_WEBHOOK` to `SLACK_WEBHOOK_URL` to match the variable name used elsewhere.

6. **Coinbase Commerce Integration**:
   - Added `COINBASE_COMMERCE_API_KEY` and `COINBASE_COMMERCE_WEBHOOK_SECRET` to the `test` and `e2e` jobs, ensuring they’re available for backend tests and runtime.
   - These variables should be added to Vercel’s environment secrets for the backend (under Production, Preview, Development, and Staging) and mirrored in GitHub Secrets.

### Setting Up Vercel and GitHub Secrets

1. **Vercel Environment Secrets**:
   - In the Vercel dashboard, add all variables listed above under **Settings** > **Environment Variables**.
   - Scope variables to appropriate environments:
     - Production: Use production values (e.g., `MONGO_URI` for MongoDB Atlas, `VITE_GRAPHQL_URL` for production backend).
     - Preview/Development: Use test/staging values (e.g., `TEST_MONGO_URI`, `TEST_REDIS_URL`).
     - Staging: Use staging-specific values if applicable.
   - Mark sensitive variables (e.g., `JWT_SECRET`, `COINBASE_COMMERCE_API_KEY`, `PLATFORM_PRIVATE_KEY`) as **Sensitive**.

2. **GitHub Secrets**:
   - In your GitHub repository, go to **Settings** > **Secrets and variables** > **Actions** > **Secrets** > **Repository secrets**.
   - Add all variables, mirroring Vercel’s configuration. For example:
     - `TEST_MONGO_URI`, `TEST_REDIS_URL`, `JWT_SECRET`, `COINBASE_COMMERCE_API_KEY`, etc.
     - Deployment secrets: `RENDER_API_KEY`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, etc.
   - Ensure variable names match those used in the workflow (e.g., `VITE_GRAPHQL_URL`, not `GRAPHQL_URL`).

3. **Render Environment Variables**:
   - Since the backend is deployed to Render, add all `packages/server` variables (including `COINBASE_COMMERCE_API_KEY`, `COINBASE_COMMERCE_WEBHOOK_SECRET`) to Render’s environment variables in the Render dashboard:
     - Go to your Render service > **Environment** > **Environment Variables**.
     - Add each variable (e.g., `MONGO_URI`, `REDIS_URL`, `COINBASE_COMMERCE_API_KEY`).
     - Use the same values as in Vercel for consistency, especially for shared variables like `CLIENT_URL`.

### Additional Notes

- **Local Development**:
  - For local development without `.env` files, run:
    ```bash
    vercel env pull .env.local
    ```
    This pulls Development environment variables from Vercel to `.env.local`. Add `.env.local` to `.gitignore`.
  - Alternatively, use `vercel dev` to fetch variables directly from Vercel.

- **Docker and Render**:
  - The `build-images` job passes environment variables as build arguments, but Render deployments will use variables configured in the Render dashboard. Ensure all backend variables are set in Render to match Vercel’s secrets.
  - If your Dockerfiles expect `.env` files, update them to rely on `process.env` directly, as Render and Vercel inject environment variables at runtime.

- **Coinbase Commerce**:
  - Ensure your backend code (in `packages/server`) uses `process.env.COINBASE_COMMERCE_API_KEY` and `process.env.COINBASE_COMMERCE_WEBHOOK_SECRET` for payment processing and webhook validation.
  - Test Coinbase Commerce integration in the `e2e` job by including mock webhook tests or using a testnet API key.

- **Security**:
  - Verify that sensitive variables are not logged in CI/CD outputs. Use Vercel’s sensitive variable feature and GitHub’s encrypted secrets.
  - For `PLATFORM_PRIVATE_KEY` and `SOLANA_PRIVATE_KEY`, consider using a secrets manager (e.g., HashiCorp Vault) to rotate keys securely and sync them to Vercel and Render.

- **Testing**:
  - The `test` and `e2e` jobs use `TEST_MONGO_URI` and `TEST_REDIS_URL` for test environments. Ensure these are set in GitHub Secrets and Vercel for Development/Preview environments, using test databases (e.g., MongoDB Atlas sandbox).

### Verification Steps

1. **Add Secrets**:
   - Add all variables to Vercel (dashboard or CLI) and GitHub Secrets.
   - Add backend variables to Render’s dashboard for staging and production services.

2. **Test Locally**:
   - Run `vercel dev` to ensure the application works with Vercel’s environment secrets.
   - Verify Coinbase Commerce integration by creating test charges and webhooks using a test API key.

3. **Run CI/CD**:
   - Push a change to the `develop` or `main` branch to trigger the workflow.
   - Check GitHub Actions logs to ensure tests, builds, and deployments succeed without `.env` files.

4. **Monitor Deployments**:
   - Verify that Vercel deployments (frontend) and Render deployments (backend) use the correct environment variables.
   - Test Coinbase Commerce payments in staging and production environments.

### Recommendations

- **Automate Secret Syncing**: Use a tool like Doppler or Infisical to sync secrets between Vercel, Render, and GitHub for consistency.
- **Environment-Specific Secrets**: If you need different values for staging vs. production (e.g., different `COINBASE_COMMERCE_API_KEY` for testnet vs. mainnet), use environment-specific secrets in Vercel and Render.
- **Documentation**: Update your `README.md` to document that all environment variables are managed in Vercel and Render, with instructions for adding new variables.
- **Webhook Testing**: For Coinbase Commerce, set up a staging webhook endpoint in Vercel or Render and test with `ngrok` locally to ensure `COINBASE_COMMERCE_WEBHOOK_SECRET` works.
