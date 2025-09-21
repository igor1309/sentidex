const path = require('path');
const { setupTestEnvironment } = require('./harness/setupTestEnvironment');

const realFs = jest.requireActual('fs');
const sampleMessagePath = path.join(__dirname, 'test-fixtures/sample-message.md');

describe('process-messages script (Characterization Test)', () => {
  let testEnv;

  beforeEach(() => {
    const fixtureContent = realFs.readFileSync(sampleMessagePath, 'utf8');
    testEnv = setupTestEnvironment({
      inboxFiles: {
        'sample.md': fixtureContent,
      },
      systemTime: '2025-09-21T09:34:07.837Z',
      randomValues: 0.111111111,
    });
  });

  afterEach(() => {
    if (testEnv && typeof testEnv.restore === 'function') {
      testEnv.restore();
    }
    jest.restoreAllMocks();
    testEnv = null;
  });

  test('should process a file correctly when required as a module', async () => {
    // --- ARRANGE ---
    // Require the AI service here to get the post-reset module
    const { getAIEnrichment } = require('../scripts/services/ai.js');
    const mockAiResponse = {
      title: "Mocked-AI-Title-For-The-Article",
      summary: "This is a mocked summary provided by the test.",
      tags: ["mocked", "ai", "test-harness"],
    };
    getAIEnrichment.mockResolvedValue(mockAiResponse);

    let exitCalled;
    const exitPromise = new Promise(resolve => {
      exitCalled = resolve;
    });
    // The script doesn't exit on success, so we need a different way to wait.
    // Let's spy on the final console.log instead.
    let processingFinished;
    const processingPromise = new Promise(resolve => {
      processingFinished = resolve;
    });

    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation((message) => {
      if (message && message.includes('Successfully processed')) {
        processingFinished();
      }
    });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // --- ACT ---
    require(path.resolve('./scripts/process-messages.js'));
    await processingPromise; // Wait for the success log

    // --- ASSERT ---
    const { fs } = testEnv;

    const output = consoleSpy.mock.calls.map(args => args.join(' ')).join('\n');
    expect(output).toContain('Starting message processing...');
    expect(output).toContain('Found 1 files to process');
    expect(output).toContain('Successfully processed 1 files');
    expect(errorSpy).not.toHaveBeenCalled();

    const outboxFiles = fs.readdirSync('/inbox');
    expect(outboxFiles).toHaveLength(1);

    const outputContent = fs.readFileSync(path.join('/inbox', outboxFiles[0]), 'utf8');
    
    expect(outboxFiles[0]).toMatchSnapshot("output filename");
    expect(outputContent).toMatchSnapshot("output file content");
  });
});
