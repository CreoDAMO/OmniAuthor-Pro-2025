FROM node:18-alpine AS builder


WORKDIR /app


# Copy package files
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/client/package*.json ./packages/client/


# Install dependencies
RUN npm ci


# Copy source code
COPY packages/shared ./packages/shared
COPY packages/client ./packages/client


# Build shared package
WORKDIR /app/packages/shared
RUN npm run build


# Build client
WORKDIR /app/packages/client
ARG VITE_GRAPHQL_URL
ARG VITE_WS_URL
RUN npm run build


# Production image
FROM nginx:alpine AS production


# Copy custom nginx config
COPY packages/client/nginx.conf /etc/nginx/nginx.conf


# Copy built application
COPY --from=builder /app/packages/client/dist /usr/share/nginx/html


# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1


EXPOSE 80


CMD ["nginx", "-g", "daemon off;"]
