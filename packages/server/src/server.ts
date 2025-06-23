import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 4000;

// Export app for testing
export { app };

// GraphQL Schema
const typeDefs = `#graphql
  type Query {
    hello: String
    health: Health
  }

  type Health {
    status: String!
    timestamp: String!
  }
`;

// Resolvers
const resolvers = {
  Query: {
    hello: () => 'Hello from OmniAuthor Pro!',
    health: () => ({
      status: 'ok',
      timestamp: new Date().toISOString()
    })
  }
};

async function startServer() {
  // Create Apollo Server
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  // Start the server
  await server.start();

  // Apply middleware
  app.use(cors());
  app.use(express.json());
  
  // Mount Apollo middleware
  app.use('/graphql', expressMiddleware(server));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });

  // Start server
  app.listen(Number(port), '0.0.0.0', () => {
    console.log(`🚀 Server running at http://0.0.0.0:${port}`);
    console.log(`📈 Health check at http://0.0.0.0:${port}/health`);
    console.log(`🎯 GraphQL endpoint at http://0.0.0.0:${port}/graphql`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
