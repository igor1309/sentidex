const path = require('path');

describe('process-messages script (Characterization Test)', () => {
  
  beforeEach(() => {
    jest.resetModules(); // Reset module cache before each test

    // Set up memfs volume
    const { vol } = require('memfs');
    const realFs = jest.requireActual('fs');
    const fixtureContent = realFs.readFileSync(path.join(__dirname, 'test-fixtures/sample-message.md'), 'utf8');
    vol.mkdirSync('/_inbox', { recursive: true });
    vol.mkdirSync('/inbox', { recursive: true });
    vol.writeFileSync('/_inbox/sample.md', fixtureContent);

    // Mock CWD
    jest.spyOn(process, 'cwd').mockReturnValue('/');
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
    const { fs } = require('memfs');

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
