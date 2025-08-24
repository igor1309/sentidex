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
      // Return a function that always returns an error for unknown providers
      return async function(content) {
        const errorMessage = `Unknown AI provider configured: ${AI_PROVIDER}`;
        console.error(errorMessage);
        return {
          error: `AI processing failed: ${errorMessage}`,
          summary: 'AI processing failed.',
          tags: ['error', 'ai-failed'],
          title: 'processing-error'
        };
      };
  }
}

/**
 * The configured AI enrichment function.
 * @param {string} content The text content of the message to be processed.
 * @returns {Promise<object>} A promise that resolves to an object with { summary, tags, title } on success, 
 * or { error, summary, tags, title } on failure.
 */
async function getAIEnrichment(content) {
  const provider = createAIEnrichmentProvider();
  
  try {
    return await provider(content);
  } catch (error) {
    console.error(`Error during AI enrichment:`, error.message);
    // Return a standardized error object so the main process can continue safely.
    return {
      error: `AI processing failed: ${error.message}`,
      summary: 'AI processing failed.',
      tags: ['error', 'ai-failed'],
      title: 'processing-error'
    };
  }
}

module.exports = {
  getAIEnrichment
};