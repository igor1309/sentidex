const {
  enrichMessage,
  detectLanguage,
  generateId,
} = require('../scripts/core/messageProcessor');

describe('messageProcessor.enrichMessage', () => {
  const frontMatter = {
    id: 'existing-id',
    timestamp: '2023-12-31T23:59:59.000Z',
    source_info: 'telegram',
    source_url: 'https://example.com/message',
    has_media: true,
  };

  afterEach(() => {
    jest.useRealTimers();
  });

  it('throws when aiResults is missing', () => {
    expect(() => enrichMessage({ frontMatter, bodyContent: 'content' })).toThrow(
      'enrichMessage requires a non-empty aiResults object'
    );
  });

  it('throws when aiResults title is empty', () => {
    expect(() =>
      enrichMessage(
        { frontMatter, bodyContent: 'content' },
        { title: '', summary: 'summary', tags: ['tag'] }
      )
    ).toThrow('AI result missing title');
  });

  it('throws when aiResults summary is empty', () => {
    expect(() =>
      enrichMessage(
        { frontMatter, bodyContent: 'content' },
        { title: 'title', summary: '', tags: ['tag'] }
      )
    ).toThrow('AI summary must be a non-empty string');
  });

  it('throws when aiResults tags is not an array', () => {
    expect(() =>
      enrichMessage(
        { frontMatter, bodyContent: 'content' },
        { title: 'title', summary: 'summary', tags: 'tag' }
      )
    ).toThrow('AI result missing tags array');
  });

  it('produces deterministic enriched front matter for valid input', () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00.000Z'));

    const result = enrichMessage(
      {
        frontMatter,
        bodyContent: 'Hello мир',
      },
      {
        title: 'ai-title',
        summary: 'processed summary',
        tags: ['news'],
      }
    );

    expect(result).toEqual({
      id: 'existing-id',
      created_at: '2023-12-31T23:59:59.000Z',
      source_info: 'telegram',
      source_url: 'https://example.com/message',
      has_media: true,
      language: 'mixed',
      summary: 'processed summary',
      tags: ['news'],
      processed_at: '2024-01-01T00:00:00.000Z',
    });
  });

  it('falls back to defaults when front matter fields are missing', () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00.000Z'));

    const result = enrichMessage(
      {
        frontMatter: {},
        bodyContent: '',
      },
      {
        title: 'ai-title',
        summary: 'processed summary',
        tags: ['news'],
      }
    );

    expect(result.id).toEqual(expect.any(String));
    expect(result).toMatchObject({
      created_at: '2024-01-01T00:00:00.000Z',
      source_info: 'unknown',
      source_url: '',
      has_media: false,
      language: 'unknown',
      summary: 'processed summary',
      tags: ['news'],
      processed_at: '2024-01-01T00:00:00.000Z',
    });
  });
});

describe('messageProcessor.detectLanguage', () => {
  it('returns unknown for non-string input', () => {
    expect(detectLanguage(undefined)).toBe('unknown');
  });

  it('detects Russian content', () => {
    expect(detectLanguage('Привет, как дела?')).toBe('ru');
  });

  it('detects English content', () => {
    expect(detectLanguage('Hello, how are you?')).toBe('en');
  });

  it('detects mixed content', () => {
    expect(detectLanguage('Hello, мир')).toBe('mixed');
  });
});

describe('messageProcessor.generateId', () => {
  it('generates unique base36 strings', () => {
    const first = generateId();
    const second = generateId();

    expect(typeof first).toBe('string');
    expect(typeof second).toBe('string');
    expect(first).not.toBe(second);
    expect(first).toMatch(/^[0-9a-z]+$/);
    expect(second).toMatch(/^[0-9a-z]+$/);
  });
});
