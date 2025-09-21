const path = require('path');
const { setupTestEnvironment } = require('./harness/setupTestEnvironment');
const { runScript } = require('./harness/runScript');
const { mockAISuccess } = require('./harness/mockAI');

const realFs = jest.requireActual('fs');
const sampleMessagePath = path.join(__dirname, 'test-fixtures/sample-message.md');

function loadSampleFixture() {
  return realFs.readFileSync(sampleMessagePath, 'utf8');
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

  test('should process a file correctly when required as a module', async () => {
    // Require the AI service here to get the post-reset module
    const fixtureContent = loadSampleFixture();
    testEnv = setupTestEnvironment({
      inboxFiles: {
        'sample.md': fixtureContent,
      },
      systemTime: '2025-09-21T09:34:07.837Z',
      randomValues: 0.111111111,
    });

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
    expect(outboxFiles).toHaveLength(1);

    const outputContent = fs.readFileSync(path.join('/inbox', outboxFiles[0]), 'utf8');
    
    expect(outboxFiles[0]).toMatchSnapshot("output filename");
    expect(outputContent).toMatchSnapshot("output file content");
  });
});
