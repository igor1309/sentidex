const OpenAI = require("openai");
const { DEFAULT_PROMPTS } = require('./prompt-config.js');

// The client automatically reads the OPENAI_API_KEY from the environment.
const openai = new OpenAI({
  // Disable the default retry behavior.
  maxRetries: 0,
});

// --- CONFIGURATION ---
// We use a modern, fast, and cost-effective model capable of JSON mode.
const MODEL = 'gpt-5-nano';

/**
 * Makes a real API call to OpenAI to get structured enrichment data for a given text.
 * @param {string} content The text content of the message to be processed.
 * @returns {Promise<object>} A promise that resolves to an object with { summary, tags, title }.
 * @throws {Error} Throws an error if the API call or JSON parsing fails.
 */
async function getOpenAIEnrichment(content) {
  console.log(`Sending content to OpenAI model: ${MODEL}`);

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: DEFAULT_PROMPTS.systemPrompt },
        { role: 'user', content: DEFAULT_PROMPTS.userPrompt(content) },
      ],
      // This forces the model to return a guaranteed-valid JSON object.
      response_format: { type: 'json_object' },
      temperature: 1, // Only the default (1) value is supported.
    });

    const responseContent = completion.choices[0].message.content;

    if (process.env.DEBUG === 'true') {
      console.log('OpenAI raw response:', responseContent);
    }

    // Parse the JSON string response from the model
    const parsedResponse = JSON.parse(responseContent);

    if (process.env.DEBUG === 'true') {
      console.log('Parsed AI response:', parsedResponse);
    }

    // Basic validation to ensure the response has the expected shape
    if (!parsedResponse.summary || !parsedResponse.tags || !parsedResponse.title) {
        throw new Error('AI response is missing one or more required keys (summary, tags, title).');
    }

    return parsedResponse;
    
  } catch (error) {
    console.error('Error calling OpenAI API:', error.message);
    // Re-throw the error to be caught by the ai.js orchestrator
    throw new Error(`OpenAI API call failed: ${error.message}`);
  }
}

module.exports = {
  getOpenAIEnrichment,
};