// This file acts as a factory for AI services.

// Import providers
const { getEnrichment: getOpenAIEnrichment } = require('./openai.js');
const { getEnrichment: getOpenRouterEnrichment } = require('./openrouter.js');
const { getEnrichment: getMockEnrichment } = require('./mockai.js');

/**
 * Factory function that creates an AI enrichment provider based on environment configuration.
 * @returns {Function} A function that takes content and returns enrichment data.
 */
function createAIEnrichmentProvider() {
  const AI_PROVIDER = process.env.AI_PROVIDER || 'mockai';
  console.log(`Creating AI provider: ${AI_PROVIDER}`);
  
  switch (AI_PROVIDER) {
    case 'mockai':
      return getMockEnrichment;

    case 'openai':
      return getOpenAIEnrichment;
    
    case 'openrouter':
      return getOpenRouterEnrichment;
    
    // Future providers could be added here, e.g.:
    // case 'claude':
    //   return getClaudeEnrichment;
      
    default:
      throw new Error(`Unknown AI provider configured: ${AI_PROVIDER}`);
  }
}

/**
 * The configured AI enrichment function.
 * @param {string} content The text content of the message to be processed.
 * @returns {Promise<object>} Resolves with { summary, tags, title } on success.
 * @throws {Error} When the provider call fails or returns an invalid payload.
 */
async function getAIEnrichment(content) {
  try {
    const provider = createAIEnrichmentProvider();
    const result = await provider(content);

    if (!result || typeof result !== 'object') {
      throw new Error('AI provider returned an empty result');
    }

    if (result.error) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error('Error during AI enrichment:', error.message);
    throw error;
  }
}

module.exports = {
  getAIEnrichment
};
