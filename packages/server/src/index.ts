import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { makeExecutableSchema } from '@graphql-tools/schema';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import mongoose from 'mongoose';
import { register } from 'prom-client';
import dotenv from 'dotenv';


import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import { authMiddleware } from './middleware/auth';
import { subscriptionMiddleware } from './middleware/subscription';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { redisClient } from './config/redis';


dotenv.config();


const app = express();
const httpServer = createServer(app);


// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));


app.use(cors({
  origin: process.env.CLIENT_URLs?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));


app.use(compression());


// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);


app.use(express.json({ limit: '50mb' }));


// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});


// Metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});


// GraphQL Schema
const schema = makeExecutableSchema({ typeDefs, resolvers });


// WebSocket Server for subscriptions
const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql',
});


const serverCleanup = useServer({
  schema,
  context: async (ctx) => {
    // Add subscription context
    return { user: ctx.extra.user };
  },
}, wsServer);


// Apollo Server
const server = new ApolloServer({
  schema,
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose();
          },
        };
      },
    },
  ],
});


async function startServer() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI!, {
      retryWrites: true,
      w: 'majority',
    });
    logger.info('Connected to MongoDB');


    // Connect to Redis
    await redisClient.connect();
    logger.info('Connected to Redis');


    // Start Apollo Server
    await server.start();


    // Apply GraphQL middleware
    app.use('/graphql', 
      authMiddleware,
      subscriptionMiddleware,
      expressMiddleware(server, {
        context: async ({ req }) => ({
          user: req.user,
          subscription: req.subscription,
        }),
      })
    );


    // Error handling
    app.use(errorHandler);


    const PORT = process.env.PORT || 4000;
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server ready at http://localhost:${PORT}/graphql`);
      logger.info(`🔗 WebSocket ready at ws://localhost:${PORT}/graphql`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}


// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await server.stop();
  await mongoose.connection.close();
  await redisClient.quit();
  process.exit(0);
});


startServer();
