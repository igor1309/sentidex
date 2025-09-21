// This file will be loaded by Jest before any tests are run.
// This is how we inject mocks into the environment that the child process will inherit.

jest.mock('fs', () => require('memfs').fs);

jest.mock('./scripts/services/ai.js', () => ({
  getAIEnrichment: jest.fn(),
}));
