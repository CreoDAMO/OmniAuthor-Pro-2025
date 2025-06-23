import request from 'supertest';
import { app } from '../../index';

describe('Server Health Check', () => {
  test('GET /health should return status ok', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toEqual({ status: 'ok' });
  });

  test('should handle 404 for unknown routes', async () => {
    await request(app)
      .get('/unknown-route')
      .expect(404);
  });
});
