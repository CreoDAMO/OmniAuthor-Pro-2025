import { BLOCKCHAIN_CONFIG, SUBSCRIPTION_PLANS, ROYALTY_RATES } from '../constants';

describe('Constants', () => {
  describe('BLOCKCHAIN_CONFIG', () => {
    test('should have all required wallet addresses', () => {
      expect(BLOCKCHAIN_CONFIG.POLYGON_WALLET).toBeDefined();
      expect(BLOCKCHAIN_CONFIG.BASE_WALLET).toBeDefined();
      expect(BLOCKCHAIN_CONFIG.SOLANA_WALLET).toBeDefined();
      expect(BLOCKCHAIN_CONFIG.PLATFORM_FEE).toBeDefined();
    });

    test('should have valid wallet address formats', () => {
      // Ethereum/Polygon wallet format (0x followed by 40 hex characters)
      expect(BLOCKCHAIN_CONFIG.POLYGON_WALLET).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(BLOCKCHAIN_CONFIG.BASE_WALLET).toMatch(/^0x[a-fA-F0-9]{40}$/);
      
      // Solana wallet format (base58 string, typically 32-44 characters)
      expect(BLOCKCHAIN_CONFIG.SOLANA_WALLET).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
    });

    test('should have valid platform fee', () => {
      expect(typeof BLOCKCHAIN_CONFIG.PLATFORM_FEE).toBe('number');
      expect(BLOCKCHAIN_CONFIG.PLATFORM_FEE).toBeGreaterThan(0);
      expect(BLOCKCHAIN_CONFIG.PLATFORM_FEE).toBeLessThanOrEqual(100);
    });
  });

  describe('SUBSCRIPTION_PLANS', () => {
    test('should have all required plans', () => {
      expect(SUBSCRIPTION_PLANS.FREE).toBeDefined();
      expect(SUBSCRIPTION_PLANS.PRO).toBeDefined();
      expect(SUBSCRIPTION_PLANS.ENTERPRISE).toBeDefined();
    });

    test('FREE plan should have correct structure', () => {
      const freePlan = SUBSCRIPTION_PLANS.FREE;
      expect(freePlan.name).toBe('Free');
      expect(freePlan.price).toBe(0);
      expect(Array.isArray(freePlan.features)).toBe(true);
      expect(freePlan.features.length).toBeGreaterThan(0);
      expect(typeof freePlan.aiCallsPerDay).toBe('number');
      expect(freePlan.aiCallsPerDay).toBeGreaterThan(0);
    });

    test('PRO plan should have correct structure', () => {
      const proPlan = SUBSCRIPTION_PLANS.PRO;
      expect(proPlan.name).toBe('Pro');
      expect(proPlan.price).toBeGreaterThan(0);
      expect(Array.isArray(proPlan.features)).toBe(true);
      expect(proPlan.features.length).toBeGreaterThan(0);
      expect(proPlan.aiCallsPerDay).toBe(-1); // Unlimited
    });

    test('ENTERPRISE plan should have correct structure', () => {
      const enterprisePlan = SUBSCRIPTION_PLANS.ENTERPRISE;
      expect(enterprisePlan.name).toBe('Enterprise');
      expect(enterprisePlan.price).toBeGreaterThan(SUBSCRIPTION_PLANS.PRO.price);
      expect(Array.isArray(enterprisePlan.features)).toBe(true);
      expect(enterprisePlan.features.length).toBeGreaterThan(0);
      expect(enterprisePlan.aiCallsPerDay).toBe(-1); // Unlimited
    });

    test('plans should be ordered by price', () => {
      expect(SUBSCRIPTION_PLANS.FREE.price).toBeLessThan(SUBSCRIPTION_PLANS.PRO.price);
      expect(SUBSCRIPTION_PLANS.PRO.price).toBeLessThan(SUBSCRIPTION_PLANS.ENTERPRISE.price);
    });
  });

  describe('ROYALTY_RATES', () => {
    test('should have all required platforms', () => {
      expect(ROYALTY_RATES.KDP).toBeDefined();
      expect(ROYALTY_RATES.NEURAL_BOOKS).toBeDefined();
      expect(ROYALTY_RATES.INGRAMSPARK).toBeDefined();
    });

    test('each platform should have all format rates', () => {
      Object.values(ROYALTY_RATES).forEach(platform => {
        expect(platform.ebook).toBeDefined();
        expect(platform.paperback).toBeDefined();
        expect(platform.hardcover).toBeDefined();
      });
    });

    test('all rates should be valid percentages', () => {
      Object.values(ROYALTY_RATES).forEach(platform => {
        Object.values(platform).forEach(rate => {
          expect(typeof rate).toBe('number');
          expect(rate).toBeGreaterThan(0);
          expect(rate).toBeLessThanOrEqual(1);
        });
      });
    });

    test('NEURAL_BOOKS should have higher rates than competitors', () => {
      expect(ROYALTY_RATES.NEURAL_BOOKS.ebook).toBeGreaterThan(ROYALTY_RATES.KDP.ebook);
      expect(ROYALTY_RATES.NEURAL_BOOKS.ebook).toBeGreaterThan(ROYALTY_RATES.INGRAMSPARK.ebook);
      expect(ROYALTY_RATES.NEURAL_BOOKS.paperback).toBeGreaterThan(ROYALTY_RATES.KDP.paperback);
      expect(ROYALTY_RATES.NEURAL_BOOKS.paperback).toBeGreaterThan(ROYALTY_RATES.INGRAMSPARK.paperback);
    });
  });
});
