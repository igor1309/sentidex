const path = require('path');
const { setupTestEnvironment } = require('./setupTestEnvironment');
const frontMatterCodec = require('../../scripts/adapters/frontMatterCodec');

const realFs = jest.requireActual('fs');

const FIXTURE_DIR = path.join(__dirname, '..', 'test-fixtures');
const SAMPLE_FIXTURE = 'sample-message.md';
const FIRST_FIXTURE = 'first-message.md';
const SECOND_FIXTURE = 'second-message.md';

const SAMPLE_SOURCE_URL = 'http://example.com/sample';
const FIRST_SOURCE_URL = 'http://example.com/first';
const SECOND_SOURCE_URL = 'http://example.com/second';
const SAMPLE_BODY = 'This is a sample message for testing.';
const FIRST_BODY = 'This is the first sample message for testing.';
const SECOND_BODY = 'This is the second sample message for testing.';

const FROZEN_ISO = '2025-09-21T09:34:07.837Z';
const FROZEN_TIMESTAMP = '2025-09-21-09-34-07';
const DEFAULT_RANDOM_VALUES = [0.111111111, 0.222222222, 0.333333333];
const FROZEN_BASE36 = new Date(FROZEN_ISO).valueOf().toString(36);
const GENERATED_IDS = DEFAULT_RANDOM_VALUES.map(
  (value) => FROZEN_BASE36 + value.toString(36).substring(2)
);

const DUPLICATE_TICKET_NAME = `DUPL_${FROZEN_TIMESTAMP}.md`;

function loadFixture(name) {
  return realFs.readFileSync(path.join(FIXTURE_DIR, name), 'utf8');
}

function buildFilename(title) {
  return `${title}-${FROZEN_TIMESTAMP}.md`;
}

function buildProcessedContent({ id, sourceUrl, summary, tags, body }) {
  return frontMatterCodec.stringify({
    frontMatter: {
      id,
      created_at: FROZEN_ISO,
      source_info: 'unknown',
      source_url: sourceUrl,
      has_media: false,
      language: 'en',
      summary,
      tags,
      processed_at: FROZEN_ISO,
    },
    bodyContent: body,
  });
}

const EXPECTED_PROCESSED_FILENAME = buildFilename('Mocked-AI-Title-For-The-Article');
const EXPECTED_PROCESSED_CONTENT = buildProcessedContent({
  id: GENERATED_IDS[0],
  sourceUrl: SAMPLE_SOURCE_URL,
  summary: 'This is a mocked summary provided by the test.',
  tags: ['mocked', 'ai', 'test-harness'],
  body: SAMPLE_BODY,
});

function createEmptyEnv(overrides = {}) {
  return setupTestEnvironment({
    systemTime: FROZEN_ISO,
    ...overrides,
  });
}

function createNoInboxEnv(overrides = {}) {
  return setupTestEnvironment({
    systemTime: FROZEN_ISO,
    skipInboxDir: true,
    ...overrides,
  });
}

function createSingleFileEnv(overrides = {}) {
  const { inboxFiles, ...rest } = overrides;
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
    ...rest,
  });
}

function createTwoFileEnv(overrides = {}) {
  const { inboxFiles, ...rest } = overrides;
  const baseOptions = {
    inboxFiles: {
      'first.md': loadFixture(FIRST_FIXTURE),
      'second.md': loadFixture(SECOND_FIXTURE),
    },
    systemTime: FROZEN_ISO,
    randomValues: DEFAULT_RANDOM_VALUES,
  };

  if (inboxFiles) {
    baseOptions.inboxFiles = inboxFiles;
  }

  return setupTestEnvironment({
    ...baseOptions,
    ...rest,
  });
}

module.exports = {
  FROZEN_ISO,
  FROZEN_TIMESTAMP,
  DEFAULT_RANDOM_VALUES,
  GENERATED_IDS,
  DUPLICATE_TICKET_NAME,
  EXPECTED_PROCESSED_FILENAME,
  EXPECTED_PROCESSED_CONTENT,
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
};
