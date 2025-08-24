// This file acts as a factory for AI services.

// Import providers
const { getOpenAIEnrichment } = require('./openai.js');
const { getOpenRouterEnrichment } = require('./openrouter.js');
const { getMockEnrichment } = require('./mockai.js');

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
 * Creates a standardized error response object.
 * @param {string} errorMessage The error message to include.
 * @returns {object} Standardized error response with fallback values.
 */
function createErrorResponse(errorMessage) {
  return {
    error: `AI processing failed: ${errorMessage}`,
    summary: 'AI processing failed.',
    tags: ['error', 'ai-failed'],
    title: 'processing-error'
  };
}

/**
 * The configured AI enrichment function.
 * @param {string} content The text content of the message to be processed.
 * @returns {Promise<object>} A promise that resolves to an object with { summary, tags, title } on success, 
 * or { error, summary, tags, title } on failure.
 */
async function getAIEnrichment(content) {
  try {
    const provider = createAIEnrichmentProvider();
    return await provider(content);
  } catch (error) {
    console.error('Error during AI enrichment:', error.message);
    return createErrorResponse(error.message);
  }
}

module.exports = {
  getAIEnrichment
};