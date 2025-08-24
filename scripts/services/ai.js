// This file acts as an orchestrator or router for AI services.

// Import providers
const { getOpenAIEnrichment } = require('./openai.js');
const { getOpenRouterEnrichment } = require('./openrouter.js');
const { getMockEnrichment } = require('./mockai.js');

// --- CONFIGURATION ---
// This constant determines which AI provider to use.
// Options: 'openai', 'openrouter', etc.
const AI_PROVIDER = process.env.AI_PROVIDER || 'mockai';

/**
 * Orchestrates AI enrichment by routing to the configured provider.
 * @param {string} content The text content of the message to be processed.
 * @returns {Promise<object>} A promise that resolves to an object with { summary, tags, title } on success, 
 * or { error, summary, tags, title } on failure.
 */
async function getAIEnrichment(content) {
  console.log(`Routing to AI provider: ${AI_PROVIDER}`);
  
  try {
    switch (AI_PROVIDER) {
      case 'mockai':
        return getMockEnrichment(content);

      case 'openai':
        return await getOpenAIEnrichment(content);
      
      case 'openrouter':
        return await getOpenRouterEnrichment(content);
      
      // Future providers could be added here, e.g.:
      // case 'claude':
      //   return await getClaudeEnrichment(content);
        
      default:
        throw new Error(`Unknown AI provider configured: ${AI_PROVIDER}`);
    }
  } catch (error) {
    console.error(`Error during AI enrichment orchestration:`, error.message);
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