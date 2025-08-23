/**
 * Placeholder function for OpenAI enrichment.
 * In the next step, this will be replaced with a real API call.
 * @param {string} content The text content of the message.
 * @returns {Promise<object>} A promise resolving to the enrichment data.
 */
async function getOpenAIEnrichment(content) {
  console.log('--- Using placeholder for OpenAI enrichment ---');
  
  // This simulates a successful API call for testing purposes.
  return {
    summary: "This is a placeholder summary from the AI.",
    tags: ["placeholder", "testing"],
    title: "placeholder-title"
  };
}

module.exports = {
  getOpenAIEnrichment
};