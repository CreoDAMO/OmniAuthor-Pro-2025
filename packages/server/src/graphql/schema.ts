export const typeDefs = `#graphql
  type Query {
    hello: String
  }
`;

export const resolvers = {
  Query: {
    hello: () => 'Hello from OmniAuthor Pro!'
  }
};
import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  type Query {
    hello: String
    health: Health
    manuscripts: [Manuscript]
    manuscript(id: ID!): Manuscript
  }

  type Mutation {
    createManuscript(input: ManuscriptInput!): Manuscript
    updateManuscript(id: ID!, input: ManuscriptInput!): Manuscript
    deleteManuscript(id: ID!): Boolean
    createUser(input: UserInput!): User
    login(email: String!, password: String!): AuthPayload
  }

  type Health {
    status: String!
    timestamp: String!
    version: String!
  }

  type User {
    id: ID!
    email: String!
    name: String!
    createdAt: String!
  }

  type Manuscript {
    id: ID!
    title: String!
    content: String!
    author: User!
    createdAt: String!
    updatedAt: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  input UserInput {
    email: String!
    password: String!
    name: String!
  }

  input ManuscriptInput {
    title: String!
    content: String!
  }
`;

export const resolvers = {
  Query: {
    hello: () => 'Hello from OmniAuthor Pro 2025!',
    health: () => ({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }),
    manuscripts: async () => {
      // Mock data for now
      return [
        {
          id: '1',
          title: 'Sample Manuscript',
          content: 'This is a sample manuscript content.',
          author: {
            id: '1',
            email: 'author@example.com',
            name: 'Sample Author',
            createdAt: new Date().toISOString()
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
    },
    manuscript: async (_, { id }) => {
      return {
        id,
        title: 'Sample Manuscript',
        content: 'This is a sample manuscript content.',
        author: {
          id: '1',
          email: 'author@example.com',
          name: 'Sample Author',
          createdAt: new Date().toISOString()
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
  },
  Mutation: {
    createManuscript: async (_, { input }) => {
      return {
        id: Date.now().toString(),
        title: input.title,
        content: input.content,
        author: {
          id: '1',
          email: 'author@example.com',
          name: 'Sample Author',
          createdAt: new Date().toISOString()
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    },
    updateManuscript: async (_, { id, input }) => {
      return {
        id,
        title: input.title,
        content: input.content,
        author: {
          id: '1',
          email: 'author@example.com',
          name: 'Sample Author',
          createdAt: new Date().toISOString()
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    },
    deleteManuscript: async (_, { id }) => {
      return true;
    },
    createUser: async (_, { input }) => {
      return {
        id: Date.now().toString(),
        email: input.email,
        name: input.name,
        createdAt: new Date().toISOString()
      };
    },
    login: async (_, { email, password }) => {
      return {
        token: 'mock-jwt-token',
        user: {
          id: '1',
          email,
          name: 'Sample User',
          createdAt: new Date().toISOString()
        }
      };
    }
  }
};
