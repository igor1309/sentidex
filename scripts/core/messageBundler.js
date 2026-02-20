// Message bundling logic for Telegram message processing.
// Groups user-written notes with immediately following forwarded messages
// into a single logical record ("bundle").

const BUNDLE_WINDOW_SECONDS = 10;

/**
 * Classify a Telegram message as 'note', 'forward', or 'other'.
 *
 * - Note:    user-authored plain text message with no forward metadata
 * - Forward: any message containing forward metadata (including media-only)
 * - Other:   everything else (non-forwarded media, system messages, polls, etc.)
 */
function classifyMessage(message) {
  if (!message || typeof message !== 'object') {
    return 'other';
  }

  // Forward: has any forward metadata
  if (isForwarded(message)) {
    return 'forward';
  }

  // Note: plain text, no forward metadata, no media
  if (message.text && !hasMedia(message)) {
    return 'note';
  }

  // Other: non-forwarded media, system messages, polls, contacts, etc.
  return 'other';
}

function isForwarded(message) {
  return !!(
    message.forward_from ||
    message.forward_from_chat ||
    message.forward_sender_name ||
    message.forward_origin ||
    message.forward_date
  );
}

function hasMedia(message) {
  return !!(
    message.photo ||
    message.video ||
    message.document ||
    message.audio ||
    message.voice ||
    message.sticker ||
    message.animation ||
    message.video_note
  );
}

/**
 * Get the Unix timestamp (seconds) from a Telegram message.
 */
function getMessageTimestamp(message) {
  return message.date || 0;
}

/**
 * Check if a message falls within the bundle window of the note.
 */
function isWithinWindow(noteMessage, candidateMessage) {
  const noteTime = getMessageTimestamp(noteMessage);
  const candidateTime = getMessageTimestamp(candidateMessage);
  return (candidateTime - noteTime) <= BUNDLE_WINDOW_SECONDS;
}

/**
 * Create a new bundle starting with a note message.
 */
function createBundle(noteMessage) {
  const timestamp = getMessageTimestamp(noteMessage);
  return {
    type: 'bundle',
    note: noteMessage,
    forwards: [],
    startTimestamp: timestamp,
    endTimestamp: timestamp,
    messageIds: [noteMessage.message_id],
    status: 'normal',
  };
}

/**
 * Create an ambiguous bundle (forward with no active note bundle).
 */
function createAmbiguousBundle(forwardMessage) {
  const timestamp = getMessageTimestamp(forwardMessage);
  return {
    type: 'bundle',
    note: null,
    forwards: [forwardMessage],
    startTimestamp: timestamp,
    endTimestamp: timestamp,
    messageIds: [forwardMessage.message_id],
    status: 'ambiguous',
  };
}

/**
 * Bundle an array of Telegram messages into logical groups.
 *
 * Returns an array of items, each being either:
 * - A bundle: { type: 'bundle', note, forwards, startTimestamp, endTimestamp, messageIds, status }
 * - A standalone other: { type: 'other', message }
 *
 * Messages must be in chronological order (by Telegram update position).
 *
 * Bundle rules (from spec):
 * - A Note starts a new bundle
 * - Forwards within 10 seconds of the Note belong to the bundle
 * - A bundle is closed by: timeout, another Note, an Other message, or end of input
 * - A Forward with no active bundle creates an ambiguous bundle
 * - Timestamp ordering conflicts mark affected bundles as ambiguous
 */
function bundleMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return [];
  }

  const results = [];
  let currentBundle = null;
  let prevTimestamp = -1;

  for (const message of messages) {
    const type = classifyMessage(message);
    const msgTimestamp = getMessageTimestamp(message);
    const hasTimestampConflict = prevTimestamp > 0 && msgTimestamp < prevTimestamp;

    if (type === 'note') {
      // A new Note always terminates the current bundle normally
      if (currentBundle) {
        results.push(currentBundle);
      }
      currentBundle = createBundle(message);
      // Timestamp conflict on a Note: mark it ambiguous
      if (hasTimestampConflict) {
        currentBundle.status = 'ambiguous';
      }

    } else if (type === 'forward') {
      if (hasTimestampConflict && currentBundle) {
        // Timestamp ordering conflict — mark current bundle ambiguous, start new ambiguous
        currentBundle.status = 'ambiguous';
        results.push(currentBundle);
        currentBundle = createAmbiguousBundle(message);
      } else if (currentBundle && currentBundle.note && isWithinWindow(currentBundle.note, message)) {
        // Within the active window of a normal bundle — add to it
        currentBundle.forwards.push(message);
        currentBundle.endTimestamp = msgTimestamp;
        currentBundle.messageIds.push(message.message_id);
      } else if (currentBundle && !currentBundle.note) {
        // Active ambiguous bundle (no note) — add forward to it
        currentBundle.forwards.push(message);
        currentBundle.endTimestamp = msgTimestamp;
        currentBundle.messageIds.push(message.message_id);
      } else {
        // No active bundle, or forward outside window
        if (currentBundle) {
          results.push(currentBundle);
        }
        currentBundle = createAmbiguousBundle(message);
      }

    } else {
      // 'other' — terminates any active bundle
      if (currentBundle) {
        results.push(currentBundle);
        currentBundle = null;
      }
      results.push({ type: 'other', message });
    }

    prevTimestamp = msgTimestamp;
  }

  // End of input — close any active bundle
  if (currentBundle) {
    results.push(currentBundle);
  }

  return results;
}

// ============================================================
// File-based bundling (works on parsed _inbox/ markdown files)
// ============================================================

/**
 * Classify a parsed _inbox/ file based on its front matter.
 *
 * - Forward: has a non-empty forward_date
 * - Note:    source_info is "direct_message" and has_media is false
 * - Other:   everything else
 */
function classifyFile(frontMatter) {
  if (!frontMatter || typeof frontMatter !== 'object') {
    return 'other';
  }

  if (frontMatter.forward_date && frontMatter.forward_date !== '') {
    return 'forward';
  }

  if (frontMatter.source_info === 'direct_message' && !frontMatter.has_media) {
    return 'note';
  }

  return 'other';
}

/**
 * Extract a Unix timestamp (seconds) from a file's front matter timestamp field.
 */
function getFileTimestamp(frontMatter) {
  if (!frontMatter || !frontMatter.timestamp) return 0;
  const date = new Date(frontMatter.timestamp);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.floor(date.getTime() / 1000);
}

/**
 * Bundle parsed _inbox/ files into logical groups.
 *
 * Each element of parsedFiles must have: { filename, path, frontMatter, bodyContent }
 *
 * Returns an array of items:
 * - { type: 'bundle', note, forwards, startTimestamp, endTimestamp, status }
 *   where note/forwards are the parsed file objects (or null for ambiguous bundles)
 * - { type: 'other', file }
 *
 * Files are sorted by timestamp before bundling.
 */
function bundleFiles(parsedFiles) {
  if (!Array.isArray(parsedFiles) || parsedFiles.length === 0) {
    return [];
  }

  const sorted = [...parsedFiles].sort(
    (a, b) => getFileTimestamp(a.frontMatter) - getFileTimestamp(b.frontMatter)
  );

  const results = [];
  let currentBundle = null;
  let prevTimestamp = -1;

  for (const file of sorted) {
    const type = classifyFile(file.frontMatter);
    const timestamp = getFileTimestamp(file.frontMatter);
    const hasTimestampConflict = prevTimestamp > 0 && timestamp < prevTimestamp;

    if (type === 'note') {
      if (currentBundle) {
        results.push(currentBundle);
      }
      currentBundle = {
        type: 'bundle',
        note: file,
        forwards: [],
        startTimestamp: timestamp,
        endTimestamp: timestamp,
        status: hasTimestampConflict ? 'ambiguous' : 'normal',
      };

    } else if (type === 'forward') {
      if (hasTimestampConflict && currentBundle) {
        currentBundle.status = 'ambiguous';
        results.push(currentBundle);
        currentBundle = {
          type: 'bundle',
          note: null,
          forwards: [file],
          startTimestamp: timestamp,
          endTimestamp: timestamp,
          status: 'ambiguous',
        };
      } else if (
        currentBundle && currentBundle.note &&
        (timestamp - getFileTimestamp(currentBundle.note.frontMatter)) <= BUNDLE_WINDOW_SECONDS
      ) {
        currentBundle.forwards.push(file);
        currentBundle.endTimestamp = timestamp;
      } else if (currentBundle && !currentBundle.note) {
        currentBundle.forwards.push(file);
        currentBundle.endTimestamp = timestamp;
      } else {
        if (currentBundle) {
          results.push(currentBundle);
        }
        currentBundle = {
          type: 'bundle',
          note: null,
          forwards: [file],
          startTimestamp: timestamp,
          endTimestamp: timestamp,
          status: 'ambiguous',
        };
      }

    } else {
      if (currentBundle) {
        results.push(currentBundle);
        currentBundle = null;
      }
      results.push({ type: 'other', file });
    }

    prevTimestamp = timestamp;
  }

  if (currentBundle) {
    results.push(currentBundle);
  }

  return results;
}

module.exports = {
  classifyMessage,
  bundleMessages,
  classifyFile,
  bundleFiles,
  BUNDLE_WINDOW_SECONDS,
};
