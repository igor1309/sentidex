const path = require('path');
const { setupTestEnvironment } = require('./harness/setupTestEnvironment');
const { runScript } = require('./harness/runScript');
const { mockAISuccess, mockAIFailure } = require('./harness/mockAI');

const realFs = jest.requireActual('fs');
const sampleMessagePath = path.join(__dirname, 'test-fixtures/sample-message.md');

const EXPECTED_PROCESSED_FILENAME = 'Mocked-AI-Title-For-The-Article-2025-09-21-09-34-07.md';
const EXPECTED_PROCESSED_CONTENT = [
  '---',
  'id: "mfti384d3zzzzzrajk6"',
  'created_at: "2025-09-21T09:34:07.837Z"',
  'source_info: "unknown"',
  'source_url: "http://example.com/sample"',
  'has_media: false',
  'language: "en"',
  'summary: "This is a mocked summary provided by the test."',
  'tags: ["mocked","ai","test-harness"]',
  'processed_at: "2025-09-21T09:34:07.837Z"',
  '---',
  '',
  'This is a sample message for testing.',
].join('\n');

function loadSampleFixture() {
  return realFs.readFileSync(sampleMessagePath, 'utf8');
}

function createSingleFileEnv(overrides = {}) {
  const { inboxFiles, ...restOverrides } = overrides;
  const baseOptions = {
    inboxFiles: {
      'sample.md': loadSampleFixture(),
    },
    systemTime: '2025-09-21T09:34:07.837Z',
    randomValues: 0.111111111,
  };

  if (inboxFiles) {
    baseOptions.inboxFiles = inboxFiles;
  }

  return setupTestEnvironment({
    ...baseOptions,
    ...restOverrides,
  });
}

describe('process-messages script (Characterization Test)', () => {
  let testEnv;

  beforeEach(() => {
    testEnv = null;
  });

  afterEach(() => {
    if (testEnv && typeof testEnv.restore === 'function') {
      testEnv.restore();
    }
    jest.restoreAllMocks();
    testEnv = null;
  });

  describe('Scenario 0: empty inbox', () => {
    test('should exit cleanly when _inbox is empty', async () => {
      testEnv = setupTestEnvironment({
        systemTime: '2025-09-21T09:34:07.837Z',
      });

      const scriptResult = await runScript();

      expect(scriptResult.status).toBe('terminal-log');
      expect(scriptResult.terminalMessage).toMatch('No files to process in _inbox');
      expect(scriptResult.logs).toEqual([
        'Starting message processing...',
        'Found 0 files to process',
        'No files to process in _inbox',
      ]);
      expect(scriptResult.errors).toHaveLength(0);

      const { fs } = testEnv;
      expect(fs.readdirSync('/_inbox')).toHaveLength(0);
      expect(fs.readdirSync('/inbox')).toHaveLength(0);
    });
  });

  describe('Scenario 1: single file', () => {
    test('should leave the file in _inbox on AI failure', async () => {
      testEnv = createSingleFileEnv();

      const aiModule = require('../scripts/services/ai.js');
      aiModule.getAIEnrichment = mockAIFailure('network down');

      const scriptResult = await runScript();

      const { fs } = testEnv;

      expect(scriptResult.status).toBe('terminal-log');
      expect(scriptResult.terminalMessage).toMatch('Successfully processed');
      expect(scriptResult.logs).toEqual([
        'Starting message processing...',
        'Found 1 files to process',
        'Processing file: sample.md',
        'Keeping original file in _inbox for manual retry: _inbox/sample.md',
        'Successfully processed 0 files',
        'Left 1 files in _inbox after AI failures',
      ]);
      expect(scriptResult.errors).toHaveLength(1);
      expect(scriptResult.errors[0]).toMatch('AI enrichment failed for _inbox/sample.md:');

      expect(fs.readdirSync('/_inbox')).toEqual(['sample.md']);
      expect(fs.readdirSync('/inbox')).toHaveLength(0);
    });

    test('should move the file to inbox on success', async () => {
      testEnv = createSingleFileEnv();

      const aiModule = require('../scripts/services/ai.js');
      const mockAiResponse = {
        title: "Mocked-AI-Title-For-The-Article",
        summary: "This is a mocked summary provided by the test.",
        tags: ["mocked", "ai", "test-harness"],
      };
      aiModule.getAIEnrichment = mockAISuccess(mockAiResponse);

      const scriptResult = await runScript();

      const { fs } = testEnv;

      expect(scriptResult.status).toBe('terminal-log');
      expect(scriptResult.terminalMessage).toMatch('Successfully processed');

      const output = scriptResult.logs.join('\n');
      expect(output).toContain('Starting message processing...');
      expect(output).toContain('Found 1 files to process');
      expect(output).toContain('Successfully processed 1 files');
      expect(scriptResult.errors).toHaveLength(0);

      const outboxFiles = fs.readdirSync('/inbox');
      expect(outboxFiles).toEqual([EXPECTED_PROCESSED_FILENAME]);

      const outputContent = fs.readFileSync(path.join('/inbox', outboxFiles[0]), 'utf8');

      expect(outputContent).toBe(EXPECTED_PROCESSED_CONTENT);
      expect(fs.existsSync('/_inbox/sample.md')).toBe(false);
    });

    test('should create a DUPL ticket for a known source_url', async () => {
      testEnv = createSingleFileEnv();
      const { fs } = testEnv;

      const originalContent = [
        '---',
        'source_url: "http://example.com/sample"',
        '---',
        '',
        'Existing processed message',
      ].join('\n');
      fs.writeFileSync('/inbox/original.md', originalContent, 'utf8');

      const aiModule = require('../scripts/services/ai.js');
      aiModule.getAIEnrichment = mockAISuccess({ title: 'Unused', summary: 'Unused', tags: [] });

      const scriptResult = await runScript();

      expect(scriptResult.status).toBe('terminal-log');
      expect(scriptResult.terminalMessage).toMatch('Successfully processed');
      expect(scriptResult.logs).toContain('Duplicate found for http://example.com/sample. Original: inbox/original.md');
      expect(scriptResult.logs).toContain('Created duplicate ticket: inbox/DUPL_2025-09-21-09-34-07.md');
      expect(scriptResult.logs).toContain('Deleted raw duplicate file: _inbox/sample.md');
      expect(scriptResult.errors).toHaveLength(0);
      expect(aiModule.getAIEnrichment).not.toHaveBeenCalled();

      const inboxFiles = fs.readdirSync('/inbox').sort();
      expect(inboxFiles).toEqual(['DUPL_2025-09-21-09-34-07.md', 'original.md']);
      expect(fs.existsSync('/_inbox/sample.md')).toBe(false);

      const duplContent = fs.readFileSync('/inbox/DUPL_2025-09-21-09-34-07.md', 'utf8');
      expect(duplContent).toContain('is_duplicate: true');
      expect(duplContent).toContain('original_ref: "original.md"');
    });
  });
});
