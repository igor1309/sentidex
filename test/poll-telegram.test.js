const path = require('path');
const frontMatterCodec = require('../scripts/adapters/frontMatterCodec');
const { setupTestEnvironment } = require('./harness/setupTestEnvironment');

describe('poll-telegram script', () => {
  let testEnv;

  beforeEach(() => {
    testEnv = setupTestEnvironment();
    process.env.BOT_TOKEN = 'test-token';
    process.env.CHAT_ID = '12345';
    process.env.DEBUG = 'false';
    jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  afterEach(() => {
    if (testEnv && typeof testEnv.restore === 'function') {
      testEnv.restore();
    }

    delete process.env.BOT_TOKEN;
    delete process.env.CHAT_ID;
    delete process.env.DEBUG;
    delete global.fetch;
    jest.restoreAllMocks();
  });

  test('creates one normal bundle file for note followed by forwards in window', async () => {
    const updates = [
      makeUpdate(1, makeNoteMessage(1001, 1700000000, 'Bundled note text')),
      makeUpdate(2, makeForwardMessage(1002, 1700000005, 'Forward one', 'source-a', 321)),
      makeUpdate(3, makeForwardMessage(1003, 1700000009, 'Forward two', 'source-b', 654)),
    ];
    mockTelegramFetch(updates);

    const { pollTelegram } = require('../scripts/poll-telegram');
    await pollTelegram();

    const { fs } = testEnv;
    const bundles = readInboxBundles(fs);

    expect(bundles).toHaveLength(1);
    expect(bundles[0].frontMatter).toMatchObject({
      source_info: 'Channel source-a',
      source_url: 'https://t.me/source-a/321',
      source_urls: ['https://t.me/source-a/321', 'https://t.me/source-b/654'],
    });
    expect(bundles[0].frontMatter.debug).toMatchObject({
      message_ids: [1001, 1002, 1003],
      bundle_status: 'normal',
    });
    expect(bundles[0].frontMatter.note_text).toBeUndefined();
    expect(bundles[0].frontMatter.debug.forwarded_messages).toHaveLength(2);
    expect(bundles[0].bodyContent).toContain('==== NOTE ====');
    expect(bundles[0].bodyContent).toContain('==== FORWARDS ====');
    expect(bundles[0].bodyContent).toContain('---- Forward 1 (message_id: 1002) ----');
    expect(bundles[0].bodyContent).toContain('Bundled note text');
    expect(bundles[0].bodyContent).toContain('Forward 1');
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ offset: 4 });
  });

  test('terminates note-only bundle on other message', async () => {
    const updates = [
      makeUpdate(1, makeNoteMessage(2001, 1700000100, 'Note that should close on other')),
      makeUpdate(2, makeOtherMessage(2002, 1700000107)),
    ];
    mockTelegramFetch(updates);

    const { pollTelegram } = require('../scripts/poll-telegram');
    await pollTelegram();

    const { fs } = testEnv;
    const bundles = readInboxBundles(fs);

    expect(bundles).toHaveLength(1);
    expect(bundles[0].frontMatter).toMatchObject({
      source_info: 'direct_message',
    });
    expect(bundles[0].frontMatter.debug).toMatchObject({
      message_ids: [2001],
      bundle_status: 'normal',
      bundle_end_at: '2023-11-14T22:15:07.000Z',
    });
    expect(bundles[0].frontMatter.note_text).toBeUndefined();
    expect(bundles[0].frontMatter.debug.forwarded_messages).toEqual([]);
    expect(bundles[0].frontMatter.source_url).toBeUndefined();
    expect(bundles[0].frontMatter.source_urls).toBeUndefined();
    expect(bundles[0].bodyContent).toContain('==== NOTE ====');
    expect(bundles[0].bodyContent).not.toContain('==== FORWARDS ====');
  });

  test('emits normal plus ambiguous bundle when forward arrives after timeout window', async () => {
    const updates = [
      makeUpdate(1, makeNoteMessage(3001, 1700000200, 'Timed note')),
      makeUpdate(2, makeForwardMessage(3002, 1700000211, 'Late forward', 'late-source', 999)),
    ];
    mockTelegramFetch(updates);

    const { pollTelegram } = require('../scripts/poll-telegram');
    await pollTelegram();

    const { fs } = testEnv;
    const bundles = readInboxBundles(fs);

    expect(bundles).toHaveLength(2);
    const normalBundle = bundles.find((bundle) => bundle.frontMatter.debug.bundle_status === 'normal');
    const ambiguousBundle = bundles.find((bundle) => bundle.frontMatter.debug.bundle_status === 'ambiguous');

    expect(normalBundle.frontMatter).toMatchObject({
    });
    expect(normalBundle.frontMatter.debug).toMatchObject({
      message_ids: [3001],
      bundle_end_at: '2023-11-14T22:16:50.000Z',
    });
    expect(ambiguousBundle.frontMatter).toMatchObject({
      source_url: 'https://t.me/late-source/999',
    });
    expect(ambiguousBundle.frontMatter.source_urls).toBeUndefined();
    expect(ambiguousBundle.frontMatter.debug).toMatchObject({
      message_ids: [3002],
      bundle_status: 'ambiguous',
      ambiguity_reason: 'orphan_forward',
    });
  });

  test('skips updates from non-target chats', async () => {
    const updates = [
      makeUpdate(1, {
        ...makeNoteMessage(4001, 1700000300, 'Wrong chat note'),
        chat: { id: 99999 },
      }),
    ];
    mockTelegramFetch(updates);

    const { pollTelegram } = require('../scripts/poll-telegram');
    await pollTelegram();

    const { fs } = testEnv;
    expect(fs.readdirSync('/_inbox')).toHaveLength(0);
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ offset: 2 });
  });

  test('skips media group follower entries', async () => {
    const updates = [
      makeUpdate(1, {
        message_id: 5001,
        date: 1700000400,
        chat: { id: 12345 },
        from: { id: 1, is_bot: false },
        media_group_id: 'group-1',
        photo: [{ file_id: 'p1' }],
      }),
    ];
    mockTelegramFetch(updates);

    const { pollTelegram } = require('../scripts/poll-telegram');
    await pollTelegram();

    const { fs } = testEnv;
    expect(fs.readdirSync('/_inbox')).toHaveLength(0);
  });

  test('classifies channel-origin plain text as other, not note', async () => {
    const updates = [
      makeUpdate(1, {
        message_id: 6001,
        date: 1700000500,
        chat: { id: 12345, type: 'channel' },
        sender_chat: { id: 321, title: 'Channel Author' },
        text: 'Channel post text',
      }),
    ];
    mockTelegramFetch(updates);

    const { pollTelegram } = require('../scripts/poll-telegram');
    await pollTelegram();

    const { fs } = testEnv;
    expect(fs.readdirSync('/_inbox')).toHaveLength(0);
  });

  test('extracts source metadata from forward_origin variants', async () => {
    const updates = [
      makeUpdate(1, makeNoteMessage(7001, 1700000600, 'header note')),
      makeUpdate(2, makeForwardOriginUserMessage(7002, 1700000601)),
      makeUpdate(3, makeForwardOriginChatMessage(7003, 1700000602)),
      makeUpdate(4, makeForwardOriginChannelMessage(7004, 1700000603)),
      makeUpdate(5, makeForwardOriginHiddenUserMessage(7005, 1700000604)),
    ];
    mockTelegramFetch(updates);

    const { pollTelegram } = require('../scripts/poll-telegram');
    await pollTelegram();

    const { fs } = testEnv;
    const bundles = readInboxBundles(fs);

    expect(bundles).toHaveLength(1);
    const forwardedMessages = bundles[0].frontMatter.debug.forwarded_messages;
    expect(forwardedMessages.map((entry) => entry.source_info)).toEqual([
      '@origin-user',
      'Origin Chat',
      'Origin Channel',
      'Hidden Origin',
    ]);
    expect(forwardedMessages.find((entry) => entry.message_id === 7004)).toMatchObject({
      source_url: 'https://t.me/origin-channel/1234',
    });
    expect(forwardedMessages.find((entry) => entry.message_id === 7005)).toMatchObject({
      forward_protected: true,
    });
  });

  test('marks both bundles ambiguous on timestamp conflict for forward ordering', async () => {
    const updates = [
      makeUpdate(1, makeNoteMessage(8001, 1700000700, 'note')),
      makeUpdate(3, makeForwardMessage(8002, 1700000705, 'forward one', 'conflict-a', 1)),
      makeUpdate(2, makeForwardMessage(8003, 1700000705, 'forward two', 'conflict-b', 2)),
    ];
    mockTelegramFetch(updates);

    const { pollTelegram } = require('../scripts/poll-telegram');
    await pollTelegram();

    const { fs } = testEnv;
    const bundles = readInboxBundles(fs);

    expect(bundles).toHaveLength(2);
    const firstBundle = bundles.find((bundle) => bundle.frontMatter.debug.message_ids.includes(8001));
    const secondBundle = bundles.find((bundle) => bundle.frontMatter.debug.message_ids.includes(8003));

    expect(firstBundle.frontMatter.debug).toMatchObject({
      bundle_status: 'ambiguous',
      ambiguity_reason: 'sequencing_conflict',
    });
    expect(secondBundle.frontMatter.debug).toMatchObject({
      bundle_status: 'ambiguous',
      ambiguity_reason: 'timestamp_conflict',
    });
  });

  test('uses update_id ordering for note and forward with equal timestamps', async () => {
    const updates = [
      makeUpdate(10, makeNoteMessage(8101, 1700000800, 'same-second note')),
      makeUpdate(11, makeForwardMessage(8102, 1700000800, 'same-second forward', 'equal-ts', 77)),
    ];
    mockTelegramFetch(updates);

    const { pollTelegram } = require('../scripts/poll-telegram');
    await pollTelegram();

    const { fs } = testEnv;
    const bundles = readInboxBundles(fs);

    expect(bundles).toHaveLength(1);
    expect(bundles[0].frontMatter).toMatchObject({
      source_url: 'https://t.me/equal-ts/77',
    });
    expect(bundles[0].frontMatter.source_urls).toBeUndefined();
    expect(bundles[0].frontMatter.debug).toMatchObject({
      message_ids: [8101, 8102],
      bundle_status: 'normal',
    });
  });
});

function mockTelegramFetch(updates) {
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, result: updates }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, result: [] }),
    });
}

function readInboxBundles(fs) {
  const files = fs.readdirSync('/_inbox').sort();
  return files.map((file) => {
    const content = fs.readFileSync(path.join('/_inbox', file), 'utf8');
    return {
      file,
      ...frontMatterCodec.parse(content),
    };
  });
}

function makeUpdate(updateId, message) {
  return {
    update_id: updateId,
    message,
  };
}

function makeNoteMessage(messageId, unixSeconds, text) {
  return {
    message_id: messageId,
    date: unixSeconds,
    chat: { id: 12345 },
    from: { id: 1, is_bot: false },
    text,
  };
}

function makeForwardMessage(messageId, unixSeconds, text, channelUsername, forwardMessageId) {
  return {
    message_id: messageId,
    date: unixSeconds,
    chat: { id: 12345 },
    from: { id: 2, is_bot: false },
    text,
    forward_from_chat: {
      title: `Channel ${channelUsername}`,
      username: channelUsername,
    },
    forward_from_message_id: forwardMessageId,
    forward_date: unixSeconds - 60,
  };
}

function makeOtherMessage(messageId, unixSeconds) {
  return {
    message_id: messageId,
    date: unixSeconds,
    chat: { id: 12345 },
    from: { id: 1, is_bot: false },
    poll: {
      question: 'Is this an other message?',
      type: 'regular',
      options: [
        { text: 'yes', voter_count: 0 },
      ],
    },
  };
}

function makeForwardOriginUserMessage(messageId, unixSeconds) {
  return {
    message_id: messageId,
    date: unixSeconds,
    chat: { id: 12345 },
    from: { id: 2, is_bot: false },
    text: 'forward origin user',
    forward_origin: {
      type: 'user',
      sender_user: {
        username: 'origin-user',
      },
    },
  };
}

function makeForwardOriginChatMessage(messageId, unixSeconds) {
  return {
    message_id: messageId,
    date: unixSeconds,
    chat: { id: 12345 },
    from: { id: 2, is_bot: false },
    text: 'forward origin chat',
    forward_origin: {
      type: 'chat',
      sender_chat: {
        title: 'Origin Chat',
      },
    },
  };
}

function makeForwardOriginChannelMessage(messageId, unixSeconds) {
  return {
    message_id: messageId,
    date: unixSeconds,
    chat: { id: 12345 },
    from: { id: 2, is_bot: false },
    text: 'forward origin channel',
    forward_origin: {
      type: 'channel',
      message_id: 1234,
      chat: {
        title: 'Origin Channel',
        username: 'origin-channel',
      },
    },
  };
}

function makeForwardOriginHiddenUserMessage(messageId, unixSeconds) {
  return {
    message_id: messageId,
    date: unixSeconds,
    chat: { id: 12345 },
    from: { id: 2, is_bot: false },
    text: 'forward origin hidden user',
    forward_origin: {
      type: 'hidden_user',
      sender_user_name: 'Hidden Origin',
    },
  };
}
