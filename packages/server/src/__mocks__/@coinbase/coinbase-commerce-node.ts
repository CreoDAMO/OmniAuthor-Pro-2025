// Mock for @coinbase/coinbase-commerce-node
export const Client = {
  init: jest.fn(),
};

export const Charge = {
  create: jest.fn(),
  retrieve: jest.fn(),
  list: jest.fn(),
};
