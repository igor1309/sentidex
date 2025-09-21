const path = require('path');

const INBOX_ROOT = '/_inbox';
const OUTBOX_ROOT = '/inbox';

function coerceDateLike(value) {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'string') {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.valueOf())) {
      throw new TypeError(`Invalid date value received: ${value}`);
    }
    return parsed;
  }

  throw new TypeError('systemTime must be a Date instance, timestamp, or ISO date string.');
}

function createRandomMock(randomValues) {
  if (typeof randomValues === 'function') {
    return randomValues;
  }

  if (Array.isArray(randomValues)) {
    const queue = [...randomValues];
    return () => {
      if (queue.length === 0) {
        throw new Error('Ran out of mocked Math.random values.');
      }
      return queue.shift();
    };
  }

  if (typeof randomValues === 'number') {
    return () => randomValues;
  }

  return () => 0.123456789;
}

/**
 * Sets up the memfs volume and process mocks for the harness tests.
 *
 * @param {Object} [options]
 * @param {Object.<string,string|Buffer>} [options.inboxFiles] Mapping of relative file paths inside `_inbox` to their contents.
 * @param {string} [options.cwd='/'] Value returned by `process.cwd`.
 * @param {Date|string|number} [options.systemTime] Freeze `Date` outputs at the provided moment.
 * @param {number|Function|number[]} [options.randomValues] Deterministic `Math.random` values or generator.
 * @returns {{ fs: import('fs'), vol: import('memfs').vol, restore: Function }} The memfs handles and cleanup hook.
 */
function setupTestEnvironment(options = {}) {
  const {
    inboxFiles = {},
    cwd = '/',
    systemTime,
    randomValues,
    skipInboxDir = false,
    skipOutboxDir = false,
  } = options;

  jest.resetModules();

  let timersMocked = false;
  if (systemTime !== undefined) {
    const coercedDate = coerceDateLike(systemTime);
    jest.useFakeTimers();
    jest.setSystemTime(coercedDate);
    timersMocked = true;
  }

  const memfs = require('memfs');
  const { vol, fs } = memfs;

  jest.doMock('memfs', () => memfs);

  vol.reset();

  if (!skipInboxDir) {
    vol.mkdirSync(INBOX_ROOT, { recursive: true });
  }
  if (!skipOutboxDir) {
    vol.mkdirSync(OUTBOX_ROOT, { recursive: true });
  }

  for (const [relativePath, contents] of Object.entries(inboxFiles)) {
    const targetPath = path.posix.join(INBOX_ROOT, relativePath);
    const directory = path.posix.dirname(targetPath);
    vol.mkdirSync(directory, { recursive: true });

    if (!(typeof contents === 'string' || Buffer.isBuffer(contents))) {
      throw new TypeError(`Expected inbox file contents to be a string or Buffer for "${relativePath}".`);
    }

    vol.writeFileSync(targetPath, contents);
  }

  jest.spyOn(process, 'cwd').mockReturnValue(cwd);

  const randomMock = createRandomMock(randomValues);
  jest.spyOn(Math, 'random').mockImplementation(randomMock);

  return {
    fs,
    vol,
    restore: () => {
      jest.dontMock('memfs');
      if (timersMocked) {
        jest.useRealTimers();
      }
    },
  };
}

module.exports = {
  setupTestEnvironment,
};
