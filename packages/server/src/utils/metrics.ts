import { register, Counter, Histogram, Gauge } from 'prom-client';


// HTTP Metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});


export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
});


// GraphQL Metrics
export const graphqlRequestDuration = new Histogram({
  name: 'graphql_request_duration_seconds',
  help: 'Duration of GraphQL requests in seconds',
  labelNames: ['operation_name', 'operation_type'],
});


export const graphqlErrorsTotal = new Counter({
  name: 'graphql_errors_total',
  help: 'Total number of GraphQL errors',
  labelNames: ['operation_name', 'error_type'],
});


// AI Metrics
export const aiRequestsTotal = new Counter({
  name: 'ai_requests_total',
  help: 'Total number of AI requests',
  labelNames: ['type', 'model'],
});


export const aiErrorsTotal = new Counter({
  name: 'ai_errors_total',
  help: 'Total number of AI errors',
  labelNames: ['type', 'error_code'],
});


export const aiRequestDuration = new Histogram({
  name: 'ai_request_duration_seconds',
  help: 'Duration of AI requests in seconds',
  labelNames: ['type'],
  buckets: [1, 5, 10, 30, 60, 120],
});


// WebSocket Metrics
export const websocketConnections = new Gauge({
  name: 'websocket_connections_total',
  help: 'Total number of active WebSocket connections',
});


// User Metrics
export const userSessions = new Gauge({
  name: 'user_sessions_total',
  help: 'Total number of active user sessions',
  labelNames: ['subscription_tier'],
});


export const userRegistrations = new Counter({
  name: 'user_registrations_total',
  help: 'Total number of user registrations',
  labelNames: ['subscription_tier'],
});


// Content Metrics
export const manuscriptsCreated = new Counter({
  name: 'manuscripts_created_total',
  help: 'Total number of manuscripts created',
  labelNames: ['genre'],
});


export const wordsWritten = new Counter({
  name: 'words_written_total',
  help: 'Total number of words written',
  labelNames: ['source'], // 'human' or 'ai'
});


// Blockchain Metrics
export const blockchainTransactions = new Counter({
  name: 'blockchain_transactions_total',
  help: 'Total number of blockchain transactions',
  labelNames: ['chain', 'type', 'status'],
});


export const blockchainFees = new Counter({
  name: 'blockchain_fees_total',
  help: 'Total blockchain fees collected',
  labelNames: ['chain'],
});


// Revenue Metrics
export const subscriptionRevenue = new Counter({
  name: 'subscription_revenue_total',
  help: 'Total subscription revenue',
  labelNames: ['tier'],
});


export const platformFees = new Counter({
  name: 'platform_fees_total',
  help: 'Total platform fees collected',
});


// Database Metrics
export const databaseConnections = new Gauge({
  name: 'database_connections_active',
  help: 'Number of active database connections',
  labelNames: ['database'],
});


export const databaseQueryDuration = new Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'collection'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
});


// Cache Metrics
export const cacheHits = new Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_name'],
});


export const cacheMisses = new Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_name'],
});


// Register all metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
register.registerMetric(graphqlRequestDuration);
register.registerMetric(graphqlErrorsTotal);
register.registerMetric(aiRequestsTotal);
register.registerMetric(aiErrorsTotal);
register.registerMetric(aiRequestDuration);
register.registerMetric(websocketConnections);
register.registerMetric(userSessions);
register.registerMetric(userRegistrations);
register.registerMetric(manuscriptsCreated);
register.registerMetric(wordsWritten);
register.registerMetric(blockchainTransactions);
register.registerMetric(blockchainFees);
register.registerMetric(subscriptionRevenue);
register.registerMetric(platformFees);
register.registerMetric(databaseConnections);
register.registerMetric(databaseQueryDuration);
register.registerMetric(cacheHits);
register.registerMetric(cacheMisses);
