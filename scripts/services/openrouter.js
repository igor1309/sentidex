const OpenAI = require("openai");
const { createOpenAIEnrichment } = require('./openai-enrichment.js');

// OpenRouter client configuration
// The client reads OPEN_ROUTER_GPT_OSS_20B_API_KEY from environment variables
const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPEN_ROUTER_GPT_OSS_20B_API_KEY,
  maxRetries: 0,
  defaultHeaders: {
    "X-Title": process.env.YOUR_APP_NAME || "Sentidex AI Enrichment", // Optional: app name for leaderboards
  },
});

// --- CONFIGURATION ---
// Using the free tier of gpt-oss-20b model
const MODEL = 'openai/gpt-oss-20b:free';

const getEnrichment = createOpenAIEnrichment(openrouter, {
  model: MODEL,
  providerName: 'OpenRouter',
  maxTokens: 500
});

module.exports = {
  getEnrichment
};