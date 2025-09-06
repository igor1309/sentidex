// Centralized prompt configuration for AI enrichment services
const fs = require('fs');
const path = require('path');

const PROMPTS_DIR = path.join(__dirname, 'PROMPTS');

const DEFAULT_PROMPTS = {
    systemPrompt: fs.readFileSync(path.join(PROMPTS_DIR, 'system-prompt.md'), 'utf8').trim(),
    
    userPrompt: (content) => {
        const template = fs.readFileSync(path.join(PROMPTS_DIR, 'user-prompt.md'), 'utf8').trim();
        return template.replace('{{content}}', content);
    }
};
  
  module.exports = {
    DEFAULT_PROMPTS
  };