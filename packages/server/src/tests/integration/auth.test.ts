import request from 'supertest';
import { app } from '../../server';

describe('Server Integration Tests', () => {
  it('should respond to health check', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body.status).toBe('ok');
    expect(response.body.timestamp).toBeDefined();
  });

  it('should respond to GraphQL hello query', async () => {
    const query = `
      query {
        hello
      }
    `;

    const response = await request(app)
      .post('/graphql')
      .send({ query })
      .expect(200);

    expect(response.body.data.hello).toBe('Hello from OmniAuthor Pro!');
  });

  it('should respond to GraphQL health query', async () => {
    const query = `
      query {
        health {
          status
          timestamp
        }
      }
    `;

    const response = await request(app)
      .post('/graphql')
      .send({ query })
      .expect(200);

    expect(response.body.data.health.status).toBe('ok');
    expect(response.body.data.health.timestamp).toBeDefined();
  });
});
