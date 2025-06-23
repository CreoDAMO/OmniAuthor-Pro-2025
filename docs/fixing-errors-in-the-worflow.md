The error in the GitHub Actions workflow indicates that the `actions/setup-node@v4` step in the `test` job failed because a dependencies lock file (`package-lock.json`, `npm-shrinkwrap.json`, or `yarn.lock`) is missing in the repository. This is critical for ensuring reproducible builds, as the lock file pins exact versions of dependencies. The workflow uses `npm ci` in the `test` job, which expects a `package-lock.json` by default for npm-based projects.

To resolve this issue, we need to ensure a lock file is generated, committed to the repository, and properly handled in the CI/CD workflow. Additionally, we’ll update the `main.yml` workflow to include checks or fallbacks for lock file presence and clarify dependency management. Since OmniAuthor Pro 2025 is a monorepo with multiple packages (`packages/shared`, `packages/server`, `packages/client`, `packages/contracts`), we’ll ensure lock files are managed correctly across all packages. We’ll also maintain the existing use of Vercel environment secrets and Coinbase Commerce integration, as no changes are needed there based on the error.

### Solution Overview

1. **Generate and Commit a Lock File**:
   - Since the workflow uses `npm ci`, we’ll assume npm is the primary package manager, requiring a `package-lock.json`.
   - For a monorepo, we’ll generate `package-lock.json` at the root and ensure each package’s dependencies are installed consistently.
   - If Yarn or another manager is preferred, we can adjust accordingly (let me know if you use Yarn).

2. **Update the Workflow**:
   - Add a step to verify the presence of `package-lock.json` before running `npm ci` to fail fast with a clear error.
   - Update dependency installation to handle monorepo structure, ensuring `npm ci` runs at the root and installs dependencies for all packages.
   - Document the requirement for a lock file in the workflow comments.

3. **Prevent Future Issues**:
   - Add a check in the `test` job to validate the lock file’s presence.
   - Recommend adding a `.gitignore` rule to exclude unnecessary files while ensuring `package-lock.json` is included.
   - Suggest updating the `README.md` or `CONTRIBUTING.md` to document dependency management practices.

### Steps to Fix Locally

Before updating the workflow, let’s resolve the missing lock file in your repository:

1. **Generate `package-lock.json`**:
   - Navigate to the root of your repository:
     ```bash
     cd /path/to/OmniAuthor-Pro-2025
     ```
   - Ensure a `package.json` exists at the root (common for monorepos using workspaces). If not, create one with:
     ```bash
     npm init -y
     ```
     Update `package.json` to include workspaces:
     ```json
     {
       "name": "omniauthor-pro-2025",
       "version": "1.0.0",
       "private": true,
       "workspaces": [
         "packages/shared",
         "packages/server",
         "packages/client",
         "packages/contracts"
       ]
     }
     ```
   - Run `npm install` to generate `package-lock.json` and install dependencies for all packages:
     ```bash
     npm install
     ```
     This creates `package-lock.json` at the root, locking dependencies for the monorepo.

2. **Commit the Lock File**:
   - Add and commit `package-lock.json`:
     ```bash
     git add package-lock.json
     git commit -m "Add package-lock.json for dependency management"
     git push origin main  # or develop, depending on your branch
     ```

3. **Verify `.gitignore`**:
   - Ensure `.gitignore` does **not** exclude `package-lock.json`. A typical `.gitignore` for a Node.js monorepo might look like:
     ```
     node_modules/
     dist/
     build/
     .env
     .env.local
     coverage/
     cypress/screenshots/
     *.log
     ```
   - Confirm `package-lock.json` is not listed in `.gitignore`.

### Updated Workflow (`main.yml`)

Below is the updated `main.yml` workflow, incorporating fixes for the lock file issue while preserving all existing functionality, including Vercel secrets and Coinbase Commerce integration. Changes include:

- Added a step to verify `package-lock.json` presence.
- Clarified `npm ci` usage for the monorepo.
- Added comments to document dependency management.
- Ensured consistency across jobs (`test`, `security`, `e2e`, `build-images`, `deploy-staging`, `deploy-production`, `notify`).

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

      - name: Verify package-lock.json exists
        # Added to fail fast if lock file is missing
        run: |
          if [ ! -f package-lock.json ]; then
            echo "Error: package-lock.json not found. Run 'npm install' locally and commit the lock file."
            exit 1
          fi

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        # Run npm ci at root for monorepo to install all package dependencies
        run: npm ci

      - name: Lint codebase
        run: npm run lint

      - name: Run shared package tests
        working-directory: packages/shared
        run: npm test

      - name: Run backend tests
        working-directory: packages/server
        env:
          # GitHub Secrets mirroring Vercel environment variables
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

      - name: Verify package-lock.json exists
        run: |
          if [ ! -f package-lock.json ]; then
            echo "Error: package-lock.json not found. Run 'npm install' locally and commit the lock file."
            exit 1
          fi

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

      - name: Verify package-lock.json exists
        run: |
          if [ ! -f package-lock.json ]; then
            echo "Error: package-lock.json not found. Run 'npm install' locally and commit the lock file."
            exit 1
          fi

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

      - name: Verify package-lock.json exists
        run: |
          if [ ! -f package-lock.json ]; then
            echo "Error: package-lock.json not found. Run 'npm install' locally and commit the lock file."
            exit 1
          fi

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
          webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
          fields: repo,message,commit,author,action,eventName,ref,workflow
```

### Key Changes

1. **Added `Verify package-lock.json exists` Step**:
   - Added in `test`, `security`, `e2e`, and `build-images` jobs to check for `package-lock.json` before running `npm ci`.
   - Fails fast with a clear error message if the lock file is missing, preventing the original error.

2. **Clarified Dependency Installation**:
   - Ensured `npm ci` runs at the root to install dependencies for all monorepo packages (`shared`, `server`, `client`, `contracts`).
   - Added comments to document that `npm ci` relies on `package-lock.json`.

3. **Preserved Existing Functionality**:
   - No changes to environment variables (`MONGO_URI`, `COINBASE_COMMERCE_API_KEY`, etc.), as they’re correctly sourced from GitHub Secrets mirroring Vercel.
   - Maintained all jobs (`test`, `security`, `e2e`, `build-images`, `deploy-staging`, `deploy-production`, `notify`) and their logic.

4. **No Changes to Deployment**:
   - Deployments to Render (backend) and Vercel (frontend) remain unchanged, as the lock file issue doesn’t affect them directly.
   - Environment variables for Vercel (`VITE_GRAPHQL_URL`, etc.) and Render are still sourced from secrets.

### Additional Recommendations

1. **Document Dependency Management**:
   - Update your `README.md` or create a `CONTRIBUTING.md` with instructions for dependency management:
     ```markdown
     ## Dependency Management
     OmniAuthor Pro 2025 uses npm for package management in a monorepo structure. To ensure reproducible builds:
     - Run `npm install` locally to install dependencies and generate `package-lock.json`.
     - Commit `package-lock.json` to the repository.
     - Use `npm ci` in CI/CD for consistent installations.
     - Do not use `npm install` in CI/CD, as it may modify `package-lock.json`.
     ```
   - Add a note about Vercel secrets for environment variables.

2. **Monorepo Package Lock Files**:
   - If individual packages (`packages/server`, `packages/client`, etc.) have their own `package.json` but no `package-lock.json`, the root `package-lock.json` should suffice for a monorepo with workspaces. Verify this by running:
     ```bash
     npm install
     npm run test
     ```
     in each package directory locally.
   - If you encounter issues, consider generating `package-lock.json` for each package, but this is typically unnecessary with a root-level lock file.

3. **Alternative Package Managers**:
   - If you prefer Yarn, replace `npm ci` with `yarn install --frozen-lockfile` and commit `yarn.lock` instead. Update the workflow accordingly:
     ```yml
     - name: Verify yarn.lock exists
       run: |
         if [ ! -f yarn.lock ]; then
           echo "Error: yarn.lock not found. Run 'yarn install' locally and commit the lock file."
           exit 1
         fi
     - name: Install dependencies
       run: yarn install --frozen-lockfile
     ```
   - Let me know if you use Yarn or pnpm, and I can tailor the workflow further.

4. **CI/CD Cache Optimization**:
   - The workflow already uses `cache: 'npm'` in `actions/setup-node@v4`. To further optimize, ensure the cache key is stable by relying on `package-lock.json`:
     ```yml
     - name: Setup Node.js
       uses: actions/setup-node@v4
       with:
         node-version: ${{ env.NODE_VERSION }}
         cache: 'npm'
         cache-dependency-path: package-lock.json
     ```

5. **Security Policy Alignment**:
   - The `SECURITY.md` created previously mentions dependency scanning (`npm audit`, Snyk). Ensure `package-lock.json` is audited in the `security` job, which is already handled by `npm audit --audit-level=moderate`.
   - Add a note in `SECURITY.md` about lock file requirements:
     ```markdown
     ### Dependency Management
     We use `package-lock.json` to ensure reproducible dependency installations. Contributors must commit `package-lock.json` to the repository to pass CI/CD checks.
     ```

6. **Test Locally**:
   - Before pushing the updated workflow, test locally:
     ```bash
     npm ci
     npm run lint
     npm run test
     ```
     in the root and each package directory to ensure dependencies are installed correctly.

### Verification Steps

1. **Commit `package-lock.json`**:
   - Run `npm install` locally, commit `package-lock.json`, and push to your repository:
     ```bash
     git add package-lock.json
     git commit -m "Add package-lock.json for dependency management"
     git push origin main  # or develop
     ```

2. **Update Workflow**:
   - Replace `.github/workflows/main.yml` with the updated version above.
   - Commit and push the workflow:
     ```bash
     git add .github/workflows/main.yml
     git commit -m "Update CI/CD workflow to verify package-lock.json"
     git push origin main
     ```

3. **Monitor GitHub Actions**:
   - Go to the **Actions** tab in your GitHub repository (`github.com/CreoDAMO/OmniAuthor-Pro-2025`).
   - Verify that the `test` job runs successfully without the lock file error.
   - Check subsequent jobs (`security`, `e2e`, etc.) to ensure they complete.

4. **Check Deployments**:
   - Confirm that `deploy-staging` (on `develop`) and `deploy-production` (on `main`) jobs deploy correctly to Render and Vercel, using the existing secrets.

5. **Update Documentation**:
   - Add dependency management instructions to `README.md` or `CONTRIBUTING.md`.
   - Optionally, update `SECURITY.md` to note the lock file requirement.

### If the Issue Persists

If the error reoccurs after committing `package-lock.json`, consider these troubleshooting steps:

1. **Verify Repository Structure**:
   - Ensure `package-lock.json` is at the root (`/OmniAuthor-Pro-2025/package-lock.json`).
   - Confirm `package.json` at the root includes `workspaces` for `packages/shared`, `packages/server`, `packages/client`, and `packages/contracts`.

2. **Check for Sub-Package Lock Files**:
   - If individual packages have their own `package-lock.json`, remove them to avoid conflicts:
     ```bash
     rm packages/*/package-lock.json
     git add packages/*/package-lock.json
     git commit -m "Remove sub-package lock files"
     git push
     ```

3. **Clear Cache**:
   - Clear the npm cache locally and in CI:
     ```bash
     npm cache clean --force
     ```
     In the workflow, add a cache-clearing step before `npm ci` (as a temporary measure):
     ```yml
     - name: Clear npm cache
       run: npm cache clean --force
     ```

4. **Debug CI Environment**:
   - Add a debug step in the `test` job to list files:
     ```yml
     - name: Debug directory contents
       run: ls -la
     ```
     Check the GitHub Actions logs to confirm `package-lock.json` is present.

5. **Switch to Yarn (Optional)**:
   - If npm issues persist, consider switching to Yarn for better monorepo support. Install Yarn, generate `yarn.lock`, and update the workflow as described above.

### Notes

- **Monorepo Context**: The workflow assumes a monorepo with a root `package.json` and `package-lock.json`. If your setup differs (e.g., independent packages without workspaces), let me know, and I can adjust the workflow.
- **Vercel Secrets**: The lock file issue doesn’t affect Vercel secrets (`VITE_GRAPHQL_URL`, `COINBASE_COMMERCE_API_KEY`, etc.), which are correctly configured in the workflow.
- **Coinbase Commerce**: No changes were needed for Coinbase Commerce integration, as the error is unrelated to environment variables.
- **Security Policy**: The fix aligns with the `SECURITY.md` by ensuring reproducible builds, which is critical for dependency security audits.

This updated workflow should resolve the missing lock file error and ensure robust CI/CD for OmniAuthor Pro 2025. Let me know if you need help generating `package-lock.json`, switching to Yarn, or debugging further issues! If you share your `package.json` or repository structure, I can provide more tailored guidance.
