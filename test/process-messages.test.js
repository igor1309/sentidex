const path = require('path');
const { setupTestEnvironment } = require('./harness/setupTestEnvironment');
const { runScript } = require('./harness/runScript');
const { mockAISuccess, mockAIFailure, mockAISequence } = require('./harness/mockAI');

const realFs = jest.requireActual('fs');
const FIXTURE_DIR = path.join(__dirname, 'test-fixtures');
const SAMPLE_FIXTURE = 'sample-message.md';
const FROZEN_ISO = '2025-09-21T09:34:07.837Z';
const FROZEN_TIMESTAMP = '2025-09-21-09-34-07';
const DEFAULT_RANDOM_VALUES = [0.111111111, 0.222222222, 0.333333333];
const GENERATED_IDS = DEFAULT_RANDOM_VALUES.map((value) => {
  const base = new Date(FROZEN_ISO).valueOf().toString(36);
  return base + value.toString(36).substring(2);
});
const FIRST_BODY = 'This is the first sample message for testing.';
const SECOND_BODY = 'This is the second sample message for testing.';
const FIRST_SOURCE_URL = 'http://example.com/first';
const SECOND_SOURCE_URL = 'http://example.com/second';

const EXPECTED_PROCESSED_FILENAME = `Mocked-AI-Title-For-The-Article-${FROZEN_TIMESTAMP}.md`;
const EXPECTED_PROCESSED_CONTENT = [
  '---',
  `id: "${GENERATED_IDS[0]}"`,
  `created_at: "${FROZEN_ISO}"`,
  'source_info: "unknown"',
  'source_url: "http://example.com/sample"',
  'has_media: false',
  'language: "en"',
  'summary: "This is a mocked summary provided by the test."',
  'tags: ["mocked","ai","test-harness"]',
  `processed_at: "${FROZEN_ISO}"`,
  '---',
  '',
  'This is a sample message for testing.',
].join('\n');

function buildProcessedContent({ id, sourceUrl, summary, tags, body }) {
  return [
    '---',
    `id: "${id}"`,
    `created_at: "${FROZEN_ISO}"`,
    'source_info: "unknown"',
    `source_url: "${sourceUrl}"`,
    'has_media: false',
    'language: "en"',
    `summary: "${summary}"`,
    `tags: ${JSON.stringify(tags)}`,
    `processed_at: "${FROZEN_ISO}"`,
    '---',
    '',
    body,
  ].join('\n');
}

function buildFilename(title) {
  return `${title}-${FROZEN_TIMESTAMP}.md`;
}

function loadFixture(name) {
  return realFs.readFileSync(path.join(FIXTURE_DIR, name), 'utf8');
}

function createSingleFileEnv(overrides = {}) {
  const { inboxFiles, ...restOverrides } = overrides;
  const baseOptions = {
    inboxFiles: {
      'sample.md': loadFixture(SAMPLE_FIXTURE),
    },
    systemTime: FROZEN_ISO,
    randomValues: DEFAULT_RANDOM_VALUES[0],
  };

  if (inboxFiles) {
    baseOptions.inboxFiles = inboxFiles;
  }

  return setupTestEnvironment({
    ...baseOptions,
    ...restOverrides,
  });
}

function createTwoFileEnv(overrides = {}) {
  const { inboxFiles, ...restOverrides } = overrides;
  const baseOptions = {
    inboxFiles: {
      'first.md': loadFixture('first-message.md'),
      'second.md': loadFixture('second-message.md'),
    },
    systemTime: FROZEN_ISO,
    randomValues: DEFAULT_RANDOM_VALUES,
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

  describe('Scenario 2: two files', () => {
    test('should leave both files in _inbox when both fail', async () => {
      testEnv = createTwoFileEnv({ randomValues: DEFAULT_RANDOM_VALUES });

      const aiModule = require('../scripts/services/ai.js');
      aiModule.getAIEnrichment = mockAISequence([
        { type: 'failure', error: 'first failure' },
        { type: 'failure', error: 'second failure' },
      ]);

      const scriptResult = await runScript();
      const { fs } = testEnv;

      expect(scriptResult.status).toBe('terminal-log');
      expect(scriptResult.terminalMessage).toMatch('Successfully processed');
      expect(scriptResult.logs).toEqual([
        'Starting message processing...',
        'Found 2 files to process',
        'Processing file: first.md',
        'Keeping original file in _inbox for manual retry: _inbox/first.md',
        'Processing file: second.md',
        'Keeping original file in _inbox for manual retry: _inbox/second.md',
        'Successfully processed 0 files',
        'Left 2 files in _inbox after AI failures',
      ]);
      expect(scriptResult.errors).toEqual([
        'AI enrichment failed for _inbox/first.md: first failure',
        'AI enrichment failed for _inbox/second.md: second failure',
      ]);

      expect(fs.readdirSync('/_inbox').sort()).toEqual(['first.md', 'second.md']);
      expect(fs.readdirSync('/inbox')).toHaveLength(0);
    });

    test('should process one and leave one when the first fails and second succeeds', async () => {
      testEnv = createTwoFileEnv({ randomValues: DEFAULT_RANDOM_VALUES });

      const aiModule = require('../scripts/services/ai.js');
      const secondSuccess = {
        title: 'Second-AI-Title',
        summary: 'Second summary',
        tags: ['second', 'ai'],
      };
      aiModule.getAIEnrichment = mockAISequence([
        { type: 'failure', error: 'first failure' },
        { type: 'success', value: secondSuccess },
      ]);

      const scriptResult = await runScript();
      const { fs } = testEnv;

      expect(scriptResult.status).toBe('terminal-log');
      expect(scriptResult.terminalMessage).toMatch('Successfully processed');
      expect(scriptResult.logs).toEqual([
        'Starting message processing...',
        'Found 2 files to process',
        'Processing file: first.md',
        'Keeping original file in _inbox for manual retry: _inbox/first.md',
        'Processing file: second.md',
        'Created processed file: inbox/Second-AI-Title-2025-09-21-09-34-07.md',
        'Deleted original file: _inbox/second.md',
        'Successfully processed 1 files',
        'Left 1 files in _inbox after AI failures',
      ]);
      expect(scriptResult.errors).toEqual([
        'AI enrichment failed for _inbox/first.md: first failure',
      ]);

      expect(fs.readdirSync('/_inbox')).toEqual(['first.md']);
      const outboxFiles = fs.readdirSync('/inbox');
      expect(outboxFiles).toEqual([buildFilename('Second-AI-Title')]);

      const processedContent = fs.readFileSync(path.join('/inbox', outboxFiles[0]), 'utf8');
      const expectedContent = buildProcessedContent({
        id: GENERATED_IDS[0],
        sourceUrl: SECOND_SOURCE_URL,
        summary: secondSuccess.summary,
        tags: secondSuccess.tags,
        body: SECOND_BODY,
      });
      expect(processedContent).toBe(expectedContent);
    });

    test('should process one and leave one when the first succeeds and second fails', async () => {
      testEnv = createTwoFileEnv({ randomValues: DEFAULT_RANDOM_VALUES });

      const aiModule = require('../scripts/services/ai.js');
      const firstSuccess = {
        title: 'First-AI-Title',
        summary: 'First summary',
        tags: ['first', 'ai'],
      };
      aiModule.getAIEnrichment = mockAISequence([
        { type: 'success', value: firstSuccess },
        { type: 'failure', error: 'second failure' },
      ]);

      const scriptResult = await runScript();
      const { fs } = testEnv;

      expect(scriptResult.status).toBe('terminal-log');
      expect(scriptResult.terminalMessage).toMatch('Successfully processed');
      expect(scriptResult.logs).toEqual([
        'Starting message processing...',
        'Found 2 files to process',
        'Processing file: first.md',
        'Created processed file: inbox/First-AI-Title-2025-09-21-09-34-07.md',
        'Deleted original file: _inbox/first.md',
        'Processing file: second.md',
        'Keeping original file in _inbox for manual retry: _inbox/second.md',
        'Successfully processed 1 files',
        'Left 1 files in _inbox after AI failures',
      ]);
      expect(scriptResult.errors).toEqual([
        'AI enrichment failed for _inbox/second.md: second failure',
      ]);

      expect(fs.readdirSync('/_inbox')).toEqual(['second.md']);
      const outboxFiles = fs.readdirSync('/inbox');
      expect(outboxFiles).toEqual([buildFilename('First-AI-Title')]);

      const processedContent = fs.readFileSync(path.join('/inbox', outboxFiles[0]), 'utf8');
      const expectedContent = buildProcessedContent({
        id: GENERATED_IDS[0],
        sourceUrl: FIRST_SOURCE_URL,
        summary: firstSuccess.summary,
        tags: firstSuccess.tags,
        body: FIRST_BODY,
      });
      expect(processedContent).toBe(expectedContent);
    });

    test('should process both files when both succeed', async () => {
      testEnv = createTwoFileEnv({ randomValues: DEFAULT_RANDOM_VALUES });

      const aiModule = require('../scripts/services/ai.js');
      const firstSuccess = {
        title: 'First-AI-Title',
        summary: 'First summary',
        tags: ['first', 'ai'],
      };
      const secondSuccess = {
        title: 'Second-AI-Title',
        summary: 'Second summary',
        tags: ['second', 'ai'],
      };
      aiModule.getAIEnrichment = mockAISequence([
        { type: 'success', value: firstSuccess },
        { type: 'success', value: secondSuccess },
      ]);

      const scriptResult = await runScript();
      const { fs } = testEnv;

      expect(scriptResult.status).toBe('terminal-log');
      expect(scriptResult.terminalMessage).toMatch('Successfully processed');
      expect(scriptResult.logs).toEqual([
        'Starting message processing...',
        'Found 2 files to process',
        'Processing file: first.md',
        'Created processed file: inbox/First-AI-Title-2025-09-21-09-34-07.md',
        'Deleted original file: _inbox/first.md',
        'Processing file: second.md',
        'Created processed file: inbox/Second-AI-Title-2025-09-21-09-34-07.md',
        'Deleted original file: _inbox/second.md',
        'Successfully processed 2 files',
      ]);
      expect(scriptResult.errors).toHaveLength(0);

      expect(fs.readdirSync('/_inbox')).toHaveLength(0);
      const outboxFiles = fs.readdirSync('/inbox').sort();
      expect(outboxFiles).toEqual([
        buildFilename('First-AI-Title'),
        buildFilename('Second-AI-Title'),
      ]);

      const firstContent = fs.readFileSync(path.join('/inbox', buildFilename('First-AI-Title')), 'utf8');
      const secondContent = fs.readFileSync(path.join('/inbox', buildFilename('Second-AI-Title')), 'utf8');

      const expectedFirstContent = buildProcessedContent({
        id: GENERATED_IDS[0],
        sourceUrl: FIRST_SOURCE_URL,
        summary: firstSuccess.summary,
        tags: firstSuccess.tags,
        body: FIRST_BODY,
      });
      const expectedSecondContent = buildProcessedContent({
        id: GENERATED_IDS[1],
        sourceUrl: SECOND_SOURCE_URL,
        summary: secondSuccess.summary,
        tags: secondSuccess.tags,
        body: SECOND_BODY,
      });

      expect(firstContent).toBe(expectedFirstContent);
      expect(secondContent).toBe(expectedSecondContent);
    });
  });
});
