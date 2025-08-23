const OpenAI = require("openai");

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

  const systemPrompt = `You are a pragmatic assistant for the Sentidex system. Your task is to analyze the given text and return structured data in a specific JSON format. Do not add any extra commentary or explanations. Your entire response must be a single valid JSON object.`;

  const userPrompt = `
Analyze the following text and provide a response in JSON format with three keys:
1. "summary": A concise summary of 1-2 sentences, in the original language of the text.
2. "tags": An array of 3-5 relevant lowercase keywords or tags, without special characters.
3. "title": A short, 2-4 word, file-safe, kebab-case title for the text (e.g., "telegram-processing-queue").

Text to analyze:
\`\`\`
${content}
\`\`\`
`;

  try {
    const completion = await openrouter.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
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