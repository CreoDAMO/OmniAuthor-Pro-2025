import { createCoinbaseCharge } from '../src/services/coinbase';
import { Client, Charge } from '@coinbase/coinbase-commerce-node';

jest.mock('@coinbase/coinbase-commerce-node');

describe('Coinbase Service', () => {
  beforeAll(() => {
    process.env.COINBASE_COMMERCE_API_KEY = 'test-api-key';
    process.env.CLIENT_URL = 'http://localhost:3000';
  });

  it('creates a charge successfully', async () => {
    const mockCharge = { id: 'charge123', code: 'ABC123' };
    (Charge.create as jest.Mock).mockResolvedValue(mockCharge);

    const input = {
      name: 'Test Charge',
      description: 'Test payment',
      amount: 10.0,
      currency: 'USD',
      userId: 'user123',
    };

    const charge = await createCoinbaseCharge(input);
    expect(charge).toEqual(mockCharge);
    expect(Charge.create).toHaveBeenCalledWith({
      name: input.name,
      description: input.description,
      local_price: { amount: '10.00', currency: 'USD' },
      pricing_type: 'fixed_price',
      metadata: { userId: input.userId },
      redirect_url: 'http://localhost:3000/payment/success',
      cancel_url: 'http://localhost:3000/payment/cancel',
    });
  });
});