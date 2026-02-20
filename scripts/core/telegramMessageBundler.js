const DEFAULT_BUNDLE_WINDOW_MS = 10 * 1000;

function buildMessageBundles(
  entries,
  { bundleWindowMs = DEFAULT_BUNDLE_WINDOW_MS, nowMs = () => Date.now() } = {},
) {
  const normalizedEntries = Array.isArray(entries) ? entries : [];
  const bundles = [];
  let activeBundle = null;
  let previousTimestampMs = null;
  let previousSequence = null;

  normalizedEntries.forEach((entry) => {
    if (!isEntry(entry)) {
      if (activeBundle) {
        bundles.push(finalizeBundle(activeBundle, 'ambiguous', null, bundleWindowMs, nowMs));
        activeBundle = null;
      }
      bundles.push(createAmbiguousBundle({}, 'invalid_entry', nowMs));
      return;
    }

    const entryType = normalizeEntryType(entry.type);
    const entryTimestampMs = toTimestampMs(entry.timestampMs);
    const entrySequence = toSequence(entry.sequence);
    const hasTimestamp = entryTimestampMs !== null;

    if (
      entryType !== 'note' &&
      hasTimestamp &&
      hasOrderingConflict({
        previousTimestampMs,
        previousSequence,
        nextTimestampMs: entryTimestampMs,
        nextSequence: entrySequence,
      })
    ) {
      if (activeBundle) {
        bundles.push(finalizeBundle(activeBundle, 'ambiguous', entryTimestampMs, bundleWindowMs, nowMs));
        activeBundle = null;
      }
      bundles.push(createAmbiguousBundle(entry, 'timestamp_conflict', nowMs));
      return;
    }

    if (entryType === 'ambiguous' || (entryType !== 'note' && !hasTimestamp)) {
      if (activeBundle) {
        bundles.push(finalizeBundle(activeBundle, 'ambiguous', entryTimestampMs, bundleWindowMs, nowMs));
        activeBundle = null;
      }
      bundles.push(createAmbiguousBundle(entry, entryType === 'ambiguous' ? 'ambiguous_classification' : 'missing_timestamp', nowMs));
      return;
    }

    if (entryType === 'note') {
      if (activeBundle) {
        bundles.push(finalizeBundle(activeBundle, 'note', entryTimestampMs, bundleWindowMs, nowMs));
      }
      activeBundle = createNoteBundle(entry, entryTimestampMs, nowMs);
      ({
        nextTimestampMs: previousTimestampMs,
        nextSequence: previousSequence,
      } = updatePreviousOrdering({
        previousTimestampMs,
        previousSequence,
        nextTimestampMs: entryTimestampMs,
        nextSequence: entrySequence,
      }));
      return;
    }

    if (entryType === 'forward') {
      const forwardTimestampMs = entryTimestampMs;

      if (activeBundle && isWithinWindow(activeBundle.noteTimestampMs, forwardTimestampMs, bundleWindowMs)) {
        appendForwardToBundle(activeBundle, entry, forwardTimestampMs);
        ({
          nextTimestampMs: previousTimestampMs,
          nextSequence: previousSequence,
        } = updatePreviousOrdering({
          previousTimestampMs,
          previousSequence,
          nextTimestampMs: forwardTimestampMs,
          nextSequence: entrySequence,
        }));
        return;
      }

      if (activeBundle) {
        bundles.push(finalizeBundle(activeBundle, 'timeout', forwardTimestampMs, bundleWindowMs, nowMs));
        activeBundle = null;
      }

      bundles.push(createAmbiguousBundle(entry, 'orphan_forward', nowMs));
      ({
        nextTimestampMs: previousTimestampMs,
        nextSequence: previousSequence,
      } = updatePreviousOrdering({
        previousTimestampMs,
        previousSequence,
        nextTimestampMs: forwardTimestampMs,
        nextSequence: entrySequence,
      }));
      return;
    }

    if (entryType === 'other') {
      if (activeBundle) {
        bundles.push(finalizeBundle(activeBundle, 'other', entryTimestampMs, bundleWindowMs, nowMs));
        activeBundle = null;
      }
      ({
        nextTimestampMs: previousTimestampMs,
        nextSequence: previousSequence,
      } = updatePreviousOrdering({
        previousTimestampMs,
        previousSequence,
        nextTimestampMs: entryTimestampMs,
        nextSequence: entrySequence,
      }));
    }
  });

  if (activeBundle) {
    bundles.push(finalizeBundle(activeBundle, 'end_of_stream', null, bundleWindowMs, nowMs));
  }

  return bundles;
}

function appendForwardToBundle(bundle, entry, timestampMs) {
  const forwardMetadata = entry.forwardMetadata && typeof entry.forwardMetadata === 'object'
    ? entry.forwardMetadata
    : {};
  const sourceInfo = typeof forwardMetadata.sourceInfo === 'string' && forwardMetadata.sourceInfo.trim() !== ''
    ? forwardMetadata.sourceInfo
    : 'Unknown';
  const sourceUrl = typeof forwardMetadata.sourceUrl === 'string' ? forwardMetadata.sourceUrl : '';
  const forwardProtected = Boolean(forwardMetadata.forwardProtected);
  const forwardDate = typeof forwardMetadata.forwardDate === 'string' ? forwardMetadata.forwardDate : '';
  const hasMedia = Boolean(forwardMetadata.hasMedia);
  const mediaType = typeof forwardMetadata.mediaType === 'string' ? forwardMetadata.mediaType : 'none';
  const messageId = entry.messageId;
  const forwardTimestamp = new Date(timestampMs).toISOString();

  bundle.messageIds.push(messageId);
  bundle.forwardedMessages.push({
    message_id: messageId,
    timestamp: forwardTimestamp,
    content: typeof entry.content === 'string' ? entry.content : '',
    source_info: sourceInfo,
    source_url: sourceUrl,
    forward_date: forwardDate,
    has_media: hasMedia,
    media_type: mediaType,
    forward_protected: forwardProtected,
  });
  bundle.sourceMetadata.push({
    message_id: messageId,
    message_type: 'forward',
    source_info: sourceInfo,
    source_url: sourceUrl,
    forward_protected: forwardProtected,
  });
  bundle.lastMessageTimestampMs = timestampMs;
}

function createAmbiguousBundle(entry, reason, nowMs) {
  const entryType = normalizeEntryType(entry.type);
  const safeTimestampMs = toTimestampMs(entry.timestampMs) ?? nowMs();
  const safeMessageId = entry.messageId !== undefined ? entry.messageId : null;
  const noteText = entryType === 'note' && typeof entry.noteText === 'string' ? entry.noteText : '';
  const messageIds = safeMessageId !== null ? [safeMessageId] : [];
  const sourceMetadata = [];
  const forwardedMessages = [];

  if (entryType === 'note' && safeMessageId !== null) {
    sourceMetadata.push({
      message_id: safeMessageId,
      message_type: 'note',
      source_info: 'direct_message',
      source_url: '',
      forward_protected: false,
    });
  }

  if (entryType === 'forward' && safeMessageId !== null) {
    const forwardMetadata = entry.forwardMetadata && typeof entry.forwardMetadata === 'object'
      ? entry.forwardMetadata
      : {};
    const sourceInfo = typeof forwardMetadata.sourceInfo === 'string' && forwardMetadata.sourceInfo.trim() !== ''
      ? forwardMetadata.sourceInfo
      : 'Unknown';
    const sourceUrl = typeof forwardMetadata.sourceUrl === 'string' ? forwardMetadata.sourceUrl : '';
    const forwardProtected = Boolean(forwardMetadata.forwardProtected);
    const forwardDate = typeof forwardMetadata.forwardDate === 'string' ? forwardMetadata.forwardDate : '';
    const hasMedia = Boolean(forwardMetadata.hasMedia);
    const mediaType = typeof forwardMetadata.mediaType === 'string' ? forwardMetadata.mediaType : 'none';
    const isoTimestamp = new Date(safeTimestampMs).toISOString();

    forwardedMessages.push({
      message_id: safeMessageId,
      timestamp: isoTimestamp,
      content: typeof entry.content === 'string' ? entry.content : '',
      source_info: sourceInfo,
      source_url: sourceUrl,
      forward_date: forwardDate,
      has_media: hasMedia,
      media_type: mediaType,
      forward_protected: forwardProtected,
    });
    sourceMetadata.push({
      message_id: safeMessageId,
      message_type: 'forward',
      source_info: sourceInfo,
      source_url: sourceUrl,
      forward_protected: forwardProtected,
    });
  }

  return {
    note_text: noteText,
    forwarded_messages: forwardedMessages,
    bundle_start_at: new Date(safeTimestampMs).toISOString(),
    bundle_end_at: new Date(safeTimestampMs).toISOString(),
    message_ids: messageIds,
    source_metadata: sourceMetadata,
    status: 'ambiguous',
    ambiguity_reason: reason,
  };
}

function createNoteBundle(entry, timestampMs, nowMs) {
  const noteTimestampMs = timestampMs ?? nowMs();
  const noteMessageId = entry.messageId;
  const noteText = typeof entry.noteText === 'string' ? entry.noteText : '';

  return {
    messageIds: [noteMessageId],
    noteMessageId,
    noteText,
    noteTimestampMs,
    sourceMetadata: [
      {
        message_id: noteMessageId,
        message_type: 'note',
        source_info: 'direct_message',
        source_url: '',
        forward_protected: false,
      },
    ],
    status: 'normal',
    forwardedMessages: [],
    lastMessageTimestampMs: noteTimestampMs,
  };
}

function finalizeBundle(bundle, reason, triggerTimestampMs, bundleWindowMs, nowMs) {
  const safeReason = typeof reason === 'string' ? reason : 'end_of_stream';
  const endTimestampMs = resolveEndTimestamp(bundle, safeReason, triggerTimestampMs, bundleWindowMs, nowMs);

  return {
    note_text: bundle.noteText,
    forwarded_messages: bundle.forwardedMessages,
    bundle_start_at: new Date(bundle.noteTimestampMs).toISOString(),
    bundle_end_at: new Date(endTimestampMs).toISOString(),
    message_ids: bundle.messageIds,
    source_metadata: bundle.sourceMetadata,
    status: safeReason === 'ambiguous' ? 'ambiguous' : bundle.status,
    ambiguity_reason: safeReason === 'ambiguous' ? 'sequencing_conflict' : undefined,
  };
}

function resolveEndTimestamp(bundle, reason, triggerTimestampMs, bundleWindowMs, nowMs) {
  if (reason === 'timeout') {
    return bundle.noteTimestampMs + bundleWindowMs;
  }

  if (toTimestampMs(triggerTimestampMs) !== null) {
    return triggerTimestampMs;
  }

  if (reason === 'end_of_stream' || reason === 'ambiguous') {
    return toTimestampMs(bundle.lastMessageTimestampMs) ?? nowMs();
  }

  return toTimestampMs(bundle.lastMessageTimestampMs) ?? nowMs();
}

function isEntry(entry) {
  return entry && typeof entry === 'object' && entry.messageId !== undefined;
}

function isWithinWindow(noteTimestampMs, messageTimestampMs, bundleWindowMs) {
  return messageTimestampMs >= noteTimestampMs && messageTimestampMs <= noteTimestampMs + bundleWindowMs;
}

function normalizeEntryType(type) {
  if (type === 'note' || type === 'forward' || type === 'other' || type === 'ambiguous') {
    return type;
  }

  return 'ambiguous';
}

function toTimestampMs(value) {
  return Number.isFinite(value) ? value : null;
}

function toSequence(value) {
  return Number.isFinite(value) ? value : null;
}

function hasOrderingConflict({
  previousTimestampMs,
  previousSequence,
  nextTimestampMs,
  nextSequence,
}) {
  if (toTimestampMs(previousTimestampMs) === null || toTimestampMs(nextTimestampMs) === null) {
    return false;
  }

  if (nextTimestampMs < previousTimestampMs) {
    return true;
  }

  if (nextTimestampMs > previousTimestampMs) {
    return false;
  }

  if (toSequence(previousSequence) === null || toSequence(nextSequence) === null) {
    return false;
  }

  return nextSequence <= previousSequence;
}

function updatePreviousOrdering({
  previousTimestampMs,
  previousSequence,
  nextTimestampMs,
  nextSequence,
}) {
  if (toTimestampMs(nextTimestampMs) === null) {
    return {
      nextTimestampMs: previousTimestampMs,
      nextSequence: previousSequence,
    };
  }

  if (toTimestampMs(previousTimestampMs) === null) {
    return {
      nextTimestampMs,
      nextSequence,
    };
  }

  if (nextTimestampMs > previousTimestampMs) {
    return {
      nextTimestampMs,
      nextSequence,
    };
  }

  if (nextTimestampMs < previousTimestampMs) {
    return {
      nextTimestampMs: previousTimestampMs,
      nextSequence: previousSequence,
    };
  }

  if (toSequence(previousSequence) === null || toSequence(nextSequence) === null) {
    return {
      nextTimestampMs: previousTimestampMs,
      nextSequence: previousSequence,
    };
  }

  if (nextSequence > previousSequence) {
    return {
      nextTimestampMs,
      nextSequence,
    };
  }

  return {
    nextTimestampMs: previousTimestampMs,
    nextSequence: previousSequence,
  };
}

module.exports = {
  DEFAULT_BUNDLE_WINDOW_MS,
  buildMessageBundles,
};
