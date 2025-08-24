const OpenAI = require("openai");
const { createOpenAIEnrichment } = require('./openai-enrichment.js');

// The client automatically reads the OPENAI_API_KEY from the environment.
const openai = new OpenAI({
  // Disable the default retry behavior.
  maxRetries: 0,
});

// --- CONFIGURATION ---
// We use a modern, fast, and cost-effective model capable of JSON mode.
const MODEL = 'gpt-5-nano';

const getEnrichment = createOpenAIEnrichment(openai, {
  model: MODEL,
  providerName: 'OpenAI'
});

module.exports = {
  getEnrichment
};