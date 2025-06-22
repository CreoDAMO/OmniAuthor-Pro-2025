FROM node:18-alpine AS builder


WORKDIR /app


# Copy package files
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/server/package*.json ./packages/server/


# Install dependencies
RUN npm ci


# Copy source code
COPY packages/shared ./packages/shared
COPY packages/server ./packages/server


# Build shared package
WORKDIR /app/packages/shared
RUN npm run build


# Build server
WORKDIR /app/packages/server
RUN npm run build


# Production image
FROM node:18-alpine AS production


WORKDIR /app


# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S omniauthor -u 1001


# Copy package files and install production dependencies
COPY packages/server/package*.json ./
RUN npm ci --only=production && npm cache clean --force


# Copy built application
COPY --from=builder --chown=omniauthor:nodejs /app/packages/server/dist ./dist
COPY --from=builder --chown=omniauthor:nodejs /app/packages/shared/dist ./node_modules/@omniauthor/shared/dist


# Set up health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/healthcheck.js


USER omniauthor


EXPOSE 4000


CMD ["node", "dist/index.js"]
