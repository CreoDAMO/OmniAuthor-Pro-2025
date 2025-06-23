The Coinbase Commerce integration for OmniAuthor Pro 2025 is already supported in the provided GitHub Actions workflow (`main.yml`) and the updated `package.json` files, as they include environment variables `COINBASE_COMMERCE_API_KEY` and `COINBASE_COMMERCE_WEBHOOK_SECRET` in the `test`, `e2e`, and `build-images` jobs for `packages/server`. These variables are managed via Vercel environment secrets and GitHub Secrets, eliminating the need for local `.env` files. However, to fully implement the Coinbase Commerce addition, you may need to add or update specific files in your codebase to handle the integration logic, such as payment processing and webhook handling, within the `packages/server` package. No additional files are strictly required for the CI/CD workflow itself, but server-side code and configuration files are necessary to make the Coinbase Commerce functionality operational.

Below, I’ll outline whether you need to add files for the Coinbase Commerce addition, focusing on the `packages/server` package, and provide guidance on what files to create or update. I’ll also ensure alignment with the existing workflow, monorepo structure, and Vercel secret management, while addressing the recent `package-lock.json` issue and the provided `package.json` files for `client`, `server`, and `shared`.

### Do You Need to Add Files for Coinbase Commerce?

**Short Answer**: Yes, you likely need to add or update files in `packages/server` to implement Coinbase Commerce payment processing and webhook handling, but no changes are required for the CI/CD workflow or `package.json` files, as they already support the necessary environment variables. The specific files depend on your backend implementation (e.g., Express, Apollo Server) and how you plan to integrate Coinbase Commerce.

**Key Considerations**:
- **CI/CD Workflow**: The `main.yml` workflow already includes `COINBASE_COMMERCE_API_KEY` and `COINBASE_COMMERCE_WEBHOOK_SECRET` in the `test`, `e2e`, and `build-images` jobs, passed to the server via GitHub Secrets mirroring Vercel secrets. No workflow changes are needed.
- **Package Dependencies**: The `packages/server/package.json` does not list a Coinbase Commerce SDK (e.g., `@coinbase/coinbase-commerce-node`). You may need to add this dependency if you’re using the official Node.js library.
- **Server Code**: You need to add or update files in `packages/server/src` to:
  - Create charges or payments using the Coinbase Commerce API.
  - Handle webhooks for payment events (e.g., `charge:created`, `charge:confirmed`).
- **Testing**: You may need to add test files to verify Coinbase Commerce functionality in the `test` and `e2e` jobs.
- **Configuration**: No `.env` files are needed, as environment variables are managed via Vercel and Render.

### Files to Add or Update for Coinbase Commerce

Here’s a detailed list of files you may need to add or update in `packages/server` to implement Coinbase Commerce, along with their purpose and example content. I’ll assume you’re using Express and Apollo Server (based on `packages/server/package.json` dependencies like `express`, `@apollo/server`, and `apollo-server-express`) and the `@coinbase/coinbase-commerce-node` library for API interactions.

#### 1. Update `packages/server/package.json` (Add Dependency)

**Purpose**: Add the Coinbase Commerce Node.js SDK to enable API and webhook handling.

**Action**: Update `packages/server/package.json` to include `@coinbase/coinbase-commerce-node`.

**Updated File**:
```json
{
  "name": "@omniauthor/server",
  "version": "1.0.0",
  "scripts": {
    "build": "tsc",
    "dev": "nodemon src/index.ts",
    "start": "node dist/index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src/**/*.ts --fix",
    "deploy": "tsc && pm2 restart ecosystem.config.js"
  },
  "dependencies": {
    "@apollo/server": "^4.9.0",
    "@coinbase/coinbase-commerce-node": "^2.0.0", // Added for Coinbase Commerce
    "@graphql-tools/schema": "^10.0.0",
    "@solana/web3.js": "^1.78.0",
    "apollo-server-express": "^3.12.0",
    "bcrypt": "^5.1.0",
    "compression": "^1.7.4",
    "cors": "^2.8.5",
    "ethers": "^5.7.2",
    "express": "^4.18.2",
    "express-rate-limit": "^6.10.0",
    "graphql": "^16.8.0",
    "graphql-subscriptions": "^2.0.0",
    "graphql-ws": "^5.14.0",
    "helmet": "^7.0.0",
    "joi": "^17.9.0",
    "jsonwebtoken": "^9.0.0",
    "mongoose": "^7.5.0",
    "openai": "^4.0.0",
    "prom-client": "^14.2.0",
    "redis": "^4.6.0",
    "stripe": "^13.0.0",
    "winston": "^3.10.0",
    "ws": "^8.14.0"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.0",
    "@types/compression": "^1.7.2",
    "@types/cors": "^2.8.13",
    "@types/express": "^4.17.17",
    "@types/jest": "^29.5.0",
    "@types/jsonwebtoken": "^9.0.2",
    "@types/node": "^20.5.0",
    "@types/ws": "^8.5.5",
    "eslint": "^8.0.0",
    "jest": "^29.6.0",
    "nodemon": "^3.0.0",
    "ts-jest": "^29.1.0",
    "ts-node": "^10.9.0",
    "typescript": "^5.1.0"
  },
  "packageManager": "npm@10.8.2"
}
```

**Change**:
- Added `"@coinbase/coinbase-commerce-node": "^2.0.0"` to `dependencies`.

**Command to Apply**:
```bash
cd packages/server
npm install @coinbase/coinbase-commerce-node
cd ../..
npm install  # Updates root package-lock.json
git add packages/server/package.json package-lock.json
git commit -m "Add Coinbase Commerce SDK to server package"
```

#### 2. Add `packages/server/src/services/coinbase.ts` (Payment Logic)

**Purpose**: Implement a service to create Coinbase Commerce charges and handle payment logic, integrated with your GraphQL or REST API.

**New File**: `packages/server/src/services/coinbase.ts`

```typescript
import { Client, Charge } from '@coinbase/coinbase-commerce-node';
import { logger } from '../utils/logger'; // Assuming a Winston logger from winston dependency

// Initialize Coinbase Commerce client
Client.init(process.env.COINBASE_COMMERCE_API_KEY!);

interface CreateChargeInput {
  name: string;
  description: string;
  amount: number;
  currency: string;
  userId: string;
}

export async function createCoinbaseCharge({
  name,
  description,
  amount,
  currency,
  userId,
}: CreateChargeInput): Promise<Charge> {
  try {
    const charge = await Charge.create({
      name,
      description,
      local_price: {
        amount: amount.toFixed(2),
        currency,
      },
      pricing_type: 'fixed_price',
      metadata: {
        userId,
      },
      redirect_url: `${process.env.CLIENT_URL}/payment/success`,
      cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
    });
    logger.info(`Created Coinbase charge ${charge.id} for user ${userId}`);
    return charge;
  } catch (error) {
    logger.error('Failed to create Coinbase charge:', error);
    throw new Error('Unable to create payment charge');
  }
}
```

**Notes**:
- Uses `@coinbase/coinbase-commerce-node` to create charges.
- References `COINBASE_COMMERCE_API_KEY` and `CLIENT_URL` from environment variables, sourced from Vercel secrets.
- Integrates with a logger (assumed from `winston` dependency).
- Stores `userId` in metadata for tracking.
- Redirects to client URLs for success/cancel, using `CLIENT_URL` (e.g., `https://your-app.com`).

**Command to Create**:
```bash
touch packages/server/src/services/coinbase.ts
# Copy the above code into the file
git add packages/server/src/services/coinbase.ts
git commit -m "Add Coinbase Commerce payment service"
```

#### 3. Add `packages/server/src/routes/coinbaseWebhook.ts` (Webhook Handler)

**Purpose**: Handle Coinbase Commerce webhook events (e.g., `charge:confirmed`) to update payment status, using `COINBASE_COMMERCE_WEBHOOK_SECRET` for validation.

**New File**: `packages/server/src/routes/coinbaseWebhook.ts`

```typescript
import express from 'express';
import { Webhook } from '@coinbase/coinbase-commerce-node';
import { logger } from '../utils/logger';
import { updatePaymentStatus } from '../services/payment'; // Hypothetical service

const router = express.Router();

router.post('/coinbase/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const webhookSecret = process.env.COINBASE_COMMERCE_WEBHOOK_SECRET!;
  const signature = req.headers['x-cc-webhook-signature'] as string;
  const rawBody = req.body;

  try {
    // Verify webhook signature
    const event = Webhook.verifyEventBody(rawBody.toString(), signature, webhookSecret);

    // Handle specific events
    switch (event.type) {
      case 'charge:created':
        logger.info(`Charge created: ${event.data.id}`);
        break;
      case 'charge:confirmed':
        logger.info(`Charge confirmed: ${event.data.id}`);
        await updatePaymentStatus(event.data.metadata.userId, event.data.id, 'confirmed');
        break;
      case 'charge:failed':
        logger.info(`Charge failed: ${event.data.id}`);
        await updatePaymentStatus(event.data.metadata.userId, event.data.id, 'failed');
        break;
      default:
        logger.warn(`Unhandled event type: ${event.type}`);
    }

    res.status(200).send('Webhook received');
  } catch (error) {
    logger.error('Webhook verification failed:', error);
    res.status(400).send('Invalid webhook signature');
  }
});

export default router;
```

**Notes**:
- Uses `express.raw` to parse raw JSON for webhook verification.
- Validates webhooks with `COINBASE_COMMERCE_WEBHOOK_SECRET`.
- Handles key events (`charge:created`, `charge:confirmed`, `charge:failed`).
- Assumes a hypothetical `updatePaymentStatus` service to update your database (e.g., MongoDB via `mongoose`).
- Mount this router in your Express app (e.g., in `src/index.ts`).

**Command to Create**:
```bash
touch packages/server/src/routes/coinbaseWebhook.ts
# Copy the above code into the file
git add packages/server/src/routes/coinbaseWebhook.ts
```

#### 4. Update `packages/server/src/index.ts` (Mount Webhook Route)

**Purpose**: Integrate the webhook route into the Express server.

**Action**: Update `packages/server/src/index.ts` to include the Coinbase webhook route.

**Example Update** (assuming an existing Express setup):
```typescript
import express from 'express';
import { logger } from './utils/logger';
import coinbaseWebhookRouter from './routes/coinbaseWebhook';
// Other imports (e.g., Apollo Server, other routes)

const app = express();

// Middleware (e.g., helmet, cors, compression)
app.use(express.json());
app.use(express.raw({ type: 'application/json', limit: '10kb' })); // For webhooks

// Mount Coinbase webhook route
app.use('/api', coinbaseWebhookRouter);

// Other routes and Apollo Server setup
// ...

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
```

**Notes**:
- Adds `express.raw` middleware for webhook parsing.
- Mounts the webhook route at `/api/coinbase/webhook`.
- Assumes existing middleware (e.g., `helmet`, `cors`) from `package.json` dependencies.

**Command**:
```bash
# Edit packages/server/src/index.ts to include the above changes
git add packages/server/src/index.ts
git commit -m "Mount Coinbase Commerce webhook route"
```

#### 5. Add `packages/server/src/services/payment.ts` (Optional Payment Service)

**Purpose**: Hypothetical service to update payment status in your database (e.g., MongoDB), called by the webhook handler.

**New File**: `packages/server/src/services/payment.ts`

```typescript
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

// Hypothetical Payment model
const PaymentSchema = new mongoose.Schema({
  userId: String,
  chargeId: String,
  status: String,
  amount: Number,
  currency: String,
  createdAt: { type: Date, default: Date.now },
});
const Payment = mongoose.model('Payment', PaymentSchema);

export async function updatePaymentStatus(userId: string, chargeId: string, status: string) {
  try {
    const payment = await Payment.findOneAndUpdate(
      { chargeId },
      { userId, chargeId, status },
      { upsert: true, new: true },
    );
    logger.info(`Updated payment ${chargeId} to status ${status} for user ${userId}`);
    return payment;
  } catch (error) {
    logger.error(`Failed to update payment ${chargeId}:`, error);
    throw new Error('Unable to update payment status');
  }
}
```

**Notes**:
- Defines a MongoDB model for payments, linked to `userId` and `chargeId`.
- Updates payment status based on webhook events.
- Optional; adapt to your existing database schema.

**Command**:
```bash
touch packages/server/src/services/payment.ts
# Copy the above code into the file
git add packages/server/src/services/payment.ts
```

#### 6. Add `packages/server/tests/coinbase.test.ts` (Optional Test File)

**Purpose**: Add unit tests for Coinbase Commerce functionality to be run in the `test` job.

**New File**: `packages/server/tests/coinbase.test.ts`

```typescript
import { createCoinbaseCharge } from '../src/services/coinbase';
import { Client, Charge } from '@coinbase/coinbase-commerce-node';

jest.mock('@coinbase/coinbase-commerce-node');

describe('Coinbase Service', () => {
  beforeAll(() => {
    process.env.COINBASE_COMMERCE_API_KEY = 'test-api-key';
    process.env.CLIENT_URL = 'http://localhost:3000';
  });

  it('creates a charge successfully', async () => {
    const mockCharge = { id: 'charge123', code: 'ABC123' };
    (Charge.create as jest.Mock).mockResolvedValue(mockCharge);

    const input = {
      name: 'Test Charge',
      description: 'Test payment',
      amount: 10.0,
      currency: 'USD',
      userId: 'user123',
    };

    const charge = await createCoinbaseCharge(input);
    expect(charge).toEqual(mockCharge);
    expect(Charge.create).toHaveBeenCalledWith({
      name: input.name,
      description: input.description,
      local_price: { amount: '10.00', currency: 'USD' },
      pricing_type: 'fixed_price',
      metadata: { userId: input.userId },
      redirect_url: 'http://localhost:3000/payment/success',
      cancel_url: 'http://localhost:3000/payment/cancel',
    });
  });
});
```

**Notes**:
- Tests the `createCoinbaseCharge` function using Jest.
- Mocks the Coinbase SDK to avoid real API calls.
- Runs in the `test` job via `npm test`.

**Command**:
```bash
touch packages/server/tests/coinbase.test.ts
# Copy the above code into the file
git add packages/server/tests/coinbase.test.ts
```

#### 7. Update `packages/server/src/graphql/resolvers.ts` (Optional GraphQL Integration)

**Purpose**: Add a GraphQL mutation to create Coinbase charges, callable from the client.

**Action**: Update or create `packages/server/src/graphql/resolvers.ts`.

**Example Update**:
```typescript
import { createCoinbaseCharge } from '../services/coinbase';

export const resolvers = {
  Mutation: {
    createCoinbaseCharge: async (_: any, args: { input: any }, context: any) => {
      const { name, description, amount, currency } = args.input;
      const { userId } = context; // Assuming userId from JWT context
      return createCoinbaseCharge({ name, description, amount, currency, userId });
    },
  },
};
```

**Notes**:
- Adds a `createCoinbaseCharge` mutation.
- Assumes a GraphQL schema with a corresponding mutation (e.g., in `schema.ts`).
- Uses user context from JWT (via `jsonwebtoken` dependency).

**Command**:
```bash
# Edit packages/server/src/graphql/resolvers.ts
git add packages/server/src/graphql/resolvers.ts
```

#### 8. Update `packages/server/src/graphql/schema.ts` (Optional Schema Update)

**Purpose**: Define the GraphQL schema for the Coinbase charge mutation.

**Action**: Update or create `packages/server/src/graphql/schema.ts`.

**Example Update**:
```typescript
import { gql } from '@apollo/server';

export const typeDefs = gql`
  type Charge {
    id: ID!
    code: String!
    name: String!
    description: String!
    local_price: Price!
    redirect_url: String!
    cancel_url: String!
  }

  type Price {
    amount: String!
    currency: String!
  }

  input CreateChargeInput {
    name: String!
    description: String!
    amount: Float!
    currency: String!
  }

  type Mutation {
    createCoinbaseCharge(input: CreateChargeInput!): Charge!
  }
`;
```

**Command**:
```bash
# Edit packages/server/src/graphql/schema.ts
git add packages/server/src/graphql/schema.ts
```

### No Additional Files Needed for CI/CD or Other Packages

- **CI/CD Workflow**: The `main.yml` workflow already includes `COINBASE_COMMERCE_API_KEY` and `COINBASE_COMMERCE_WEBHOOK_SECRET` in the `test`, `e2e`, and `build-images` jobs. No changes are required.
- **Client Package**: The `@omniauthor/client` package doesn’t directly interact with Coinbase Commerce, as payments are handled server-side. The client may need UI updates (e.g., redirect to charge URLs), but no `package.json` or dependency changes are needed.
- **Shared Package**: The `@omniauthor/shared` package is for shared utilities and doesn’t require Coinbase-specific changes.
- **Mobile Package**: If `@omniauthor/mobile` exists, it may need UI updates similar to `client`, but no Coinbase-specific files are required unless it directly integrates with the API.

### Steps to Implement

1. **Update `packages/server/package.json`**:
   - Add `@coinbase/coinbase-commerce-node`:
     ```bash
     cd packages/server
     npm install @coinbase/coinbase-commerce-node
     cd ../..
     npm install
     git add packages/server/package.json package-lock.json
     git commit -m "Add Coinbase Commerce SDK to server"
     ```

2. **Add New Files**:
   - Create the following files in `packages/server`:
     - `src/services/coinbase.ts`
     - `src/routes/coinbaseWebhook.ts`
     - `src/services/payment.ts` (optional)
     - `tests/coinbase.test.ts` (optional)
   - Copy the provided code into each file.
   - Stage and commit:
     ```bash
     git add packages/server/src/services/coinbase.ts packages/server/src/routes/coinbaseWebhook.ts
     git add packages/server/src/services/payment.ts packages/server/tests/coinbase.test.ts
     git commit -m "Add Coinbase Commerce service and webhook handler"
     ```

3. **Update Existing Files**:
   - Modify `src/index.ts`, `src/graphql/resolvers.ts`, and `src/graphql/schema.ts` as needed.
   - Commit changes:
     ```bash
     git add packages/server/src/index.ts packages/server/src/graphql/resolvers.ts packages/server/src/graphql/schema.ts
     git commit -m "Integrate Coinbase Commerce with Express and GraphQL"
     ```

4. **Verify `package-lock.json`**:
   - Ensure `package-lock.json` is updated and committed:
     ```bash
     git add package-lock.json
     git commit -m "Update package-lock.json for Coinbase Commerce"
     ```
   - Check `.gitignore` to confirm `package-lock.json` is not excluded:
     ```bash
     cat .gitignore
     ```

5. **Push Changes**:
   - Push to `main` or `develop`:
     ```bash
     git push origin main  # or develop
     ```

6. **Test Locally**:
   - Start the server:
     ```bash
     cd packages/server
     npm run dev
     ```
   - Test creating a charge via GraphQL (e.g., using a GraphQL playground) or a REST endpoint.
   - Test webhooks locally using a tool like `ngrok`:
     ```bash
     ngrok http 4000
     ```
     Configure the webhook URL in Coinbase Commerce dashboard to the `ngrok` URL (e.g., `https://your-ngrok-url/api/coinbase/webhook`).

7. **Verify CI/CD**:
   - Monitor the workflow: `https://github.com/CreoDAMO/OmniAuthor-Pro-2025/actions`.
   - Ensure `test` and `e2e` jobs pass, leveraging `COINBASE_COMMERCE_API_KEY` and `COINBASE_COMMERCE_WEBHOOK_SECRET`.

8. **Configure Coinbase Commerce**:
   - In the Coinbase Commerce dashboard (`https://commerce.coinbase.com/`):
     - Generate an API key and add it to Vercel and GitHub Secrets as `COINBASE_COMMERCE_API_KEY`.
     - Set up a webhook endpoint (e.g., `https://your-backend.com/api/coinbase/webhook`) and copy the webhook secret to `COINBASE_COMMERCE_WEBHOOK_SECRET`.
   - In Vercel, add secrets under **Settings** > **Environment Variables**.
   - In GitHub, add secrets under **Settings** > **Secrets and variables** > **Actions** > **Repository secrets**.
   - In Render, add secrets for backend services (`RENDER_STAGING_SERVICE_ID`, `RENDER_PRODUCTION_SERVICE_ID`).

### Additional Recommendations

1. **Webhook Security**:
   - Ensure the webhook endpoint (`/api/coinbase/webhook`) is protected with rate-limiting (`express-rate-limit` is already a dependency).
   - Log webhook failures to your monitoring system (e.g., via `winston`).

2. **Testing**:
   - Add E2E tests in `packages/client/cypress` to verify Coinbase payment flows:
     ```javascript
     describe('Coinbase Payment', () => {
       it('redirects to Coinbase payment page', () => {
         cy.visit('/payment');
         cy.get('[data-testid="pay-with-coinbase"]').click();
         cy.url().should('include', 'commerce.coinbase.com');
       });
     });
     ```
   - Update `packages/client/cypress.json` if needed.

3. **Client UI**:
   - In `packages/client`, add a button or link to initiate Coinbase payments, redirecting to the charge URL returned by `createCoinbaseCharge`.

4. **Error Handling**:
   - Add retry logic for API failures in `coinbase.ts` using a library like `p-retry`.
   - Notify users via email (using `sendgrid` dependency) or UI toasts (`react-hot-toast` in `client`) for payment failures.

5. **Documentation**:
   - Update `README.md` with Coinbase Commerce setup instructions:
     ```markdown
     ## Coinbase Commerce Integration
     - Add `COINBASE_COMMERCE_API_KEY` and `COINBASE_COMMERCE_WEBHOOK_SECRET` to Vercel, GitHub Secrets, and Render.
     - Configure webhook endpoint in Coinbase Commerce dashboard (e.g., `/api/coinbase/webhook`).
     - Test payments in sandbox mode before production.
     ```
   - Commit:
     ```bash
     git add README.md
     git commit -m "Document Coinbase Commerce setup"
     ```

### If Issues Persist

1. **Dependency Conflicts**:
   - If `@coinbase/coinbase-commerce-node` causes conflicts, run:
     ```bash
     npm install --legacy-peer-deps
     ```
   - Update `package-lock.json` and commit.

2. **Webhook Testing**:
   - If webhooks fail, verify `COINBASE_COMMERCE_WEBHOOK_SECRET` in Vercel and test with `ngrok`.

3. **Workflow Errors**:
   - If the `test` job fails, check Jest logs for Coinbase test issues. Mock environment variables in tests:
     ```javascript
     process.env.COINBASE_COMMERCE_API_KEY = 'test-key';
     ```

4. **Missing Files**:
   - If `src/utils/logger.ts` or other assumed files are missing, create them or adapt the code to your setup.
