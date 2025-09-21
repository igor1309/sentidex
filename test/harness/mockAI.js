/**
 * Returns a Jest mock for the AI enrichment service that resolves with the provided response.
 *
 * @param {object} response The mocked AI response object.
 */
function mockAISuccess(response) {
  return jest.fn().mockResolvedValue(response);
}

/**
 * Returns a Jest mock for the AI enrichment service that rejects with the provided error.
 *
 * @param {Error|string} error Error instance or message string.
 */
function mockAIFailure(error) {
  const reason = error instanceof Error ? error : new Error(error);
  return jest.fn().mockRejectedValue(reason);
}

module.exports = {
  mockAISuccess,
  mockAIFailure,
};
