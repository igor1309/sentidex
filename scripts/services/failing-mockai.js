/**
 * Mock AI provider that always fails to help exercise error paths.
 * @param {string} _content The text content of the message to be processed.
 * @returns {Promise<object>} Resolves with an error payload.
 */
async function getEnrichment(_content) {
  console.log('Using failing mock AI provider');
  return {
    error: 'Mock AI failure: unable to process content'
  };
}

module.exports = {
  getEnrichment
};
