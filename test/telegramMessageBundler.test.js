const {
  buildMessageBundles,
  DEFAULT_BUNDLE_WINDOW_MS,
} = require('../scripts/core/telegramMessageBundler');

const WINDOW_MS = DEFAULT_BUNDLE_WINDOW_MS;

describe('telegramMessageBundler.buildMessageBundles', () => {
  test('creates a normal bundle with note and forwards inside the 10 second window', () => {
    const bundles = buildMessageBundles([
      makeNote(101, 1000, 'User note'),
      makeForward(201, 4000, 'Forwarded content'),
      makeForward(202, 9000, 'Second forwarded content'),
    ]);

    expect(bundles).toHaveLength(1);
    expect(bundles[0]).toMatchObject({
      note_text: 'User note',
      message_ids: [101, 201, 202],
      status: 'normal',
      forwarded_messages: [
        expect.objectContaining({ message_id: 201, content: 'Forwarded content' }),
        expect.objectContaining({ message_id: 202, content: 'Second forwarded content' }),
      ],
    });
  });

  test('preserves note-only bundle when no forward appears before stream end', () => {
    const bundles = buildMessageBundles([makeNote(101, 1000, 'Note only')]);

    expect(bundles).toHaveLength(1);
    expect(bundles[0]).toEqual({
      note_text: 'Note only',
      forwarded_messages: [],
      bundle_start_at: '1970-01-01T00:00:01.000Z',
      bundle_end_at: '1970-01-01T00:00:01.000Z',
      message_ids: [101],
      source_metadata: [
        {
          message_id: 101,
          message_type: 'note',
          source_info: 'direct_message',
          source_url: '',
          forward_protected: false,
        },
      ],
      status: 'normal',
      ambiguity_reason: undefined,
    });
  });

  test('terminates active note bundle on other message', () => {
    const bundles = buildMessageBundles([
      makeNote(101, 1000, 'First note'),
      makeOther(301, 7000),
    ]);

    expect(bundles).toHaveLength(1);
    expect(bundles[0].bundle_end_at).toBe('1970-01-01T00:00:07.000Z');
  });

  test('marks orphan forward as ambiguous when it arrives after note window', () => {
    const bundles = buildMessageBundles([
      makeNote(101, 1000, 'Windowed note'),
      makeForward(201, 1000 + WINDOW_MS + 1, 'Late forward'),
    ]);

    expect(bundles).toHaveLength(2);
    expect(bundles[0]).toMatchObject({
      note_text: 'Windowed note',
      forwarded_messages: [],
      bundle_end_at: '1970-01-01T00:00:11.000Z',
      status: 'normal',
    });
    expect(bundles[1]).toMatchObject({
      note_text: '',
      message_ids: [201],
      status: 'ambiguous',
      ambiguity_reason: 'orphan_forward',
      forwarded_messages: [
        expect.objectContaining({ message_id: 201, content: 'Late forward' }),
      ],
    });
  });

  test('marks both bundles ambiguous on timestamp conflict', () => {
    const bundles = buildMessageBundles([
      makeNote(101, 1000, 'Conflicting note'),
      makeForward(201, 1000, 'Conflicting forward'),
    ]);

    expect(bundles).toHaveLength(2);
    expect(bundles[0]).toMatchObject({
      note_text: 'Conflicting note',
      status: 'ambiguous',
      ambiguity_reason: 'sequencing_conflict',
    });
    expect(bundles[1]).toMatchObject({
      note_text: '',
      status: 'ambiguous',
      ambiguity_reason: 'timestamp_conflict',
      message_ids: [201],
    });
  });

  test('starts a new normal bundle when another note arrives', () => {
    const bundles = buildMessageBundles([
      makeNote(101, 1000, 'First note'),
      makeForward(201, 1500, 'Forward from first note'),
      makeNote(102, 5000, 'Second note'),
    ]);

    expect(bundles).toHaveLength(2);
    expect(bundles.map((bundle) => bundle.note_text)).toEqual(['First note', 'Second note']);
    expect(bundles.map((bundle) => bundle.status)).toEqual(['normal', 'normal']);
  });
});

function makeForward(messageId, timestampMs, content) {
  return {
    type: 'forward',
    messageId,
    timestampMs,
    content,
    forwardMetadata: {
      sourceInfo: '@source',
      sourceUrl: 'https://t.me/source/1',
      hasMedia: false,
      mediaType: 'none',
      forwardDate: '2025-01-01T00:00:00.000Z',
      forwardProtected: false,
    },
  };
}

function makeNote(messageId, timestampMs, noteText) {
  return {
    type: 'note',
    messageId,
    timestampMs,
    noteText,
  };
}

function makeOther(messageId, timestampMs) {
  return {
    type: 'other',
    messageId,
    timestampMs,
  };
}
