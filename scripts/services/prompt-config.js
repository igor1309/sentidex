// Centralized prompt configuration for AI enrichment services
const fs = require('fs');
const path = require('path');

const PROMPTS_DIR = path.join(__dirname, 'PROMPTS');

const DEFAULT_PROMPTS = {
    systemPrompt: fs.readFileSync(path.join(PROMPTS_DIR, 'system-prompt.md'), 'utf8').trim(),
    
    userPrompt: (content) => {
        const template = fs.readFileSync(path.join(PROMPTS_DIR, 'user-prompt.md'), 'utf8').trim();
        const taxonomyPath = path.join(__dirname, '..', '..', 'docs', 'tag-taxonomy.md');
        const taxonomyRaw = fs.readFileSync(taxonomyPath, 'utf8');
        const tagMatches = [...taxonomyRaw.matchAll(/`([a-z0-9-]+)`/g)];
        const tagList = [...new Set(tagMatches.map((match) => match[1]))];
        const taxonomyList =
            tagList.length === 0 ? '- (no taxonomy tags found)' : tagList.map((tag) => `- ${tag}`).join('\n');
        return template
            .replace('{{tag_taxonomy}}', taxonomyList)
            .replace('{{content}}', content);
    }
};
  
  module.exports = {
    DEFAULT_PROMPTS
  };
