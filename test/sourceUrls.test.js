const { extractSourceUrls } = require('../scripts/core/sourceUrls');

describe('sourceUrls.extractSourceUrls', () => {
  test('returns unique non-empty URLs from all supported metadata fields', () => {
    const sourceUrls = extractSourceUrls({
      source_url: 'https://a.example',
      source_urls: ['https://b.example', '', 'https://a.example'],
      forwarded_messages: [
        { source_url: 'https://c.example' },
        { source_url: 'https://b.example' },
      ],
      source_metadata: [
        { source_url: 'https://d.example' },
      ],
    });

    expect(sourceUrls).toEqual([
      'https://a.example',
      'https://b.example',
      'https://c.example',
      'https://d.example',
    ]);
  });

  test('returns empty list for invalid input', () => {
    expect(extractSourceUrls(undefined)).toEqual([]);
    expect(extractSourceUrls(null)).toEqual([]);
    expect(extractSourceUrls('not-object')).toEqual([]);
  });
});
