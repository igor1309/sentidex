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

function mockAISequence(steps) {
  const mock = jest.fn(() => {
    throw new Error('AI mock sequence exhausted');
  });

  steps.forEach((step) => {
    if (step.type === 'success') {
      mock.mockResolvedValueOnce(step.value);
    } else if (step.type === 'failure') {
      const reason = step.error instanceof Error ? step.error : new Error(step.error);
      mock.mockRejectedValueOnce(reason);
    } else {
      throw new TypeError('Unknown mockAISequence step type');
    }
  });

  return mock;
}

module.exports = {
  mockAISuccess,
  mockAIFailure,
  mockAISequence,
};
