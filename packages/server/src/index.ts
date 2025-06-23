import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import cors from 'cors';
import { typeDefs, resolvers } from './graphql/schema';

const app = express();
const port = parseInt(process.env.PORT || '4000', 10);

// Initialize basic middleware and routes
app.use(cors());
app.use(express.json());

// Health check endpoint (always available)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

async function startServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await server.start();
  app.use('/graphql', expressMiddleware(server));

  // Only start listening if not in test environment
  if (process.env.NODE_ENV !== 'test') {
    app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Server running at http://0.0.0.0:${port}`);
      console.log(`📈 Health check at http://0.0.0.0:${port}/health`);
      console.log(`🎯 GraphQL endpoint at http://0.0.0.0:${port}/graphql`);
    });
  }

  return app;
}

// Export app for testing
export { app };

// Start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}
