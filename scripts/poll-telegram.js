const fs = require("fs");
const path = require("path");
const frontMatterCodec = require("./adapters/frontMatterCodec");
const formatTimestamp = require("./adapters/formatTimestamp");
const { buildMessageBundles } = require("./core/telegramMessageBundler");

async function pollTelegram() {
  console.log("Starting Telegram polling...");

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getUpdates`,
      {
        method: "GET",
      },
    );

    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.status}`);
    }

    const data = await response.json();

    if (process.env.DEBUG === "true") {
      console.log("Telegram response:", JSON.stringify(data, null, 2));
    }

    if (!data.ok) {
      throw new Error(`Telegram API returned error: ${data.description}`);
    }

    const updates = data.result || [];
    console.log(`Found ${updates.length} updates`);

    let processedCount = 0;
    let skippedCount = 0;
    let highestUpdateId = 0;
    const bundleEntries = [];

    for (const update of updates) {
      // Track highest update ID for proper offset handling
      highestUpdateId = Math.max(highestUpdateId, update.update_id || 0);

      const message = extractMessageFromUpdate(update);
      if (!message) {
        continue;
      }

      if (!matchesTargetChat(message.chat)) {
        if (process.env.DEBUG === "true") {
          console.log(
            `Skipping update ${update.update_id} - chat "${formatChatIdentifier(message.chat)}" does not match target "${process.env.CHAT_ID}"`,
          );
        }
        continue;
      }

      console.log(`Processing message ID: ${message.message_id}`);

      // Skip non-first items in media groups (they have no caption)
      if (isMediaGroupFollower(message)) {
        console.log(`Skipping message ${message.message_id} - media group follower (no caption)`);
        skippedCount++;
        continue;
      }

      bundleEntries.push(toBundleEntry(message, update.update_id, bundleEntries.length));
    }

    const bundles = buildMessageBundles(bundleEntries);
    const bundledMessageIds = collectBundledMessageIds(bundles);

    for (const bundle of bundles) {
      writeBundleToInbox(bundle);
      processedCount++;
    }

    skippedCount += bundleEntries.filter((entry) => !bundledMessageIds.has(entry.messageId)).length;

    if (process.env.DEBUG === "true") {
      console.log(`Created ${bundles.length} message bundles`);
    }

    // Mark all messages as processed at once
    if (highestUpdateId > 0) {
      await markAsProcessed(highestUpdateId + 1);
    }

    console.log(
      `Processed ${processedCount} bundles, skipped ${skippedCount} messages`,
    );
  } catch (error) {
    console.error("Error polling Telegram:", error);
    process.exit(1);
  }
}

// Skip non-first items in media groups (only the first has caption)
function isMediaGroupFollower(message) {
  return message.media_group_id && !message.caption && !message.text;
}

// Enhanced forward detection - catches all forward types including new API structures
function isForwardedMessage(message) {
  return !!(
    message.forward_from ||
    message.forward_from_chat ||
    message.forward_sender_name ||
    message.forward_origin ||
    message.forward_date
  );
}

function toBundleEntry(message, updateId, fallbackIndex) {
  const type = classifyMessage(message);
  const timestampMs = extractMessageTimestampMs(message);
  const messageId = message && message.message_id !== undefined ? message.message_id : null;
  const sequence = normalizeEntrySequence(updateId, fallbackIndex);

  if (type === "forward") {
    return {
      type,
      timestampMs,
      messageId,
      sequence,
      content: extractMessageContent(message),
      forwardMetadata: {
        ...extractForwardSourceMetadata(message),
        forwardDate: message.forward_date ? new Date(message.forward_date * 1000).toISOString() : "",
        hasMedia: hasMedia(message),
        mediaType: getMediaType(message),
      },
    };
  }

  if (type === "note") {
    return {
      type,
      timestampMs,
      messageId,
      sequence,
      noteText: extractMessageContent(message),
    };
  }

  return {
    type,
    timestampMs,
    messageId,
    sequence,
  };
}

function normalizeEntrySequence(updateId, fallbackIndex) {
  const primarySequence = Number(updateId);
  if (Number.isFinite(primarySequence)) {
    return primarySequence;
  }

  return Number.isFinite(fallbackIndex) ? fallbackIndex : 0;
}

function classifyMessage(message) {
  if (!message || typeof message !== "object" || message.message_id === undefined) {
    return "ambiguous";
  }

  if (isForwardedMessage(message)) {
    return "forward";
  }

  if (isNoteMessage(message)) {
    return "note";
  }

  return "other";
}

function isNoteMessage(message) {
  if (!message || typeof message.text !== "string" || message.text.trim() === "") {
    return false;
  }

  if (!message.from || typeof message.from !== "object") {
    return false;
  }

  if (message.caption) {
    return false;
  }

  if (message.from.is_bot === true) {
    return false;
  }

  if (message.sender_chat) {
    return false;
  }

  if (message.chat && message.chat.type === "channel") {
    return false;
  }

  if (isServiceMessage(message) || hasNonTextPayload(message)) {
    return false;
  }

  return true;
}

function hasNonTextPayload(message) {
  return !!(
    message.photo ||
    message.video ||
    message.document ||
    message.audio ||
    message.voice ||
    message.sticker ||
    message.animation ||
    message.video_note ||
    message.contact ||
    message.location ||
    message.venue ||
    message.poll ||
    message.dice ||
    message.game
  );
}

function isServiceMessage(message) {
  return !!(
    message.new_chat_members ||
    message.left_chat_member ||
    message.new_chat_title ||
    message.new_chat_photo ||
    message.delete_chat_photo ||
    message.group_chat_created ||
    message.supergroup_chat_created ||
    message.channel_chat_created ||
    message.message_auto_delete_timer_changed ||
    message.migrate_to_chat_id ||
    message.migrate_from_chat_id ||
    message.pinned_message ||
    message.invoice ||
    message.successful_payment ||
    message.user_shared ||
    message.chat_shared ||
    message.forum_topic_created ||
    message.forum_topic_closed ||
    message.forum_topic_reopened ||
    message.giveaway ||
    message.giveaway_created ||
    message.giveaway_completed
  );
}

function extractMessageTimestampMs(message) {
  const unixSeconds = Number(message && message.date);
  return Number.isFinite(unixSeconds) ? unixSeconds * 1000 : null;
}

function extractForwardSourceMetadata(message) {
  let sourceInfo = "Unknown";
  let sourceUrl = "";
  let forwardProtected = false;

  if (message.forward_origin) {
    switch (message.forward_origin.type) {
      case "user":
        const user = message.forward_origin.sender_user;
        sourceInfo = user.username
          ? `@${user.username}`
          : `${user.first_name || "Unknown"} ${user.last_name || ""}`.trim();
        break;
      case "chat":
        sourceInfo =
          message.forward_origin.sender_chat.title ||
          message.forward_origin.sender_chat.username ||
          "Unknown Chat";
        break;
      case "channel":
        const chat = message.forward_origin.chat;
        sourceInfo = chat.title || `@${chat.username}` || "Unknown Channel";
        if (chat.username && message.forward_origin.message_id) {
          sourceUrl = `https://t.me/${chat.username}/${message.forward_origin.message_id}`;
        }
        break;
      case "hidden_user":
        sourceInfo = message.forward_origin.sender_user_name || "Hidden User";
        forwardProtected = true;
        break;
    }
  } else if (message.forward_from) {
    const user = message.forward_from;
    sourceInfo = user.username
      ? `@${user.username}`
      : `${user.first_name || "Unknown"} ${user.last_name || ""}`.trim();
  } else if (message.forward_from_chat) {
    const chat = message.forward_from_chat;
    sourceInfo = chat.title || `@${chat.username}` || "Unknown Chat";
    if (chat.username && message.forward_from_message_id) {
      sourceUrl = `https://t.me/${chat.username}/${message.forward_from_message_id}`;
    }
  } else if (message.forward_sender_name) {
    sourceInfo = message.forward_sender_name;
    forwardProtected = true;
  }

  return {
    sourceInfo,
    sourceUrl,
    forwardProtected,
  };
}

function writeBundleToInbox(bundle) {
  if (!fs.existsSync("_inbox")) {
    fs.mkdirSync("_inbox", { recursive: true });
  }

  const bundleStartAt = toIsoString(bundle.bundle_start_at);
  const primaryMessageId = Array.isArray(bundle.message_ids) && bundle.message_ids.length > 0
    ? bundle.message_ids[0]
    : Date.now().toString(36);
  const bundleTypeSuffix = bundle.status === "ambiguous" ? "ambiguous" : "bundle";
  const filename = `${formatTimestamp(bundleStartAt)}-${primaryMessageId}-${bundleTypeSuffix}.md`;
  const filepath = path.join("_inbox", filename);
  const forwardedMessages = Array.isArray(bundle.forwarded_messages) ? bundle.forwarded_messages : [];
  const sourceMetadata = Array.isArray(bundle.source_metadata) ? bundle.source_metadata : [];
  const sourceUrls = extractBundleSourceUrls(bundle);
  const debugMetadata = createBundleDebugMetadata({
    bundle,
    bundleStartAt,
    forwardedMessages,
    sourceMetadata,
  });

  const frontMatter = {
    raw_message: true,
    timestamp: bundleStartAt,
    message_ids: Array.isArray(bundle.message_ids) ? bundle.message_ids : [],
    note_text: typeof bundle.note_text === "string" ? bundle.note_text : "",
    source_info: resolveBundleSourceInfo(forwardedMessages),
    has_media: forwardedMessages.some((message) => Boolean(message.has_media)),
    media_type: resolveBundleMediaType(forwardedMessages),
    forward_protected: sourceMetadata.some((metadata) => Boolean(metadata.forward_protected)),
    debug: debugMetadata,
  };

  if (sourceUrls.length > 0) {
    frontMatter.source_url = sourceUrls[0];
    frontMatter.source_urls = sourceUrls;
  }

  const content = frontMatterCodec.stringify({
    frontMatter,
    bodyContent: createBundleBody(bundle),
  });

  fs.writeFileSync(filepath, content, "utf8");
  console.log(`Created bundle file: ${filepath}`);
}

function extractBundleSourceUrls(bundle) {
  const urls = [];
  const forwardedMessages = Array.isArray(bundle.forwarded_messages) ? bundle.forwarded_messages : [];
  const sourceMetadata = Array.isArray(bundle.source_metadata) ? bundle.source_metadata : [];

  addSourceUrls(urls, forwardedMessages);
  addSourceUrls(urls, sourceMetadata);

  return Array.from(new Set(urls));
}

function addSourceUrls(target, entries) {
  entries.forEach((entry) => {
    if (!entry || typeof entry !== "object") {
      return;
    }

    const sourceUrl = typeof entry.source_url === "string" ? entry.source_url.trim() : "";
    if (sourceUrl === "") {
      return;
    }

    target.push(sourceUrl);
  });
}

function createBundleDebugMetadata({
  bundle,
  bundleStartAt,
  forwardedMessages,
  sourceMetadata,
}) {
  const debugMetadata = {
    bundle_start_at: bundleStartAt,
    bundle_end_at: toIsoString(bundle.bundle_end_at),
    bundle_status: bundle.status,
    forwarded_messages: forwardedMessages,
    source_metadata: sourceMetadata,
  };

  if (bundle.ambiguity_reason) {
    debugMetadata.ambiguity_reason = bundle.ambiguity_reason;
  }

  return debugMetadata;
}

function resolveBundleSourceInfo(forwardedMessages) {
  if (forwardedMessages.length === 0) {
    return "direct_message";
  }

  const sourceInfo = forwardedMessages[0].source_info;
  if (typeof sourceInfo !== "string" || sourceInfo.trim() === "") {
    return "forward";
  }

  return sourceInfo;
}

function collectBundledMessageIds(bundles) {
  const bundledIds = new Set();

  bundles.forEach((bundle) => {
    if (!Array.isArray(bundle.message_ids)) {
      return;
    }

    bundle.message_ids.forEach((messageId) => {
      bundledIds.add(messageId);
    });
  });

  return bundledIds;
}

function createBundleBody(bundle) {
  const sections = [];
  const noteText = typeof bundle.note_text === "string" ? bundle.note_text.trim() : "";
  const forwardedMessages = Array.isArray(bundle.forwarded_messages) ? bundle.forwarded_messages : [];

  if (noteText !== "") {
    sections.push("==== NOTE ====");
    sections.push(noteText);
  }

  if (forwardedMessages.length > 0) {
    sections.push("==== FORWARDS ====");
    forwardedMessages.forEach((forwardedMessage, index) => {
      const title = `---- Forward ${index + 1} (message_id: ${forwardedMessage.message_id}) ----`;
      const sourceInfo = `Source: ${forwardedMessage.source_info || "Unknown"}`;
      const content = typeof forwardedMessage.content === "string" && forwardedMessage.content.trim() !== ""
        ? forwardedMessage.content
        : "[No extractable content]";
      sections.push(`${title}\n${sourceInfo}\n\n${content}`);
    });
  }

  if (sections.length === 0) {
    return "[Empty bundle]";
  }

  return sections.join("\n\n");
}

function resolveBundleMediaType(forwardedMessages) {
  const mediaTypes = Array.from(
    new Set(
      forwardedMessages
        .map((forwardedMessage) => forwardedMessage.media_type)
        .filter((mediaType) => mediaType && mediaType !== "none"),
    ),
  );

  if (mediaTypes.length === 0) {
    return "none";
  }

  if (mediaTypes.length === 1) {
    return mediaTypes[0];
  }

  return "mixed";
}

function toIsoString(value) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return new Date().toISOString();
  }

  return date.toISOString();
}

// Enhanced content extraction - handles all message types
function extractMessageContent(message) {
  let content = "";

  // Text content with entities (links, formatting, etc.)
  const messageText = message.text || message.caption || "";
  const messageEntities = message.entities || message.caption_entities || [];

  if (messageText) {
    content += formatTextWithLinks(messageText, messageEntities);
  }

  // Media descriptions with metadata
  if (message.photo) {
    content += content ? "\n\n" : "";
    content += `📸 **Photo** (${message.photo.length} sizes available)`;
    const largestPhoto = message.photo[message.photo.length - 1];
    if (largestPhoto.file_size) {
      content += ` - ${formatFileSize(largestPhoto.file_size)}`;
    }
  }

  if (message.video) {
    content += content ? "\n\n" : "";
    const video = message.video;
    content += `🎥 **Video** (${formatDuration(video.duration)})`;
    if (video.file_size) content += ` - ${formatFileSize(video.file_size)}`;
    if (video.width && video.height)
      content += ` - ${video.width}x${video.height}`;
  }

  if (message.document) {
    content += content ? "\n\n" : "";
    const doc = message.document;
    content += `📎 **Document**: ${doc.file_name || "Unknown filename"}`;
    if (doc.file_size) content += ` (${formatFileSize(doc.file_size)})`;
    if (doc.mime_type) content += ` - ${doc.mime_type}`;
  }

  if (message.audio) {
    content += content ? "\n\n" : "";
    const audio = message.audio;
    content += `🎵 **Audio** (${formatDuration(audio.duration)})`;
    if (audio.title) content += ` - "${audio.title}"`;
    if (audio.performer) content += ` by ${audio.performer}`;
    if (audio.file_size) content += ` - ${formatFileSize(audio.file_size)}`;
  }

  if (message.voice) {
    content += content ? "\n\n" : "";
    const voice = message.voice;
    content += `🎤 **Voice Note** (${formatDuration(voice.duration)})`;
    if (voice.file_size) content += ` - ${formatFileSize(voice.file_size)}`;
  }

  if (message.sticker) {
    content += content ? "\n\n" : "";
    const sticker = message.sticker;
    content += `🎭 **Sticker**: ${sticker.emoji || "❓"}`;
    if (sticker.set_name) content += ` from "${sticker.set_name}"`;
    if (sticker.width && sticker.height)
      content += ` (${sticker.width}x${sticker.height})`;
  }

  if (message.animation) {
    content += content ? "\n\n" : "";
    const anim = message.animation;
    content += `🎬 **GIF/Animation** (${formatDuration(anim.duration)})`;
    if (anim.file_size) content += ` - ${formatFileSize(anim.file_size)}`;
    if (anim.width && anim.height) content += ` - ${anim.width}x${anim.height}`;
  }

  if (message.video_note) {
    content += content ? "\n\n" : "";
    const videoNote = message.video_note;
    content += `📹 **Video Note** (${formatDuration(videoNote.duration)})`;
    if (videoNote.file_size)
      content += ` - ${formatFileSize(videoNote.file_size)}`;
  }

  if (message.contact) {
    content += content ? "\n\n" : "";
    const contact = message.contact;
    content +=
      `👤 **Contact**: ${contact.first_name} ${contact.last_name || ""}`.trim();
    if (contact.phone_number) content += ` - ${contact.phone_number}`;
    if (contact.username) content += ` (@${contact.username})`;
  }

  if (message.location) {
    content += content ? "\n\n" : "";
    const loc = message.location;
    content += `📍 **Location**: ${loc.latitude}, ${loc.longitude}`;
    if (loc.live_period) content += ` (Live for ${loc.live_period}s)`;
  }

  if (message.venue) {
    content += content ? "\n\n" : "";
    const venue = message.venue;
    content += `🏢 **Venue**: ${venue.title}`;
    if (venue.address) content += `\n📍 Address: ${venue.address}`;
    if (venue.foursquare_id)
      content += `\n🔗 Foursquare: ${venue.foursquare_id}`;
  }

  if (message.poll) {
    content += content ? "\n\n" : "";
    const poll = message.poll;
    content += `📊 **Poll**: ${poll.question}\n`;
    if (poll.type) content += `Type: ${poll.type}\n`;
    poll.options.forEach((option, idx) => {
      content += `${idx + 1}. ${option.text} (${option.voter_count} votes)\n`;
    });
    content = content.trim();
  }

  if (message.dice) {
    content += content ? "\n\n" : "";
    content += `🎲 **Dice**: ${message.dice.emoji} rolled ${message.dice.value}`;
  }

  if (message.game) {
    content += content ? "\n\n" : "";
    const game = message.game;
    content += `🎮 **Game**: ${game.title}`;
    if (game.description) content += `\n${game.description}`;
  }

  return (
    content ||
    "[No extractable content - message may be empty or contain unsupported media type]"
  );
}

// Helper functions
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

function getMediaType(message) {
  if (message.photo) return "photo";
  if (message.video) return "video";
  if (message.document) return "document";
  if (message.audio) return "audio";
  if (message.voice) return "voice";
  if (message.sticker) return "sticker";
  if (message.animation) return "animation";
  if (message.video_note) return "video_note";
  if (message.contact) return "contact";
  if (message.location) return "location";
  if (message.venue) return "venue";
  if (message.poll) return "poll";
  if (message.dice) return "dice";
  if (message.game) return "game";
  return "none";
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "unknown size";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024)
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
}

function formatDuration(seconds) {
  if (!seconds) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

async function markAsProcessed(offset) {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getUpdates`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          offset: offset,
        }),
      },
    );

    if (process.env.DEBUG === "true") {
      console.log(`Marked messages as processed with offset: ${offset}`);
      if (!response.ok) {
        console.log(`Warning: markAsProcessed got status ${response.status}`);
      }
    }
  } catch (error) {
    console.log("Warning: Could not update offset:", error.message);
  }
}

function extractLinks(message, text, entities) {
  const links = [];

  entities.forEach((entity) => {
    if (entity.type === "url" || entity.type === "text_link") {
      const linkText = text.substring(
        entity.offset,
        entity.offset + entity.length,
      );
      const url = entity.type === "url" ? linkText : entity.url;
      links.push({ text: linkText, url });
    }
  });

  return links;
}

function formatTextWithLinks(text, entities) {
  if (!entities || entities.length === 0) {
    return text;
  }

  // Sort entities by offset in reverse order to avoid offset shifting
  const sortedEntities = [...entities].sort((a, b) => b.offset - a.offset);

  let result = text;

  sortedEntities.forEach((entity) => {
    const entityText = text.substring(
      entity.offset,
      entity.offset + entity.length,
    );
    let replacement = entityText;

    // Handle different entity types
    switch (entity.type) {
      case "url":
      case "text_link":
        const url = entity.type === "url" ? entityText : entity.url;
        replacement = `[${entityText}](${url})`;
        break;
      case "bold":
        replacement = `**${entityText}**`;
        break;
      case "italic":
        replacement = `*${entityText}*`;
        break;
      case "code":
        replacement = `\`${entityText}\``;
        break;
      case "pre":
        const language = entity.language || "";
        replacement = `\`\`\`${language}\n${entityText}\n\`\`\``;
        break;
      case "strikethrough":
        replacement = `~~${entityText}~~`;
        break;
      case "underline":
        replacement = `__${entityText}__`;
        break;
      case "spoiler":
        replacement = `||${entityText}||`;
        break;
      // For other types (mention, hashtag, etc.), keep original text
      default:
        replacement = entityText;
        break;
    }

    result =
      result.substring(0, entity.offset) +
      replacement +
      result.substring(entity.offset + entity.length);
  });

  return result;
}

// Export for testing if needed
if (require.main === module) {
  pollTelegram();
}

function extractMessageFromUpdate(update) {
  return (
    update.message ||
    update.channel_post ||
    update.edited_message ||
    update.edited_channel_post ||
    null
  );
}

function matchesTargetChat(chat) {
  if (!chat) {
    return false;
  }

  const target = normalizeChatIdentifier(process.env.CHAT_ID);
  if (!target) {
    return false;
  }

  const candidates = [
    normalizeChatIdentifier(chat.id),
    normalizeChatIdentifier(chat.username),
    normalizeChatIdentifier(chat.title),
  ].filter(Boolean);

  return candidates.includes(target);
}

function normalizeChatIdentifier(value) {
  if (value === undefined || value === null) {
    return "";
  }

  const str = value.toString().trim();
  if (!str) {
    return "";
  }

  if (/^-?\d+$/.test(str)) {
    return str;
  }

  return str.replace(/^@/, "").toLowerCase();
}

function formatChatIdentifier(chat) {
  if (!chat) {
    return "unknown";
  }

  if (chat.username) {
    return `@${chat.username}`;
  }

  if (chat.title) {
    return chat.title;
  }

  if (chat.id !== undefined) {
    return chat.id.toString();
  }

  return "unknown";
}

module.exports = { pollTelegram };
