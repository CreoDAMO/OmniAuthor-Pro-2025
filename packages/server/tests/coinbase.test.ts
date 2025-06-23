import { createCoinbaseCharge } from '../src/services/coinbase';

describe('Coinbase Service', () => {
  beforeAll(() => {
    process.env.COINBASE_COMMERCE_API_KEY = 'test-api-key';
    process.env.CLIENT_URL = 'http://localhost:3000';
  });

  it('creates a charge successfully', async () => {
    const input = {
      name: 'Test Charge',
      description: 'Test payment',
      amount: 10.0,
      currency: 'USD',
      userId: 'user123',
    };

    const charge = await createCoinbaseCharge(input);
    
    // Verify the charge was created with correct structure
    expect(charge).toHaveProperty('id');
    expect(charge).toHaveProperty('code');
    expect(charge.name).toBe(input.name);
    expect(charge.description).toBe(input.description);
    expect(charge.local_price.amount).toBe('10.00');
    expect(charge.local_price.currency).toBe('USD');
    expect(charge.metadata.userId).toBe(input.userId);
    expect(charge.pricing_type).toBe('fixed_price');
    expect(charge.redirect_url).toBe('http://localhost:3000/payment/success');
    expect(charge.cancel_url).toBe('http://localhost:3000/payment/cancel');
  });

  it('formats amount correctly', async () => {
    const input = {
      name: 'Test Charge 2',
      description: 'Test payment 2',
      amount: 15.5,
      currency: 'USD',
      userId: 'user456',
    };

    const charge = await createCoinbaseCharge(input);
    expect(charge.local_price.amount).toBe('15.50');
  });
});
