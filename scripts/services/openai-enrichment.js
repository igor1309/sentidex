const { DEFAULT_PROMPTS } = require('./prompt-config.js');

/**
 * Creates an enrichment handler for a specific AI provider.
 * @param {object} client The OpenAI-compatible client instance.
 * @param {object} config Provider configuration object.
 * @param {string} config.model The model name to use.
 * @param {string} config.providerName The provider name for logging/errors.
 * @param {number} [config.maxTokens] Optional token limit.
 * @param {object} [config.responseFormat] Response format configuration, defaults to JSON object.
 * @param {number} [config.temperature] Temperature setting, defaults to 1.
 * @returns {Function} An enrichment function that takes content and returns enrichment data.
 */
function createOpenAIEnrichment(client, config) {
  return async function(content) {
    console.log(`Sending content to ${config.providerName} model: ${config.model}`);

    try {
      const requestOptions = {
        model: config.model,
        messages: [
          { role: 'system', content: DEFAULT_PROMPTS.systemPrompt },
          { role: 'user', content: DEFAULT_PROMPTS.userPrompt(content) },
        ],
        response_format: config.responseFormat || { type: 'json_object' },
        temperature: config.temperature || 1,
      };

      // Add optional max_tokens if specified
      if (config.maxTokens) {
        requestOptions.max_tokens = config.maxTokens;
      }

      const completion = await client.chat.completions.create(requestOptions);
      const responseContent = completion.choices[0].message.content;

      if (process.env.DEBUG === 'true') {
        console.log(`${config.providerName} raw response:`, responseContent);
      }

      // Parse the JSON string response from the model
      const parsedResponse = JSON.parse(responseContent);

      if (process.env.DEBUG === 'true') {
        console.log(`Parsed ${config.providerName} response:`, parsedResponse);
      }

      // Basic validation to ensure the response has the expected shape
      if (!parsedResponse.summary || !parsedResponse.tags || !parsedResponse.title) {
          throw new Error(`${config.providerName} response is missing one or more required keys (summary, tags, title).`);
      }

      // Ensure tags is an array
      if (!Array.isArray(parsedResponse.tags)) {
          throw new Error(`${config.providerName} response tags must be an array.`);
      }

      return parsedResponse;
      
    } catch (error) {
      // Re-throw the error to be caught by the ai.js orchestrator
      throw new Error(`${config.providerName} API call failed: ${error.message}`);
    }
  };
}

module.exports = {
    createOpenAIEnrichment
};