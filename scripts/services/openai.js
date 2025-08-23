const OpenAI = require('openai');

// The client automatically reads the OPENAI_API_KEY and OPENAI_ORG_ID 
// from the environment variables (process.env) set by GitHub Actions secrets.
const openai = new OpenAI();

// --- CONFIGURATION ---
// We use a modern, fast, and cost-effective model capable of JSON mode.
const MODEL = 'gpt-5-mini';

/**
 * Makes a real API call to OpenAI to get structured enrichment data for a given text.
 * @param {string} content The text content of the message to be processed.
 * @returns {Promise<object>} A promise that resolves to an object with { summary, tags, title }.
 * @throws {Error} Throws an error if the API call or JSON parsing fails.
 */
async function getOpenAIEnrichment(content) {
  console.log(`Sending content to OpenAI model: ${MODEL}`);
  
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
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      // This forces the model to return a guaranteed-valid JSON object.
      response_format: { type: 'json_object' },
      temperature: 0.2, // Lower temperature for more deterministic output
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