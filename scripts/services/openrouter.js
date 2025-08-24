const OpenAI = require("openai");
const { DEFAULT_PROMPTS } = require('./prompt-config.js');

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

/**
 * Makes a real API call to OpenRouter (gpt-oss-20b) to get structured enrichment data for a given text.
 * @param {string} content The text content of the message to be processed.
 * @returns {Promise<object>} A promise that resolves to an object with { summary, tags, title }.
 * @throws {Error} Throws an error if the API call or JSON parsing fails.
 */
async function getOpenRouterEnrichment(content) {
  console.log(`Sending content to OpenRouter model: ${MODEL}`);

  try {
    const completion = await openrouter.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: DEFAULT_PROMPTS.systemPrompt },
        { role: 'user', content: DEFAULT_PROMPTS.userPrompt(content) },
      ],
      // Force JSON object response format (supported by gpt-oss-20b)
      response_format: { type: 'json_object' },
      temperature: 1, // Standard temperature setting
      max_tokens: 500, // Reasonable limit for enrichment data
    });

    const responseContent = completion.choices[0].message.content;

    if (process.env.DEBUG === 'true') {
      console.log('OpenRouter raw response:', responseContent);
    }

    // Parse the JSON string response from the model
    const parsedResponse = JSON.parse(responseContent);

    if (process.env.DEBUG === 'true') {
      console.log('Parsed OpenRouter response:', parsedResponse);
    }

    // Basic validation to ensure the response has the expected shape
    if (!parsedResponse.summary || !parsedResponse.tags || !parsedResponse.title) {
        throw new Error('OpenRouter response is missing one or more required keys (summary, tags, title).');
    }

    // Ensure tags is an array
    if (!Array.isArray(parsedResponse.tags)) {
        throw new Error('OpenRouter response tags must be an array.');
    }

    return parsedResponse;
    
  } catch (error) {
    console.error('Error calling OpenRouter API:', error.message);
    // Re-throw the error to be caught by the ai.js orchestrator
    throw new Error(`OpenRouter API call failed: ${error.message}`);
  }
}

module.exports = {
  getOpenRouterEnrichment,
};