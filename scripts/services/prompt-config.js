// Centralized prompt configuration for AI enrichment services

const DEFAULT_PROMPTS = {
    systemPrompt: `You are a pragmatic assistant for the Sentidex system. 
  Your task is to analyze the given text and return structured data in a specific JSON format. 
  Do not add any extra commentary or explanations. 
  Your entire response must be a single valid JSON object.`,
    
    userPrompt: (content) => `
  Analyze the following text and provide a response in JSON format with three keys:
  1. "summary": A concise summary of at most 18 words, in the original language of the text.
  2. "tags": An array of 3-5 relevant lowercase keywords or tags, without special characters.
  3. "title": A short, 2-4 word, file-safe, kebab-case title for the text (e.g., "telegram-processing-queue").
  
  Text to analyze:
  \`\`\`
  ${content}
  \`\`\`
  `
  };
  
  module.exports = {
    DEFAULT_PROMPTS
  };