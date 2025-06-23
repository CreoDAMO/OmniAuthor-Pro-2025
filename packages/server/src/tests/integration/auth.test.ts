import request from 'supertest';
import bcrypt from 'bcrypt';
import { app } from '../../index';
import { User } from '../../models/User';
import { connectTestDB, disconnectTestDB, clearTestDB } from '../utils/testDb';


describe('Authentication Integration Tests', () => {
  beforeAll(async () => {
    await connectTestDB();
  });


  afterAll(async () => {
    await disconnectTestDB();
  });


  beforeEach(async () => {
    await clearTestDB();
  });


  describe('POST /graphql - register mutation', () => {
    it('should register a new user successfully', async () => {
      const mutation = `
        mutation Register($input: RegisterInput!) {
          register(input: $input) {
            token
            user {
              id
              email
              name
              subscriptionTier
            }
          }
        }
      `;


      const variables = {
        input: {
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        },
      };


      const response = await request(app)
        .post('/graphql')
        .send({ query: mutation, variables })
        .expect(200);


      expect(response.body.data.register).toBeDefined();
      expect(response.body.data.register.token).toBeTruthy();
      expect(response.body.data.register.user.email).toBe('test@example.com');
      expect(response.body.data.register.user.subscriptionTier).toBe('FREE');


      // Verify user was created in database
      const user = await User.findOne({ email: 'test@example.com' });
      expect(user).toBeTruthy();
      expect(user?.name).toBe('Test User');
    });


    it('should return error for duplicate email', async () => {
      // Create existing user
      await User.create({
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Existing User',
      });


      const mutation = `
        mutation Register($input: RegisterInput!) {
          register(input: $input) {
            token
            user {
              id
            }
          }
        }
      `;


      const variables = {
        input: {
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        },
      };


      const response = await request(app)
        .post('/graphql')
        .send({ query: mutation, variables });


      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('User already exists');
    });


    it('should validate input fields', async () => {
      const mutation = `
        mutation Register($input: RegisterInput!) {
          register(input: $input) {
            token
          }
        }
      `;


      const variables = {
        input: {
          email: 'invalid-email',
          password: '123', // Too short
          name: '',
        },
      };


      const response = await request(app)
        .post('/graphql')
        .send({ query: mutation, variables });


      expect(response.body.errors).toBeDefined();
    });
  });


  describe('POST /graphql - login mutation', () => {
    beforeEach(async () => {
      // Create test user
      const user = new User({
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 12),
        name: 'Test User',
      });
      await user.save();
    });


    it('should login successfully with valid credentials', async () => {
      const mutation = `
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            token
            user {
              email
              name
            }
          }
        }
      `;


      const variables = {
        input: {
          email: 'test@example.com',
          password: 'password123',
        },
      };


      const response = await request(app)
        .post('/graphql')
        .send({ query: mutation, variables })
        .expect(200);


      expect(response.body.data.login).toBeDefined();
      expect(response.body.data.login.token).toBeTruthy();
      expect(response.body.data.login.user.email).toBe('test@example.com');
    });


    it('should return error for invalid credentials', async () => {
      const mutation = `
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            token
          }
        }
      `;


      const variables = {
        input: {
          email: 'test@example.com',
          password: 'wrongpassword',
        },
      };


      const response = await request(app)
        .post('/graphql')
        .send({ query: mutation, variables });


      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Invalid credentials');
    });
  });
});
