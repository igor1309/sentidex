// This file will be loaded by Jest before any tests are run.
// This is how we inject mocks into the environment that the child process will inherit.

jest.mock('fs', () => require('memfs').fs);

jest.mock('./scripts/services/ai.js', () => ({
  getAIEnrichment: jest.fn(),
}));

try {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: undefined,
    writable: true,
  });
} catch {
  // Best-effort: if localStorage is non-configurable, leave as-is.
}
