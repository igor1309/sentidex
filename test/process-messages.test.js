const path = require('path');
const { runScript } = require('./harness/runScript');
const { mockAISuccess, mockAIFailure, mockAISequence } = require('./harness/mockAI');
const {
  DUPLICATE_TICKET_NAME,
  EXPECTED_PROCESSED_FILENAME,
  EXPECTED_PROCESSED_CONTENT,
  GENERATED_IDS,
  FIRST_BODY,
  SECOND_BODY,
  FIRST_SOURCE_URL,
  SECOND_SOURCE_URL,
  createEmptyEnv,
  createNoInboxEnv,
  createSingleFileEnv,
  createTwoFileEnv,
  buildFilename,
  buildProcessedContent,
  loadFixture,
  DEFAULT_RANDOM_VALUES,
} = require('./harness/testUtils');
const frontMatterCodec = require('../scripts/adapters/frontMatterCodec');

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

  describe('Setup guards', () => {
    test('should log and exit when _inbox directory is missing', async () => {
      testEnv = createNoInboxEnv();

      const scriptResult = await runScript();

      expect(scriptResult.status).toBe('terminal-log');
      expect(scriptResult.terminalMessage).toMatch('No _inbox directory found');
      const joinedLogs = scriptResult.logs.join('\n');
      expect(joinedLogs).toContain('Starting message processing...');
      expect(joinedLogs).toContain('No _inbox directory found');
      const { fs } = testEnv;
      expect(fs.existsSync('/_inbox')).toBe(false);
    });
  });

  describe('Scenario 0: empty inbox', () => {
    test('should exit cleanly when _inbox is empty', async () => {
      testEnv = createEmptyEnv();

      const scriptResult = await runScript();

      expect(scriptResult.status).toBe('terminal-log');
      expect(scriptResult.terminalMessage).toMatch('No files to process in _inbox');
      const logs = scriptResult.logs;
      const joinedLogs = logs.join('\n');
      expect(logs[0]).toBe('Starting message processing...');
      expect(joinedLogs).toContain('Found 0 files to process');
      expect(joinedLogs).toContain('No files to process in _inbox');
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
      const joinedLogs = scriptResult.logs.join('\n');
      expect(joinedLogs).toContain('Starting message processing...');
      expect(joinedLogs).toContain('Found 1 files to process');
      expect(joinedLogs).toContain('Processing file: sample.md');
      expect(joinedLogs).toContain('Keeping original file in _inbox for manual retry: _inbox/sample.md');
      expect(joinedLogs).toContain('Successfully processed 0 files');
      expect(joinedLogs).toContain('Left 1 files in _inbox after AI failures');
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

    test('should create inbox directory when missing', async () => {
      testEnv = createSingleFileEnv({ skipOutboxDir: true });
      const { fs } = testEnv;
      expect(fs.existsSync('/inbox')).toBe(false);

      const aiModule = require('../scripts/services/ai.js');
      aiModule.getAIEnrichment = mockAISuccess({
        title: 'Mocked-AI-Title-For-The-Article',
        summary: 'This is a mocked summary provided by the test.',
        tags: ['mocked', 'ai', 'test-harness'],
      });

      const scriptResult = await runScript();

      expect(scriptResult.status).toBe('terminal-log');
      expect(fs.existsSync('/inbox')).toBe(true);
      expect(fs.readdirSync('/inbox')).toEqual([EXPECTED_PROCESSED_FILENAME]);
    });

    test('should leave file in _inbox when AI result validation fails', async () => {
      testEnv = createSingleFileEnv();

      const aiModule = require('../scripts/services/ai.js');
      aiModule.getAIEnrichment = mockAISuccess({
        title: 'Invalid-AI-Title',
        summary: 'Summary without tags',
        tags: null,
      });

      const scriptResult = await runScript();

      expect(scriptResult.status).toBe('terminal-log');
      const errorLogs = scriptResult.errors.join('\n');
      expect(errorLogs).toContain('AI result validation failed for _inbox/sample.md: AI result missing tags array');
      const logs = scriptResult.logs.join('\n');
      expect(logs).toContain('Keeping original file in _inbox for manual retry: _inbox/sample.md');

      const { fs } = testEnv;
      expect(fs.readdirSync('/_inbox')).toEqual(['sample.md']);
      expect(fs.readdirSync('/inbox')).toHaveLength(0);
    });

    test('should preserve existing id and timestamp metadata', async () => {
      const legacyFixture = loadFixture('pre-tagged-message.md');
      testEnv = createSingleFileEnv({
        inboxFiles: {
          'legacy.md': legacyFixture,
        },
      });

      const aiModule = require('../scripts/services/ai.js');
      const aiResponse = {
        title: 'Legacy-AI-Title',
        summary: 'Legacy summary',
        tags: ['legacy', 'ai'],
      };
      aiModule.getAIEnrichment = mockAISuccess(aiResponse);

      const scriptResult = await runScript();
      const { fs } = testEnv;

      expect(scriptResult.status).toBe('terminal-log');
      const expectedFilename = '2023-05-01-10-00-00-Legacy-AI-Title.md';
      expect(fs.readdirSync('/inbox')).toEqual([expectedFilename]);
      expect(fs.existsSync('/_inbox/legacy.md')).toBe(false);

      const output = fs.readFileSync(path.join('/inbox', expectedFilename), 'utf8');
      const { frontMatter, bodyContent } = frontMatterCodec.parse(output);

      expect(frontMatter).toMatchObject({
        id: 'legacy-id',
        created_at: '2023-05-01T10:00:00.000Z',
        summary: aiResponse.summary,
        processed_at: '2025-09-21T09:34:07.837Z',
      });
      expect(frontMatter.tags).toEqual(aiResponse.tags);
      expect(bodyContent).toContain('Legacy body content.');
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
      const originalFilename = 'original.md';
      fs.writeFileSync(`/inbox/${originalFilename}`, originalContent, 'utf8');

      const aiModule = require('../scripts/services/ai.js');
      aiModule.getAIEnrichment = mockAISuccess({ title: 'Unused', summary: 'Unused', tags: [] });

      const scriptResult = await runScript();

      expect(scriptResult.status).toBe('terminal-log');
      expect(scriptResult.terminalMessage).toMatch('Successfully processed');
      const duplicateLogs = scriptResult.logs.join('\n');
      expect(duplicateLogs).toContain('Duplicate found for http://example.com/sample. Original: inbox/original.md');
      expect(duplicateLogs).toContain(`Created duplicate ticket: inbox/${DUPLICATE_TICKET_NAME}`);
      expect(duplicateLogs).toContain('Deleted raw duplicate file: _inbox/sample.md');
      expect(scriptResult.errors).toHaveLength(0);
      expect(aiModule.getAIEnrichment).not.toHaveBeenCalled();

      const inboxFiles = fs.readdirSync('/inbox').sort();
      expect(inboxFiles).toEqual([DUPLICATE_TICKET_NAME, originalFilename]);
      expect(fs.existsSync('/_inbox/sample.md')).toBe(false);

      const duplContent = fs.readFileSync(path.join('/inbox', DUPLICATE_TICKET_NAME), 'utf8');
      const duplicateTicket = frontMatterCodec.parse(duplContent);

      expect(duplicateTicket.frontMatter).toMatchObject({
        is_duplicate: true,
        original_ref: originalFilename,
        source_url: 'http://example.com/sample',
      });
      expect(duplicateTicket.bodyContent).toContain('Дубликат, см. оригинал');
    });

    test('should detect duplicate from bundled forwarded source_url metadata', async () => {
      const bundledMessage = frontMatterCodec.stringify({
        frontMatter: {
          raw_message: true,
          timestamp: '2025-09-21T09:34:07.837Z',
          note_text: 'Bundled note',
          debug: {
            message_ids: [1001, 1002],
            bundle_start_at: '2025-09-21T09:34:07.837Z',
            bundle_end_at: '2025-09-21T09:34:12.837Z',
            bundle_status: 'normal',
            forwarded_messages: [
              {
                message_id: 1002,
                source_url: 'http://example.com/bundled-source',
              },
            ],
            source_metadata: [
              {
                message_id: 1002,
                source_url: 'http://example.com/bundled-source',
              },
            ],
          },
        },
        bodyContent: 'Bundled note',
      });

      testEnv = createSingleFileEnv({
        inboxFiles: {
          'bundle.md': bundledMessage,
        },
      });
      const { fs } = testEnv;

      const originalFilename = 'original.md';
      fs.writeFileSync(`/inbox/${originalFilename}`, [
        '---',
        'source_url: "http://example.com/bundled-source"',
        '---',
        '',
        'Existing processed bundle',
      ].join('\n'), 'utf8');

      const aiModule = require('../scripts/services/ai.js');
      aiModule.getAIEnrichment = mockAISuccess({ title: 'Unused', summary: 'Unused', tags: [] });

      const scriptResult = await runScript();

      expect(scriptResult.logs.join('\n')).toContain(
        'Duplicate found for http://example.com/bundled-source. Original: inbox/original.md'
      );
      expect(aiModule.getAIEnrichment).not.toHaveBeenCalled();
      expect(fs.readdirSync('/inbox').sort()).toEqual([DUPLICATE_TICKET_NAME, originalFilename]);
      expect(fs.existsSync('/_inbox/bundle.md')).toBe(false);
    });

    test('should preserve bundle metadata fields after AI enrichment', async () => {
      const bundledMessage = frontMatterCodec.stringify({
        frontMatter: {
          raw_message: true,
          timestamp: '2025-09-21T09:34:07.837Z',
          note_text: 'Bundled note',
          source_info: 'Neural Kovalskii',
          source_urls: ['http://example.com/bundle-keep'],
          debug: {
            message_ids: [2001, 2002],
            bundle_start_at: '2025-09-21T09:34:07.837Z',
            bundle_end_at: '2025-09-21T09:34:09.837Z',
            bundle_status: 'normal',
            forwarded_messages: [
              {
                message_id: 2002,
                source_url: 'http://example.com/bundle-keep',
                content: 'Forwarded entry',
              },
            ],
            source_metadata: [
              {
                message_id: 2002,
                source_url: 'http://example.com/bundle-keep',
              },
            ],
          },
        },
        bodyContent: 'Bundled note',
      });

      testEnv = createSingleFileEnv({
        inboxFiles: {
          'bundle.md': bundledMessage,
        },
      });
      const { fs } = testEnv;

      const aiModule = require('../scripts/services/ai.js');
      aiModule.getAIEnrichment = mockAISuccess({
        title: 'Bundle-AI-Title',
        summary: 'Bundle summary',
        tags: ['bundle', 'ai'],
      });

      const scriptResult = await runScript();

      expect(scriptResult.errors).toHaveLength(0);
      expect(fs.readdirSync('/inbox')).toEqual([buildFilename('Bundle-AI-Title')]);

      const output = fs.readFileSync(path.join('/inbox', buildFilename('Bundle-AI-Title')), 'utf8');
      const { frontMatter } = frontMatterCodec.parse(output);

      expect(frontMatter).toMatchObject({
        source_info: 'Neural Kovalskii',
        source_url: 'http://example.com/bundle-keep',
        summary: 'Bundle summary',
        tags: ['bundle', 'ai'],
      });
      expect(frontMatter.note_text).toBeUndefined();
      expect(frontMatter.source_urls).toBeUndefined();
      expect(frontMatter.debug).toMatchObject({
        message_ids: [2001, 2002],
        bundle_start_at: '2025-09-21T09:34:07.837Z',
        bundle_end_at: '2025-09-21T09:34:09.837Z',
        bundle_status: 'normal',
      });
      expect(frontMatter.debug.forwarded_messages).toHaveLength(1);
      expect(frontMatter.debug.source_metadata).toHaveLength(1);
    });

    test('should reuse hashtag from note section in resulting tags', async () => {
      const bundledMessage = frontMatterCodec.stringify({
        frontMatter: {
          raw_message: true,
          timestamp: '2025-09-21T09:34:07.837Z',
        },
        bodyContent: [
          '==== NOTE ====',
          '',
          'check the #CLI out',
          '',
          '==== FORWARDS ====',
          '',
          '---- Forward 1 (message_id: 2002) ----',
          'Source: Example Source',
          '',
          'Forwarded entry',
        ].join('\n'),
      });

      testEnv = createSingleFileEnv({
        inboxFiles: {
          'bundle.md': bundledMessage,
        },
      });
      const { fs } = testEnv;

      const aiModule = require('../scripts/services/ai.js');
      aiModule.getAIEnrichment = mockAISuccess({
        title: 'Bundle-Tag-Reuse',
        summary: 'Bundle summary',
        tags: ['bundle', 'ai'],
      });

      await runScript();

      const output = fs.readFileSync(path.join('/inbox', buildFilename('Bundle-Tag-Reuse')), 'utf8');
      const { frontMatter } = frontMatterCodec.parse(output);

      expect(frontMatter.tags).toEqual(['bundle', 'ai', 'cli']);
    });
  });

  describe('Scenario 2: two files', () => {
    test('should leave both files in _inbox when both fail', async () => {
      testEnv = createTwoFileEnv();

      const aiModule = require('../scripts/services/ai.js');
      aiModule.getAIEnrichment = mockAISequence([
        { type: 'failure', error: 'first failure' },
        { type: 'failure', error: 'second failure' },
      ]);

      const scriptResult = await runScript();
      const { fs } = testEnv;

      expect(scriptResult.status).toBe('terminal-log');
      expect(scriptResult.terminalMessage).toMatch('Successfully processed');
      const bothFailLogs = scriptResult.logs.join('\n');
      expect(bothFailLogs).toContain('Starting message processing...');
      expect(bothFailLogs).toContain('Found 2 files to process');
      expect(bothFailLogs).toContain('Processing file: first.md');
      expect(bothFailLogs).toContain('Keeping original file in _inbox for manual retry: _inbox/first.md');
      expect(bothFailLogs).toContain('Processing file: second.md');
      expect(bothFailLogs).toContain('Keeping original file in _inbox for manual retry: _inbox/second.md');
      expect(bothFailLogs).toContain('Successfully processed 0 files');
      expect(bothFailLogs).toContain('Left 2 files in _inbox after AI failures');
      expect(scriptResult.errors).toEqual([
        'AI enrichment failed for _inbox/first.md: first failure',
        'AI enrichment failed for _inbox/second.md: second failure',
      ]);

      expect(fs.readdirSync('/_inbox').sort()).toEqual(['first.md', 'second.md']);
      expect(fs.readdirSync('/inbox')).toHaveLength(0);
    });

    test('should process one and leave one when the first fails and second succeeds', async () => {
      testEnv = createTwoFileEnv();

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
      const failThenSuccessLogs = scriptResult.logs.join('\n');
      expect(failThenSuccessLogs).toContain('Starting message processing...');
      expect(failThenSuccessLogs).toContain('Found 2 files to process');
      expect(failThenSuccessLogs).toContain('Processing file: first.md');
      expect(failThenSuccessLogs).toContain('Keeping original file in _inbox for manual retry: _inbox/first.md');
      expect(failThenSuccessLogs).toContain('Processing file: second.md');
      expect(failThenSuccessLogs).toContain(`Created processed file: inbox/${buildFilename('Second-AI-Title')}`);
      expect(failThenSuccessLogs).toContain('Deleted original file: _inbox/second.md');
      expect(failThenSuccessLogs).toContain('Successfully processed 1 files');
      expect(failThenSuccessLogs).toContain('Left 1 files in _inbox after AI failures');
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
      testEnv = createTwoFileEnv();

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
      const successThenFailLogs = scriptResult.logs.join('\n');
      expect(successThenFailLogs).toContain('Starting message processing...');
      expect(successThenFailLogs).toContain('Found 2 files to process');
      expect(successThenFailLogs).toContain('Processing file: first.md');
      expect(successThenFailLogs).toContain(`Created processed file: inbox/${buildFilename('First-AI-Title')}`);
      expect(successThenFailLogs).toContain('Deleted original file: _inbox/first.md');
      expect(successThenFailLogs).toContain('Processing file: second.md');
      expect(successThenFailLogs).toContain('Keeping original file in _inbox for manual retry: _inbox/second.md');
      expect(successThenFailLogs).toContain('Successfully processed 1 files');
      expect(successThenFailLogs).toContain('Left 1 files in _inbox after AI failures');
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
      testEnv = createTwoFileEnv();

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
      const bothSuccessLogs = scriptResult.logs.join('\n');
      expect(bothSuccessLogs).toContain('Starting message processing...');
      expect(bothSuccessLogs).toContain('Found 2 files to process');
      expect(bothSuccessLogs).toContain('Processing file: first.md');
      expect(bothSuccessLogs).toContain(`Created processed file: inbox/${buildFilename('First-AI-Title')}`);
      expect(bothSuccessLogs).toContain('Deleted original file: _inbox/first.md');
      expect(bothSuccessLogs).toContain('Processing file: second.md');
      expect(bothSuccessLogs).toContain(`Created processed file: inbox/${buildFilename('Second-AI-Title')}`);
      expect(bothSuccessLogs).toContain('Deleted original file: _inbox/second.md');
      expect(bothSuccessLogs).toContain('Successfully processed 2 files');
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

    test('should continue processing other files when reading one fails', async () => {
      testEnv = createEmptyEnv({
        inboxFiles: {
          'problem.md': loadFixture('sample-message.md'),
          'sample.md': loadFixture('sample-message.md'),
        },
        randomValues: DEFAULT_RANDOM_VALUES,
      });

      const memfs = require('memfs');
      const originalReadFileSync = memfs.fs.readFileSync;
      jest.spyOn(memfs.fs, 'readFileSync').mockImplementation((filePath, ...args) => {
        if (String(filePath).includes('problem.md')) {
          throw new Error('forced failure');
        }
        return originalReadFileSync.call(memfs.fs, filePath, ...args);
      });

      const aiModule = require('../scripts/services/ai.js');
      aiModule.getAIEnrichment = mockAISuccess({
        title: 'Mocked-AI-Title-For-The-Article',
        summary: 'This is a mocked summary provided by the test.',
        tags: ['mocked', 'ai', 'test-harness'],
      });

      const scriptResult = await runScript();
      const { fs } = testEnv;

      expect(scriptResult.status).toBe('terminal-log');
      const joinedLogs = scriptResult.logs.join('\n');
      expect(joinedLogs).toContain('Processing file: problem.md');
      expect(joinedLogs).toContain('Processing file: sample.md');
      expect(joinedLogs).toContain('Successfully processed 1 files');
      expect(joinedLogs).toContain('Left 1 files in _inbox after AI failures');
      const errorOutput = scriptResult.errors.join('\n');
      expect(errorOutput).toContain('Error processing problem.md: forced failure');

      expect(fs.readdirSync('/_inbox')).toEqual(['problem.md']);
      expect(fs.readdirSync('/inbox')).toEqual([EXPECTED_PROCESSED_FILENAME]);
    });
  });
});
