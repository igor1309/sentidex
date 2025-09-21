const path = require('path');
const util = require('util');

const DEFAULT_TERMINAL_PATTERNS = [
  /Successfully processed \d+ files/, // Success path
  /No files to process in _inbox/, // Empty inbox
  /No _inbox directory found/, // Missing inbox
  /Error in message processing:/, // Fatal error handler
];

function normalizePatterns(patterns) {
  if (!patterns || patterns.length === 0) {
    return DEFAULT_TERMINAL_PATTERNS;
  }

  return patterns.map((pattern) => {
    if (pattern instanceof RegExp) {
      return pattern;
    }

    if (typeof pattern === 'string') {
      return new RegExp(pattern);
    }

    throw new TypeError('terminalLogPatterns must contain strings or regular expressions.');
  });
}

function runScript(options = {}) {
  const {
    scriptPath = './scripts/process-messages.js',
    terminalLogPatterns,
    isolateModules = true,
  } = options;

  const absoluteScriptPath = path.resolve(scriptPath);
  const terminalPatterns = normalizePatterns(terminalLogPatterns);

  const result = {
    logs: [],
    errors: [],
    exitCode: undefined,
    exitCalls: 0,
    status: 'pending',
    terminalMessage: undefined,
    thrownError: undefined,
  };

  const spies = {};
  const cleanup = () => {
    Object.values(spies).forEach(spy => {
      if (spy && typeof spy.mockRestore === 'function') {
        spy.mockRestore();
      }
    });
  };

  return new Promise((resolve) => {
    let settled = false;

    const finish = (status, extra = {}) => {
      if (settled) {
        return;
      }
      settled = true;
      result.status = status;
      Object.assign(result, extra);
      Promise.resolve().then(() => {
        cleanup();
        resolve(result);
      });
    };

    const shouldFinishForMessage = (message) => {
      return terminalPatterns.some((pattern) => pattern.test(message));
    };

    const recordAndMaybeFinish = (type, args) => {
      const message = util.format(...args);

      if (type === 'log') {
        result.logs.push(message);
      } else {
        result.errors.push(message);
      }

      if (shouldFinishForMessage(message)) {
        finish('terminal-log', { terminalMessage: message });
      }
    };

    spies.log = jest.spyOn(console, 'log').mockImplementation((...args) => {
      recordAndMaybeFinish('log', args);
    });

    spies.error = jest.spyOn(console, 'error').mockImplementation((...args) => {
      recordAndMaybeFinish('error', args);
    });

    spies.exit = jest.spyOn(process, 'exit').mockImplementation((code) => {
      result.exitCalls += 1;
      result.exitCode = code;
      finish('process-exit', { exitCode: code });
    });

    const execute = () => require(absoluteScriptPath);

    try {
      if (isolateModules && typeof jest.isolateModules === 'function') {
        jest.isolateModules(execute);
      } else {
        execute();
      }
    } catch (error) {
      result.thrownError = error;
      recordAndMaybeFinish('error', [error]);
      finish('exception', { thrownError: error });
      return;
    }

  });
}

module.exports = {
  runScript,
};
