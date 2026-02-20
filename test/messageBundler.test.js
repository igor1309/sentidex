const {
  classifyMessage,
  bundleMessages,
  BUNDLE_WINDOW_SECONDS,
} = require('../scripts/core/messageBundler');

// --- Helpers to build Telegram message fixtures ---

function makeNote(id, date, text = 'User note') {
  return { message_id: id, date, text, chat: { id: 1 } };
}

function makeForward(id, date, opts = {}) {
  return {
    message_id: id,
    date,
    text: opts.text || 'Forwarded content',
    forward_from: opts.forward_from || { id: 99, first_name: 'Sender' },
    forward_date: opts.forward_date || date - 100,
    chat: { id: 1 },
    ...(opts.extra || {}),
  };
}

function makeForwardFromChat(id, date, chatInfo = {}) {
  return {
    message_id: id,
    date,
    text: 'Channel post',
    forward_from_chat: {
      id: -100123,
      title: 'Test Channel',
      username: 'testchannel',
      ...chatInfo,
    },
    forward_date: date - 200,
    chat: { id: 1 },
  };
}

function makeForwardOrigin(id, date, originType = 'user') {
  const origins = {
    user: { type: 'user', sender_user: { id: 50, first_name: 'Alice' } },
    channel: {
      type: 'channel',
      chat: { id: -100999, title: 'Ch', username: 'ch' },
      message_id: 42,
    },
    hidden_user: {
      type: 'hidden_user',
      sender_user_name: 'Hidden Person',
    },
  };
  return {
    message_id: id,
    date,
    text: 'Origin forward',
    forward_origin: origins[originType],
    chat: { id: 1 },
  };
}

function makePhoto(id, date) {
  return {
    message_id: id,
    date,
    photo: [{ file_id: 'abc', width: 100, height: 100 }],
    chat: { id: 1 },
  };
}

function makePhotoWithCaption(id, date) {
  return {
    message_id: id,
    date,
    caption: 'Photo caption',
    photo: [{ file_id: 'abc', width: 100, height: 100 }],
    chat: { id: 1 },
  };
}

function makePoll(id, date) {
  return {
    message_id: id,
    date,
    poll: { question: 'Q?', options: [{ text: 'A' }, { text: 'B' }] },
    chat: { id: 1 },
  };
}

function makeLocation(id, date) {
  return {
    message_id: id,
    date,
    location: { latitude: 55.75, longitude: 37.62 },
    chat: { id: 1 },
  };
}

function makeSticker(id, date) {
  return {
    message_id: id,
    date,
    sticker: { emoji: '🎉', set_name: 'party' },
    chat: { id: 1 },
  };
}

function makeVideo(id, date) {
  return {
    message_id: id,
    date,
    video: { file_id: 'vid1', duration: 30 },
    chat: { id: 1 },
  };
}

function makeForwardedPhoto(id, date) {
  return {
    message_id: id,
    date,
    photo: [{ file_id: 'fwd_photo', width: 200, height: 200 }],
    forward_from: { id: 88, first_name: 'PhotoSender' },
    forward_date: date - 50,
    chat: { id: 1 },
  };
}

function makeEmpty(id, date) {
  return { message_id: id, date, chat: { id: 1 } };
}

// ============================================================
// classifyMessage
// ============================================================

describe('classifyMessage', () => {
  describe('returns "note" for user-authored plain text', () => {
    it('simple text message', () => {
      expect(classifyMessage(makeNote(1, 1000))).toBe('note');
    });

    it('text with entities (links, bold)', () => {
      const msg = makeNote(1, 1000, 'Check this out');
      msg.entities = [{ type: 'url', offset: 0, length: 14 }];
      expect(classifyMessage(msg)).toBe('note');
    });
  });

  describe('returns "forward" for forwarded messages', () => {
    it('forward_from (user)', () => {
      expect(classifyMessage(makeForward(1, 1000))).toBe('forward');
    });

    it('forward_from_chat (channel)', () => {
      expect(classifyMessage(makeForwardFromChat(1, 1000))).toBe('forward');
    });

    it('forward_sender_name (hidden user, legacy)', () => {
      const msg = {
        message_id: 1,
        date: 1000,
        text: 'Hidden fwd',
        forward_sender_name: 'John',
      };
      expect(classifyMessage(msg)).toBe('forward');
    });

    it('forward_origin (new API)', () => {
      expect(classifyMessage(makeForwardOrigin(1, 1000, 'user'))).toBe('forward');
      expect(classifyMessage(makeForwardOrigin(1, 1000, 'channel'))).toBe('forward');
      expect(classifyMessage(makeForwardOrigin(1, 1000, 'hidden_user'))).toBe('forward');
    });

    it('forward_date only', () => {
      const msg = { message_id: 1, date: 1000, text: 'fwd', forward_date: 900 };
      expect(classifyMessage(msg)).toBe('forward');
    });

    it('forwarded media-only (photo with forward metadata)', () => {
      expect(classifyMessage(makeForwardedPhoto(1, 1000))).toBe('forward');
    });
  });

  describe('returns "other" for non-note, non-forward messages', () => {
    it('photo without forward metadata', () => {
      expect(classifyMessage(makePhoto(1, 1000))).toBe('other');
    });

    it('photo with caption (non-forwarded)', () => {
      expect(classifyMessage(makePhotoWithCaption(1, 1000))).toBe('other');
    });

    it('video', () => {
      expect(classifyMessage(makeVideo(1, 1000))).toBe('other');
    });

    it('sticker', () => {
      expect(classifyMessage(makeSticker(1, 1000))).toBe('other');
    });

    it('poll', () => {
      expect(classifyMessage(makePoll(1, 1000))).toBe('other');
    });

    it('location', () => {
      expect(classifyMessage(makeLocation(1, 1000))).toBe('other');
    });

    it('empty message (no text, no media)', () => {
      expect(classifyMessage(makeEmpty(1, 1000))).toBe('other');
    });
  });

  describe('edge cases', () => {
    it('null', () => {
      expect(classifyMessage(null)).toBe('other');
    });

    it('undefined', () => {
      expect(classifyMessage(undefined)).toBe('other');
    });

    it('empty object', () => {
      expect(classifyMessage({})).toBe('other');
    });

    it('non-object (string)', () => {
      expect(classifyMessage('hello')).toBe('other');
    });

    it('non-object (number)', () => {
      expect(classifyMessage(42)).toBe('other');
    });

    it('text + media = other (not a plain text note)', () => {
      const msg = { message_id: 1, date: 1000, text: 'Look at this', photo: [{}] };
      expect(classifyMessage(msg)).toBe('other');
    });

    it('forward takes precedence over text-only', () => {
      const msg = { message_id: 1, date: 1000, text: 'Fwd text', forward_from: { id: 1 } };
      expect(classifyMessage(msg)).toBe('forward');
    });
  });
});

// ============================================================
// bundleMessages
// ============================================================

describe('bundleMessages', () => {
  // ----------------------------------------------------------
  // Empty / trivial input
  // ----------------------------------------------------------
  describe('empty and trivial input', () => {
    it('returns empty array for empty input', () => {
      expect(bundleMessages([])).toEqual([]);
    });

    it('returns empty array for null', () => {
      expect(bundleMessages(null)).toEqual([]);
    });

    it('returns empty array for undefined', () => {
      expect(bundleMessages(undefined)).toEqual([]);
    });

    it('returns empty array for non-array', () => {
      expect(bundleMessages('not an array')).toEqual([]);
    });
  });

  // ----------------------------------------------------------
  // Single messages
  // ----------------------------------------------------------
  describe('single message', () => {
    it('single note → one normal bundle with no forwards', () => {
      const msgs = [makeNote(1, 1000)];
      const result = bundleMessages(msgs);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('bundle');
      expect(result[0].note).toBe(msgs[0]);
      expect(result[0].forwards).toEqual([]);
      expect(result[0].status).toBe('normal');
      expect(result[0].startTimestamp).toBe(1000);
      expect(result[0].endTimestamp).toBe(1000);
      expect(result[0].messageIds).toEqual([1]);
    });

    it('single forward → one ambiguous bundle', () => {
      const msgs = [makeForward(1, 1000)];
      const result = bundleMessages(msgs);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('bundle');
      expect(result[0].note).toBeNull();
      expect(result[0].forwards).toHaveLength(1);
      expect(result[0].status).toBe('ambiguous');
    });

    it('single other → one other item', () => {
      const msgs = [makePhoto(1, 1000)];
      const result = bundleMessages(msgs);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('other');
      expect(result[0].message).toBe(msgs[0]);
    });
  });

  // ----------------------------------------------------------
  // Note + Forward bundling (core happy path)
  // ----------------------------------------------------------
  describe('note + forward bundling', () => {
    it('note followed by forward within window → single bundle', () => {
      const note = makeNote(1, 1000);
      const fwd = makeForward(2, 1005);
      const result = bundleMessages([note, fwd]);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('bundle');
      expect(result[0].note).toBe(note);
      expect(result[0].forwards).toEqual([fwd]);
      expect(result[0].status).toBe('normal');
      expect(result[0].messageIds).toEqual([1, 2]);
      expect(result[0].startTimestamp).toBe(1000);
      expect(result[0].endTimestamp).toBe(1005);
    });

    it('note followed by multiple forwards within window → single bundle', () => {
      const note = makeNote(1, 1000);
      const fwd1 = makeForward(2, 1003);
      const fwd2 = makeForward(3, 1007);
      const fwd3 = makeForward(4, 1010);
      const result = bundleMessages([note, fwd1, fwd2, fwd3]);

      expect(result).toHaveLength(1);
      expect(result[0].forwards).toHaveLength(3);
      expect(result[0].messageIds).toEqual([1, 2, 3, 4]);
      expect(result[0].endTimestamp).toBe(1010);
      expect(result[0].status).toBe('normal');
    });

    it('forward exactly at window boundary (10s) is included', () => {
      const note = makeNote(1, 1000);
      const fwd = makeForward(2, 1010); // exactly 10s after
      const result = bundleMessages([note, fwd]);

      expect(result).toHaveLength(1);
      expect(result[0].forwards).toHaveLength(1);
      expect(result[0].status).toBe('normal');
    });

    it('forward 1 second past window (11s) creates ambiguous bundle', () => {
      const note = makeNote(1, 1000);
      const fwd = makeForward(2, 1011); // 11s after
      const result = bundleMessages([note, fwd]);

      expect(result).toHaveLength(2);
      // First: note-only bundle
      expect(result[0].type).toBe('bundle');
      expect(result[0].note).toBe(note);
      expect(result[0].forwards).toEqual([]);
      expect(result[0].status).toBe('normal');
      // Second: ambiguous bundle with the orphan forward
      expect(result[1].type).toBe('bundle');
      expect(result[1].note).toBeNull();
      expect(result[1].forwards).toEqual([fwd]);
      expect(result[1].status).toBe('ambiguous');
    });
  });

  // ----------------------------------------------------------
  // Note-only bundles
  // ----------------------------------------------------------
  describe('note-only bundles', () => {
    it('note with no following forwards is a valid bundle', () => {
      const note = makeNote(1, 1000);
      const result = bundleMessages([note]);

      expect(result).toHaveLength(1);
      expect(result[0].note).toBe(note);
      expect(result[0].forwards).toEqual([]);
      expect(result[0].status).toBe('normal');
    });

    it('note followed by other (no forwards) is a valid note-only bundle', () => {
      const note = makeNote(1, 1000);
      const other = makePhoto(2, 1003);
      const result = bundleMessages([note, other]);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('bundle');
      expect(result[0].forwards).toEqual([]);
      expect(result[0].status).toBe('normal');
      expect(result[1].type).toBe('other');
    });
  });

  // ----------------------------------------------------------
  // Bundle termination
  // ----------------------------------------------------------
  describe('bundle termination', () => {
    it('new note terminates previous bundle normally', () => {
      const note1 = makeNote(1, 1000);
      const fwd = makeForward(2, 1005);
      const note2 = makeNote(3, 1008);

      const result = bundleMessages([note1, fwd, note2]);

      expect(result).toHaveLength(2);
      // First bundle: note1 + fwd
      expect(result[0].note).toBe(note1);
      expect(result[0].forwards).toEqual([fwd]);
      expect(result[0].status).toBe('normal');
      // Second bundle: note2 only
      expect(result[1].note).toBe(note2);
      expect(result[1].forwards).toEqual([]);
      expect(result[1].status).toBe('normal');
    });

    it('other message terminates bundle', () => {
      const note = makeNote(1, 1000);
      const fwd = makeForward(2, 1003);
      const photo = makePhoto(3, 1006);

      const result = bundleMessages([note, fwd, photo]);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('bundle');
      expect(result[0].forwards).toEqual([fwd]);
      expect(result[1].type).toBe('other');
    });

    it('end of input terminates bundle', () => {
      const note = makeNote(1, 1000);
      const fwd = makeForward(2, 1005);
      const result = bundleMessages([note, fwd]);

      expect(result).toHaveLength(1);
      expect(result[0].forwards).toEqual([fwd]);
    });

    it('receiving a new Note never makes previous bundle ambiguous', () => {
      const note1 = makeNote(1, 1000);
      const note2 = makeNote(2, 1002);

      const result = bundleMessages([note1, note2]);

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('normal');
      expect(result[1].status).toBe('normal');
    });
  });

  // ----------------------------------------------------------
  // Ambiguous bundles
  // ----------------------------------------------------------
  describe('ambiguous bundles', () => {
    it('forward with no preceding note → ambiguous', () => {
      const fwd = makeForward(1, 1000);
      const result = bundleMessages([fwd]);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('ambiguous');
      expect(result[0].note).toBeNull();
    });

    it('other then forward → forward is ambiguous', () => {
      const photo = makePhoto(1, 1000);
      const fwd = makeForward(2, 1005);
      const result = bundleMessages([photo, fwd]);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('other');
      expect(result[1].type).toBe('bundle');
      expect(result[1].status).toBe('ambiguous');
    });

    it('multiple orphan forwards group into one ambiguous bundle', () => {
      const fwd1 = makeForward(1, 1000);
      const fwd2 = makeForward(2, 1005);
      const fwd3 = makeForward(3, 1008);
      const result = bundleMessages([fwd1, fwd2, fwd3]);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('ambiguous');
      expect(result[0].note).toBeNull();
      expect(result[0].forwards).toHaveLength(3);
      expect(result[0].messageIds).toEqual([1, 2, 3]);
    });

    it('forward outside window after note → note-only bundle + ambiguous bundle', () => {
      const note = makeNote(1, 1000);
      const fwd = makeForward(2, 1020); // 20s later, way outside window
      const result = bundleMessages([note, fwd]);

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('normal');
      expect(result[0].forwards).toEqual([]);
      expect(result[1].status).toBe('ambiguous');
      expect(result[1].note).toBeNull();
    });
  });

  // ----------------------------------------------------------
  // Timestamp conflict handling
  // ----------------------------------------------------------
  describe('timestamp conflicts', () => {
    it('forward with earlier timestamp than previous message → ambiguous', () => {
      const note = makeNote(1, 1000);
      const fwd = makeForward(2, 999); // timestamp goes backwards
      const result = bundleMessages([note, fwd]);

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('ambiguous');
      expect(result[1].status).toBe('ambiguous');
    });

    it('note with earlier timestamp than previous → ambiguous note bundle', () => {
      const note1 = makeNote(1, 1000);
      const note2 = makeNote(2, 999); // timestamp goes backwards
      const result = bundleMessages([note1, note2]);

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('normal'); // first bundle terminated normally by new Note
      expect(result[1].status).toBe('ambiguous'); // second note has timestamp conflict
    });

    it('identical timestamps do not trigger conflict', () => {
      const note = makeNote(1, 1000);
      const fwd = makeForward(2, 1000); // same timestamp
      const result = bundleMessages([note, fwd]);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('normal');
      expect(result[0].forwards).toHaveLength(1);
    });
  });

  // ----------------------------------------------------------
  // Ordering preservation
  // ----------------------------------------------------------
  describe('ordering', () => {
    it('messages inside a bundle preserve original order', () => {
      const note = makeNote(1, 1000);
      const fwd1 = makeForward(2, 1002);
      const fwd2 = makeForward(3, 1005);
      const fwd3 = makeForward(4, 1008);
      const result = bundleMessages([note, fwd1, fwd2, fwd3]);

      expect(result[0].forwards[0].message_id).toBe(2);
      expect(result[0].forwards[1].message_id).toBe(3);
      expect(result[0].forwards[2].message_id).toBe(4);
    });

    it('bundles preserve stream order', () => {
      const note1 = makeNote(1, 1000);
      const fwd1 = makeForward(2, 1005);
      const note2 = makeNote(3, 1020);
      const fwd2 = makeForward(4, 1025);

      const result = bundleMessages([note1, fwd1, note2, fwd2]);

      expect(result).toHaveLength(2);
      expect(result[0].note.message_id).toBe(1);
      expect(result[1].note.message_id).toBe(3);
    });
  });

  // ----------------------------------------------------------
  // Source handling
  // ----------------------------------------------------------
  describe('source handling', () => {
    it('forwards from different sources belong to same bundle when within window', () => {
      const note = makeNote(1, 1000);
      const fwd1 = makeForward(2, 1003, {
        forward_from: { id: 10, first_name: 'User A' },
      });
      const fwd2 = makeForwardFromChat(3, 1006);
      const fwd3 = makeForwardOrigin(4, 1009, 'hidden_user');

      const result = bundleMessages([note, fwd1, fwd2, fwd3]);

      expect(result).toHaveLength(1);
      expect(result[0].forwards).toHaveLength(3);
      expect(result[0].status).toBe('normal');
    });

    it('forwarded media-only messages are classified as forward', () => {
      const note = makeNote(1, 1000);
      const fwdPhoto = makeForwardedPhoto(2, 1005);
      const result = bundleMessages([note, fwdPhoto]);

      expect(result).toHaveLength(1);
      expect(result[0].forwards).toHaveLength(1);
    });
  });

  // ----------------------------------------------------------
  // Complex scenarios
  // ----------------------------------------------------------
  describe('complex scenarios', () => {
    it('realistic stream: note, forwards, other, note, forward', () => {
      const msgs = [
        makeNote(1, 1000),               // starts bundle 1
        makeForward(2, 1003),             // joins bundle 1
        makeForward(3, 1007),             // joins bundle 1
        makePhoto(4, 1012),               // terminates bundle 1, standalone other
        makeNote(5, 1020),                // starts bundle 2
        makeForward(6, 1025),             // joins bundle 2
      ];

      const result = bundleMessages(msgs);

      expect(result).toHaveLength(3);
      // Bundle 1
      expect(result[0].type).toBe('bundle');
      expect(result[0].note.message_id).toBe(1);
      expect(result[0].forwards).toHaveLength(2);
      expect(result[0].status).toBe('normal');
      // Standalone other
      expect(result[1].type).toBe('other');
      expect(result[1].message.message_id).toBe(4);
      // Bundle 2
      expect(result[2].type).toBe('bundle');
      expect(result[2].note.message_id).toBe(5);
      expect(result[2].forwards).toHaveLength(1);
      expect(result[2].status).toBe('normal');
    });

    it('consecutive notes with no forwards → multiple note-only bundles', () => {
      const msgs = [
        makeNote(1, 1000),
        makeNote(2, 1015),
        makeNote(3, 1030),
      ];

      const result = bundleMessages(msgs);

      expect(result).toHaveLength(3);
      result.forEach((b, i) => {
        expect(b.type).toBe('bundle');
        expect(b.forwards).toEqual([]);
        expect(b.status).toBe('normal');
      });
    });

    it('interleaved: forward, note, forward, other, forward', () => {
      const msgs = [
        makeForward(1, 1000),   // orphan → ambiguous
        makeNote(2, 1010),      // starts bundle
        makeForward(3, 1015),   // joins bundle
        makePhoto(4, 1020),     // terminates bundle, standalone other
        makeForward(5, 1025),   // orphan → ambiguous
      ];

      const result = bundleMessages(msgs);

      expect(result).toHaveLength(4);
      expect(result[0].type).toBe('bundle');
      expect(result[0].status).toBe('ambiguous');
      expect(result[1].type).toBe('bundle');
      expect(result[1].status).toBe('normal');
      expect(result[1].forwards).toHaveLength(1);
      expect(result[2].type).toBe('other');
      expect(result[3].type).toBe('bundle');
      expect(result[3].status).toBe('ambiguous');
    });

    it('note + forward at boundary + forward past boundary', () => {
      const msgs = [
        makeNote(1, 1000),
        makeForward(2, 1010),   // exactly at 10s → in bundle
        makeForward(3, 1011),   // 11s → outside window
      ];

      const result = bundleMessages(msgs);

      expect(result).toHaveLength(2);
      expect(result[0].forwards).toHaveLength(1);
      expect(result[0].forwards[0].message_id).toBe(2);
      expect(result[0].status).toBe('normal');
      expect(result[1].note).toBeNull();
      expect(result[1].forwards[0].message_id).toBe(3);
      expect(result[1].status).toBe('ambiguous');
    });

    it('many others interspersed produce individual other items', () => {
      const msgs = [
        makePhoto(1, 1000),
        makePoll(2, 1005),
        makeLocation(3, 1010),
        makeSticker(4, 1015),
      ];

      const result = bundleMessages(msgs);

      expect(result).toHaveLength(4);
      result.forEach(item => {
        expect(item.type).toBe('other');
      });
    });
  });

  // ----------------------------------------------------------
  // Output contract
  // ----------------------------------------------------------
  describe('output contract', () => {
    it('bundle exposes all required fields', () => {
      const note = makeNote(1, 1000, 'My annotation');
      const fwd = makeForward(2, 1005);
      const result = bundleMessages([note, fwd]);
      const bundle = result[0];

      // Note text (via note reference)
      expect(bundle.note.text).toBe('My annotation');
      // List of forwarded messages
      expect(Array.isArray(bundle.forwards)).toBe(true);
      expect(bundle.forwards).toHaveLength(1);
      // Bundle start and end timestamps
      expect(typeof bundle.startTimestamp).toBe('number');
      expect(typeof bundle.endTimestamp).toBe('number');
      expect(bundle.startTimestamp).toBeLessThanOrEqual(bundle.endTimestamp);
      // Message IDs
      expect(Array.isArray(bundle.messageIds)).toBe(true);
      expect(bundle.messageIds).toEqual([1, 2]);
      // Status
      expect(['normal', 'ambiguous']).toContain(bundle.status);
    });

    it('note-only bundle has empty forwards array', () => {
      const result = bundleMessages([makeNote(1, 1000)]);
      expect(result[0].forwards).toEqual([]);
    });

    it('ambiguous bundle has null note', () => {
      const result = bundleMessages([makeForward(1, 1000)]);
      expect(result[0].note).toBeNull();
    });
  });

  // ----------------------------------------------------------
  // BUNDLE_WINDOW_SECONDS constant
  // ----------------------------------------------------------
  describe('BUNDLE_WINDOW_SECONDS', () => {
    it('is 10 seconds as specified', () => {
      expect(BUNDLE_WINDOW_SECONDS).toBe(10);
    });
  });
});
