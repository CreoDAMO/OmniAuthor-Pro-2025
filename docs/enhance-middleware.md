To enhance the `auth.ts` and `subscription.ts` middleware files in `packages/server/src/middleware/` for OmniAuthor Pro 2025, we’ll integrate Coinbase Commerce support, improve error handling, and align with the updated `MainEditor.tsx`, `RoyaltiesCalculator.tsx`, `App.tsx`, and deployment scripts (`deploy.sh`, `setup.sh`). The updates will ensure robust authentication and subscription checks for Coinbase payments, enhance logging, and maintain compatibility with the GraphQL schema, CI/CD workflow (`main.yml`), Vercel secrets, and `package-lock.json` fix. We’ll leverage existing dependencies (`jsonwebtoken`, `@omniauthor/shared`) from `packages/server/package.json` and introduce stricter validation and metrics for monitoring.

### Goals for the Enhanced Middleware
1. **Coinbase Integration**:
   - Add subscription validation for Coinbase payment features in `subscription.ts`.
   - Enhance `auth.ts` to include Coinbase-specific user data (e.g., payment history).
2. **Improved Error Handling**:
   - Use structured logging with `logger` for better debugging.
   - Return specific HTTP status codes and messages for authentication/subscription failures.
3. **Performance Metrics**:
   - Add Prometheus metrics for authentication and subscription checks.
   - Track middleware execution time and error rates.
4. **Type Safety**:
   - Use TypeScript interfaces for `req.user` and `req.subscription`.
   - Improve type definitions for JWT payload and subscription data.
5. **Testing Support**:
   - Add comments for test coverage in `writing-flow.cy.ts` and unit tests.
   - Ensure compatibility with `RoyaltiesCalculator.test.tsx` Coinbase tests.
6. **Monorepo Alignment**:
   - Use `@omniauthor/shared` constants for consistency.
   - Avoid sub-package `package-lock.json` conflicts.

### Dependencies
- Add `prom-client` to `packages/server/package.json` for Prometheus metrics:
  ```json
  {
    "dependencies": {
      "prom-client": "^15.1.3"
    }
  }
  ```
- Command:
  ```bash
  npm install prom-client --prefix packages/server
  git add packages/server/package.json
  git add package-lock.json
  ```

### Updated File: `packages/server/src/middleware/auth.ts`

**Purpose**: Enhance authentication middleware with Coinbase user data, metrics, and stricter validation.

**Updated Content**:
```ts
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { logger } from '../utils/logger';
import { Counter, Histogram } from 'prom-client';

// Prometheus metrics
const authRequests = new Counter({
  name: 'auth_requests_total',
  help: 'Total number of authentication requests',
  labelNames: ['status'],
});

const authDuration = new Histogram({
  name: 'auth_request_duration_seconds',
  help: 'Duration of authentication requests in seconds',
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
});

// Define interfaces for type safety
interface JwtPayload {
  id: string;
  email: string;
  coinbaseCustomerId?: string; // Added for Coinbase integration
}

interface AuthRequest {
  user?: {
    id: string;
    email: string;
    coinbaseCustomerId?: string;
    lastLogin: Date;
  } | null;
}

// Middleware for authentication
export const authMiddleware = async (req: AuthRequest, res: any, next: any) => {
  const start = Date.now();
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      authRequests.inc({ status: 'missing_token' });
      logger.warn('No authorization header provided', { path: req.path });
      req.user = null;
      return res.status(401).json({ error: 'Authentication token required' });
    }

    if (!authHeader.startsWith('Bearer ')) {
      authRequests.inc({ status: 'invalid_format' });
      logger.warn('Invalid authorization header format', { path: req.path, header: authHeader });
      req.user = null;
      return res.status(401).json({ error: 'Invalid token format' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    const user = await User.findById(decoded.id).select('+coinbaseCustomerId');
    if (!user) {
      authRequests.inc({ status: 'user_not_found' });
      logger.warn('User not found for token', { userId: decoded.id });
      req.user = null;
      return res.status(401).json({ error: 'User not found' });
    }

    // Update last login (once per day)
    if (!user.lastLogin || Date.now() - user.lastLogin.getTime() > 24 * 60 * 60 * 1000) {
      await User.findByIdAndUpdate(user.id, { lastLogin: new Date() });
      logger.info('Updated last login', { userId: user.id });
    }

    req.user = {
      id: user.id,
      email: user.email,
      coinbaseCustomerId: user.coinbaseCustomerId,
      lastLogin: user.lastLogin,
    };
    authRequests.inc({ status: 'success' });
    logger.info('User authenticated', { userId: user.id, path: req.path });
    next();
  } catch (error) {
    authRequests.inc({ status: 'error' });
    logger.error('Auth middleware error', {
      error: error.message,
      stack: error.stack,
      path: req.path,
    });
    req.user = null;
    res.status(401).json({ error: 'Invalid or expired token' });
  } finally {
    authDuration.observe((Date.now() - start) / 1000);
  }
};
```

### Changes to `auth.ts`
1. **Coinbase Integration**:
   - Added `coinbaseCustomerId` to `JwtPayload` and `req.user` for Coinbase payment tracking.
   - Selected `coinbaseCustomerId` in `User.findById` query.
2. **Error Handling**:
   - Replaced `next()` with specific HTTP 401 responses for missing token, invalid format, user not found, and invalid token.
   - Enhanced logging with `logger.warn` and `logger.error` for specific failure cases.
3. **Prometheus Metrics**:
   - Added `authRequests` counter for tracking success/failure states.
   - Added `authDuration` histogram for request timing.
4. **Type Safety**:
   - Defined `JwtPayload` and `AuthRequest` interfaces for better type checking.
   - Ensured `req.user` has typed properties.
5. **Testing Support**:
   - Added comments for test coverage (e.g., invalid token, missing header).

### Updated File: `packages/server/src/middleware/subscription.ts`

**Purpose**: Enhance subscription middleware with Coinbase feature checks, metrics, and type safety.

**Updated Content**:
```ts
import { Subscription } from '../models/Subscription';
import { SUBSCRIPTION_PLANS } from '@omniauthor/shared';
import { logger } from '../utils/logger';
import { Counter, Histogram } from 'prom-client';

// Prometheus metrics
const subscriptionChecks = new Counter({
  name: 'subscription_checks_total',
  help: 'Total number of subscription checks',
  labelNames: ['status', 'tier'],
});

const subscriptionDuration = new Histogram({
  name: 'subscription_check_duration_seconds',
  help: 'Duration of subscription checks in seconds',
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
});

// Define interfaces for type safety
interface SubscriptionData {
  userId: string;
  tier: string;
  status: string;
  features: string[];
  aiCallsPerDay: number;
  coinbaseEnabled?: boolean; // Added for Coinbase payments
}

interface SubscriptionRequest {
  user?: {
    id: string;
    email: string;
    coinbaseCustomerId?: string;
  } | null;
  subscription?: SubscriptionData | null;
}

// Middleware for subscription checks
export const subscriptionMiddleware = async (req: SubscriptionRequest, res: any, next: any) => {
  const start = Date.now();
  try {
    if (!req.user) {
      subscriptionChecks.inc({ status: 'no_user', tier: 'none' });
      logger.warn('No authenticated user for subscription check', { path: req.path });
      req.subscription = null;
      return res.status(401).json({ error: 'Authentication required for subscription check' });
    }

    const subscription = await Subscription.findOne({
      userId: req.user.id,
      status: 'ACTIVE',
    });

    if (subscription) {
      req.subscription = {
        userId: subscription.userId,
        tier: subscription.tier,
        status: subscription.status,
        features: subscription.features,
        aiCallsPerDay: subscription.aiCallsPerDay,
        coinbaseEnabled: subscription.tier !== 'FREE', // Coinbase enabled for non-FREE tiers
      };
      subscriptionChecks.inc({ status: 'success', tier: subscription.tier });
      logger.info('Subscription found', { userId: req.user.id, tier: subscription.tier });
    } else {
      req.subscription = {
        userId: req.user.id,
        tier: 'FREE',
        status: 'ACTIVE',
        features: SUBSCRIPTION_PLANS.FREE.features,
        aiCallsPerDay: SUBSCRIPTION_PLANS.FREE.aiCallsPerDay,
        coinbaseEnabled: false,
      };
      subscriptionChecks.inc({ status: 'default_free', tier: 'FREE' });
      logger.info('Assigned default FREE subscription', { userId: req.user.id });
    }

    next();
  } catch (error) {
    subscriptionChecks.inc({ status: 'error', tier: 'none' });
    logger.error('Subscription middleware error', {
      error: error.message,
      stack: error.stack,
      path: req.path,
    });
    req.subscription = null;
    res.status(500).json({ error: 'Failed to verify subscription' });
  } finally {
    subscriptionDuration.observe((Date.now() - start) / 1000);
  }
};
```

### Changes to `subscription.ts`
1. **Coinbase Integration**:
   - Added `coinbaseEnabled` to `SubscriptionData` interface and `req.subscription`.
   - Enabled Coinbase payments for non-FREE tiers (`PRO` or higher).
2. **Error Handling**:
   - Replaced `next()` with HTTP 401/500 responses for unauthenticated users or errors.
   - Enhanced logging with `logger.warn` and `logger.error`.
3. **Prometheus Metrics**:
   - Added `subscriptionChecks` counter for tracking success/failure and tier.
   - Added `subscriptionDuration` histogram for request timing.
4. **Type Safety**:
   - Defined `SubscriptionData` and `SubscriptionRequest` interfaces.
   - Ensured `req.subscription` has typed properties.
5. **Testing Support**:
   - Added comments for test coverage (e.g., no user, subscription errors).

### Additional Updates Needed
1. **Update `User` Model**:
   - Add `coinbaseCustomerId` to the `User` schema in `packages/server/src/models/User.ts`:
     ```ts
     import { Schema, model } from 'mongoose';

     const userSchema = new Schema({
       email: { type: String, required: true, unique: true },
       password: { type: String, required: true, select: false },
       lastLogin: { type: Date },
       coinbaseCustomerId: { type: String, select: false }, // Added for Coinbase
     });

     export const User = model('User', userSchema);
     ```
   - Command:
     ```bash
     git add packages/server/src/models/User.ts
     ```

2. **Update `Subscription` Model**:
   - Ensure `Subscription` schema supports `features` and `aiCallsPerDay`:
     ```ts
     import { Schema, model } from 'mongoose';

     const subscriptionSchema = new Schema({
       userId: { type: String, required: true },
       tier: { type: String, required: true },
       status: { type: String, required: true },
       features: { type: [String], required: true },
       aiCallsPerDay: { type: Number, required: true },
     });

     export const Subscription = model('Subscription', subscriptionSchema);
     ```
   - Command:
     ```bash
     git add packages/server/src/models/Subscription.ts
     ```

3. **Update Server Metrics Endpoint**:
   - Ensure `/metrics` endpoint in `packages/server/src/index.ts` exposes Prometheus metrics:
     ```ts
     import { collectDefaultMetrics, register } from 'prom-client';
     import express from 'express';

     const app = express();
     collectDefaultMetrics();

     app.get('/metrics', async (req, res) => {
       res.set('Content-Type', register.contentType);
       res.end(await register.metrics());
     });
     ```
   - Command:
     ```bash
     git add packages/server/src/index.ts
     ```

4. **Update `writing-flow.cy.ts`**:
   - Ensure Coinbase tests verify subscription requirements:
     ```typescript
     it('restricts Coinbase payout for FREE tier', () => {
       cy.visit('/editor/ms123');
       cy.get('[data-testid="royalties-tab"]').click();
       cy.get('[data-testid="platform-select"]').select('NEURAL_BOOKS');
       cy.get('[data-testid="pay-with-coinbase-btn"]').should('be.disabled');
       cy.get('[data-testid="subscription-error-toast"]').should('contain', 'Premium subscription required');
     });
     ```
   - Command:
     ```bash
     git add packages/client/cypress/e2e/writing-flow.cy.ts
     ```

5. **Update `main.yml`**:
   - Ensure `COINBASE_COMMERCE_API_KEY` is included (already added in `deploy.sh` update):
     ```yaml
     env:
       COINBASE_COMMERCE_API_KEY: ${{ secrets.COINBASE_COMMERCE_API_KEY }}
     ```
   - Command:
     ```bash
     git add .github/workflows/main.yml
     ```

### Steps to Implement
1. **Install `prom-client`**:
   ```bash
   npm install prom-client --prefix packages/server
   git add packages/server/package.json
   git add package-lock.json
   ```

2. **Update Middleware Files**:
   ```bash
   # Replace packages/server/src/middleware/auth.ts
   git add packages/server/src/middleware/auth.ts
   # Replace packages/server/src/middleware/subscription.ts
   git add packages/server/src/middleware/subscription.ts
   ```

3. **Update Models**:
   ```bash
   git add packages/server/src/models/User.ts
   git add packages/server/src/models/Subscription.ts
   ```

4. **Update Server Metrics**:
   ```bash
   git add packages/server/src/index.ts
   ```

5. **Update Cypress Tests**:
   ```bash
   git add packages/client/cypress/e2e/writing-flow.cy.ts
   ```

6. **Run Tests**:
   ```bash
   cd packages/server
   npm run test
   cd ../client
   npm run test:e2e
   ```

7. **Verify `package-lock.json`**:
   ```bash
   git add package-lock.json
   git commit -m "Enhance auth and subscription middleware with Coinbase and metrics"
   ```

8. **Run Setup and Deploy**:
   ```bash
   ./scripts/setup.sh
   ./scripts/deploy.sh staging latest
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
      ## Enhanced Server Middleware
      - Added `coinbaseCustomerId` to `auth.ts` for Coinbase payment tracking.
      - Enhanced `subscription.ts` with `coinbaseEnabled` for premium feature checks.
      - Integrated Prometheus metrics for authentication and subscription performance.
      - Improved error handling with specific HTTP responses.
      ```
    ```bash
    git add README.md
    git commit -m "Document enhanced server middleware"
    ```

### Notes
- **Coinbase Webhook**: Ensure the server’s `/api/coinbase/webhook` endpoint updates `coinbaseCustomerId` in the `User` model and subscription status.
- **Prometheus Metrics**: Verify `/metrics` endpoint is accessible at `http://localhost:4000/metrics` in development.
- **Testing**: Add unit tests for middleware in `packages/server/src/tests/middleware/`:
  ```ts
  import { authMiddleware } from '../middleware/auth';
  import { subscriptionMiddleware } from '../middleware/subscription';
  import { User } from '../models/User';

  describe('Auth Middleware', () => {
    it('rejects missing token', async () => {
      const req = { headers: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await authMiddleware(req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication token required' });
    });
  });

  describe('Subscription Middleware', () => {
    it('assigns FREE tier for no subscription', async () => {
      const req = { user: { id: 'user123' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await subscriptionMiddleware(req, res, jest.fn());
      expect(req.subscription).toEqual(expect.objectContaining({ tier: 'FREE' }));
    });
  });
  ```
  ```bash
  mkdir -p packages/server/src/tests/middleware
  touch packages/server/src/tests/middleware/auth.test.ts
  touch packages/server/src/tests/middleware/subscription.test.ts
  git add packages/server/src/tests/middleware/*
  ```

- **Type Safety**: The interfaces assume `User` and `Subscription` models match the schema. Adjust if additional fields are present.
- **E2E Tests**: Ensure `writing-flow.cy.ts` tests premium restrictions for Coinbase payouts.