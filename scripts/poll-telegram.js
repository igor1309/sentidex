const fs = require('fs');
const path = require('path');

async function pollTelegram() {
  console.log('Starting Telegram polling...');
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/getUpdates`, {
      method: 'GET'
    });
    
    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (process.env.DEBUG === 'true') {
      console.log('Telegram response:', JSON.stringify(data, null, 2));
    }
    
    if (!data.ok) {
      throw new Error(`Telegram API returned error: ${data.description}`);
    }
    
    const updates = data.result || [];
    console.log(`Found ${updates.length} updates`);
    
    let processedCount = 0;
    let skippedCount = 0;
    let highestUpdateId = 0;
    
    for (const update of updates) {
      // Track highest update ID for proper offset handling
      highestUpdateId = Math.max(highestUpdateId, update.update_id);
      
      if (update.message && update.message.chat.id.toString() === process.env.CHAT_ID) {
        const message = update.message;
        console.log(`Processing message ID: ${message.message_id}`);
        
        if (isForwardedMessage(message)) {
          if (process.env.DEBUG === 'true') {
            console.log('Full forwarded message object:', JSON.stringify(message, null, 2));
          }
          await processForwardedMessage(message);
          processedCount++;
        } else if (hasContent(message)) {
          await processRegularMessage(message);
          processedCount++;
        } else {
          console.log(`Skipping message ${message.message_id} - no processable content`);
          skippedCount++;
        }
      }
    }
    
    // Mark all messages as processed at once
    if (highestUpdateId > 0) {
      await markAsProcessed(highestUpdateId + 1);
    }
    
    console.log(`Processed ${processedCount} messages, skipped ${skippedCount} messages`);
    
  } catch (error) {
    console.error('Error polling Telegram:', error);
    process.exit(1);
  }
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

// Check if message has any processable content
function hasContent(message) {
  return !!(
    message.text || 
    message.caption || 
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

async function processForwardedMessage(message) {
  const timestamp = new Date();
  const filename = formatTimestamp(timestamp) + '.md';
  const filepath = path.join('_inbox', filename);
  
  if (!fs.existsSync('_inbox')) {
    fs.mkdirSync('_inbox', { recursive: true });
  }
  
  let sourceInfo = 'Unknown';
  let sourceUrl = '';
  let isForwardProtected = false;
  
  // Enhanced source info extraction - handles all forward types
  if (message.forward_origin) {
    // New API structure - more reliable
    switch (message.forward_origin.type) {
      case 'user':
        const user = message.forward_origin.sender_user;
        sourceInfo = user.username ? `@${user.username}` : 
                     `${user.first_name || 'Unknown'} ${user.last_name || ''}`.trim();
        break;
      case 'chat':
        sourceInfo = message.forward_origin.sender_chat.title || 
                     message.forward_origin.sender_chat.username || 'Unknown Chat';
        break;
      case 'channel':
        const chat = message.forward_origin.chat;
        sourceInfo = chat.title || `@${chat.username}` || 'Unknown Channel';
        if (chat.username && message.forward_origin.message_id) {
          sourceUrl = `https://t.me/${chat.username}/${message.forward_origin.message_id}`;
        }
        break;
      case 'hidden_user':
        sourceInfo = message.forward_origin.sender_user_name || 'Hidden User';
        isForwardProtected = true;
        break;
    }
  } else {
    // Fallback to legacy fields
    if (message.forward_from) {
      const user = message.forward_from;
      sourceInfo = user.username ? `@${user.username}` : 
                   `${user.first_name || 'Unknown'} ${user.last_name || ''}`.trim();
    } else if (message.forward_from_chat) {
      const chat = message.forward_from_chat;
      sourceInfo = chat.title || `@${chat.username}` || 'Unknown Chat';
      
      // Try to build URL for public channels
      if (chat.username && message.forward_from_message_id) {
        sourceUrl = `https://t.me/${chat.username}/${message.forward_from_message_id}`;
      }
    } else if (message.forward_sender_name) {
      sourceInfo = message.forward_sender_name;
      isForwardProtected = true;
    }
  }
  
  // Extract comprehensive message content
  const content = extractMessageContent(message);
  
  const frontMatter = `---
raw_message: true
message_id: ${message.message_id}
timestamp: "${timestamp.toISOString()}"
source_info: "${sourceInfo.replace(/"/g, '\\"')}"
source_url: "${sourceUrl}"
forward_date: "${message.forward_date ? new Date(message.forward_date * 1000).toISOString() : ''}"
has_media: ${hasMedia(message)}
media_type: "${getMediaType(message)}"
forward_protected: ${isForwardProtected}
---`;
  
  const fullContent = `${frontMatter}\n\n${content}`;
  
  fs.writeFileSync(filepath, fullContent, 'utf8');
  console.log(`Created forwarded message file: ${filepath}`);
  
  if (process.env.DEBUG === 'true') {
    console.log('File content preview:', fullContent.substring(0, 500) + '...');
  }
}

async function processRegularMessage(message) {
  const timestamp = new Date();
  const filename = 'regular_' + formatTimestamp(timestamp) + '.md';
  const filepath = path.join('_inbox', filename);
  
  if (!fs.existsSync('_inbox')) {
    fs.mkdirSync('_inbox', { recursive: true });
  }
  
  const content = extractMessageContent(message);
  
  const frontMatter = `---
raw_message: true
message_id: ${message.message_id}
timestamp: "${timestamp.toISOString()}"
source_info: "direct_message"
source_url: ""
has_media: ${hasMedia(message)}
media_type: "${getMediaType(message)}"
forward_protected: false
---`;
  
  const fullContent = `${frontMatter}\n\n${content}`;
  
  fs.writeFileSync(filepath, fullContent, 'utf8');
  console.log(`Created regular message file: ${filepath}`);
}

// Enhanced content extraction - handles all message types
function extractMessageContent(message) {
  let content = '';
  
  // Text content with entities (links, formatting, etc.)
  const messageText = message.text || message.caption || '';
  const messageEntities = message.entities || message.caption_entities || [];
  
  if (messageText) {
    content += formatTextWithLinks(messageText, messageEntities);
  }
  
  // Media descriptions with metadata
  if (message.photo) {
    content += content ? '\n\n' : '';
    content += `📸 **Photo** (${message.photo.length} sizes available)`;
    const largestPhoto = message.photo[message.photo.length - 1];
    if (largestPhoto.file_size) {
      content += ` - ${formatFileSize(largestPhoto.file_size)}`;
    }
  }
  
  if (message.video) {
    content += content ? '\n\n' : '';
    const video = message.video;
    content += `🎥 **Video** (${formatDuration(video.duration)})`;
    if (video.file_size) content += ` - ${formatFileSize(video.file_size)}`;
    if (video.width && video.height) content += ` - ${video.width}x${video.height}`;
  }
  
  if (message.document) {
    content += content ? '\n\n' : '';
    const doc = message.document;
    content += `📎 **Document**: ${doc.file_name || 'Unknown filename'}`;
    if (doc.file_size) content += ` (${formatFileSize(doc.file_size)})`;
    if (doc.mime_type) content += ` - ${doc.mime_type}`;
  }
  
  if (message.audio) {
    content += content ? '\n\n' : '';
    const audio = message.audio;
    content += `🎵 **Audio** (${formatDuration(audio.duration)})`;
    if (audio.title) content += ` - "${audio.title}"`;
    if (audio.performer) content += ` by ${audio.performer}`;
    if (audio.file_size) content += ` - ${formatFileSize(audio.file_size)}`;
  }
  
  if (message.voice) {
    content += content ? '\n\n' : '';
    const voice = message.voice;
    content += `🎤 **Voice Note** (${formatDuration(voice.duration)})`;
    if (voice.file_size) content += ` - ${formatFileSize(voice.file_size)}`;
  }
  
  if (message.sticker) {
    content += content ? '\n\n' : '';
    const sticker = message.sticker;
    content += `🎭 **Sticker**: ${sticker.emoji || '❓'}`;
    if (sticker.set_name) content += ` from "${sticker.set_name}"`;
    if (sticker.width && sticker.height) content += ` (${sticker.width}x${sticker.height})`;
  }
  
  if (message.animation) {
    content += content ? '\n\n' : '';
    const anim = message.animation;
    content += `🎬 **GIF/Animation** (${formatDuration(anim.duration)})`;
    if (anim.file_size) content += ` - ${formatFileSize(anim.file_size)}`;
    if (anim.width && anim.height) content += ` - ${anim.width}x${anim.height}`;
  }
  
  if (message.video_note) {
    content += content ? '\n\n' : '';
    const videoNote = message.video_note;
    content += `📹 **Video Note** (${formatDuration(videoNote.duration)})`;
    if (videoNote.file_size) content += ` - ${formatFileSize(videoNote.file_size)}`;
  }
  
  if (message.contact) {
    content += content ? '\n\n' : '';
    const contact = message.contact;
    content += `👤 **Contact**: ${contact.first_name} ${contact.last_name || ''}`.trim();
    if (contact.phone_number) content += ` - ${contact.phone_number}`;
    if (contact.username) content += ` (@${contact.username})`;
  }
  
  if (message.location) {
    content += content ? '\n\n' : '';
    const loc = message.location;
    content += `📍 **Location**: ${loc.latitude}, ${loc.longitude}`;
    if (loc.live_period) content += ` (Live for ${loc.live_period}s)`;
  }
  
  if (message.venue) {
    content += content ? '\n\n' : '';
    const venue = message.venue;
    content += `🏢 **Venue**: ${venue.title}`;
    if (venue.address) content += `\n📍 Address: ${venue.address}`;
    if (venue.foursquare_id) content += `\n🔗 Foursquare: ${venue.foursquare_id}`;
  }
  
  if (message.poll) {
    content += content ? '\n\n' : '';
    const poll = message.poll;
    content += `📊 **Poll**: ${poll.question}\n`;
    if (poll.type) content += `Type: ${poll.type}\n`;
    poll.options.forEach((option, idx) => {
      content += `${idx + 1}. ${option.text} (${option.voter_count} votes)\n`;
    });
    content = content.trim();
  }
  
  if (message.dice) {
    content += content ? '\n\n' : '';
    content += `🎲 **Dice**: ${message.dice.emoji} rolled ${message.dice.value}`;
  }
  
  if (message.game) {
    content += content ? '\n\n' : '';
    const game = message.game;
    content += `🎮 **Game**: ${game.title}`;
    if (game.description) content += `\n${game.description}`;
  }
  
  return content || '[No extractable content - message may be empty or contain unsupported media type]';
}

// Helper functions
function hasMedia(message) {
  return !!(
    message.photo || message.video || message.document || 
    message.audio || message.voice || message.sticker ||
    message.animation || message.video_note
  );
}

function getMediaType(message) {
  if (message.photo) return 'photo';
  if (message.video) return 'video';
  if (message.document) return 'document';
  if (message.audio) return 'audio';
  if (message.voice) return 'voice';
  if (message.sticker) return 'sticker';
  if (message.animation) return 'animation';
  if (message.video_note) return 'video_note';
  if (message.contact) return 'contact';
  if (message.location) return 'location';
  if (message.venue) return 'venue';
  if (message.poll) return 'poll';
  if (message.dice) return 'dice';
  if (message.game) return 'game';
  return 'none';
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return 'unknown size';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

function formatDuration(seconds) {
  if (!seconds) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

async function markAsProcessed(offset) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/getUpdates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        offset: offset
      })
    });
    
    if (process.env.DEBUG === 'true') {
      console.log(`Marked messages as processed with offset: ${offset}`);
      if (!response.ok) {
        console.log(`Warning: markAsProcessed got status ${response.status}`);
      }
    }
  } catch (error) {
    console.log('Warning: Could not update offset:', error.message);
  }
}

function formatTimestamp(date) {
  return date.getFullYear() + '-' +
         String(date.getMonth() + 1).padStart(2, '0') + '-' +
         String(date.getDate()).padStart(2, '0') + '-' +
         String(date.getHours()).padStart(2, '0') + '-' +
         String(date.getMinutes()).padStart(2, '0') + '-' +
         String(date.getSeconds()).padStart(2, '0');
}

function extractLinks(message, text, entities) {
  const links = [];
  
  entities.forEach(entity => {
    if (entity.type === 'url' || entity.type === 'text_link') {
      const linkText = text.substring(entity.offset, entity.offset + entity.length);
      const url = entity.type === 'url' ? linkText : entity.url;
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
  
  sortedEntities.forEach(entity => {
    const entityText = text.substring(entity.offset, entity.offset + entity.length);
    let replacement = entityText;
    
    // Handle different entity types
    switch (entity.type) {
      case 'url':
      case 'text_link':
        const url = entity.type === 'url' ? entityText : entity.url;
        replacement = `[${entityText}](${url})`;
        break;
      case 'bold':
        replacement = `**${entityText}**`;
        break;
      case 'italic':
        replacement = `*${entityText}*`;
        break;
      case 'code':
        replacement = `\`${entityText}\``;
        break;
      case 'pre':
        const language = entity.language || '';
        replacement = `\`\`\`${language}\n${entityText}\n\`\`\``;
        break;
      case 'strikethrough':
        replacement = `~~${entityText}~~`;
        break;
      case 'underline':
        replacement = `__${entityText}__`;
        break;
      case 'spoiler':
        replacement = `||${entityText}||`;
        break;
      // For other types (mention, hashtag, etc.), keep original text
      default:
        replacement = entityText;
        break;
    }
    
    result = result.substring(0, entity.offset) + 
             replacement + 
             result.substring(entity.offset + entity.length);
  });
  
  return result;
}

// Export for testing if needed
if (require.main === module) {
  pollTelegram();
}

module.exports = { pollTelegram };