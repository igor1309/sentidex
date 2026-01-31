const fs = require('fs');
const { vol } = require('memfs');
const path = require('path');

const docsDir = path.join(process.cwd(), 'docs');
const promptsDir = path.join(process.cwd(), 'scripts', 'services', 'PROMPTS');
const taxonomyPath = path.join(docsDir, 'tag-taxonomy.md');

const writePromptFixtures = (taxonomy) => {
  fs.mkdirSync(promptsDir, { recursive: true });
  fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(path.join(promptsDir, 'system-prompt.md'), 'system prompt');
  fs.writeFileSync(
    path.join(promptsDir, 'user-prompt.md'),
    'Preferred tag taxonomy (choose from these if applicable):\n{{tag_taxonomy}}\nText:\n{{content}}'
  );
  fs.writeFileSync(path.join(docsDir, 'tag-taxonomy.md'), taxonomy);
};

let DEFAULT_PROMPTS;

describe('prompt-config userPrompt', () => {
  beforeAll(() => {
    vol.reset();
    writePromptFixtures('- `ai-coding`');
    DEFAULT_PROMPTS = require('../scripts/services/prompt-config').DEFAULT_PROMPTS;
  });

  it('injects taxonomy tags and content', () => {
    fs.writeFileSync(taxonomyPath, '- `ai-coding`\n- `open-source`');

    const prompt = DEFAULT_PROMPTS.userPrompt('Sample content.');

    expect(prompt).toContain('Sample content.');
    expect(prompt).toContain('Preferred tag taxonomy');
    expect(prompt).toContain('- ai-coding');
    expect(prompt).toContain('- open-source');
    expect(prompt).not.toContain('{{tag_taxonomy}}');
    expect(prompt).not.toContain('{{content}}');
  });

  it('uses a fallback list when the taxonomy contains no tags', () => {
    fs.writeFileSync(taxonomyPath, 'no tags here');

    const prompt = DEFAULT_PROMPTS.userPrompt('Sample content.');

    expect(prompt).toContain('- (no taxonomy tags found)');
  });
});
