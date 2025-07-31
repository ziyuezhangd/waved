import { jest } from '@jest/globals';

// This will mock the yahoo-finance2 module for ALL test files that run after this.
jest.unstable_mockModule('yahoo-finance2', () => ({
  default: {
    quote: jest.fn(),
  },
}));