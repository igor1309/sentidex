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
    
    for (const update of updates) {
      if (update.message && update.message.chat.id.toString() === process.env.CHAT_ID) {
        
        const message = update.message;
        console.log(`Processing message ID: ${message.message_id}`);
        
        if (message.forward_from || message.forward_from_chat || message.forward_sender_name) {
          if (process.env.DEBUG === 'true') {
            console.log('Full forwarded message object:', JSON.stringify(message, null, 2));
          }
          await processForwardedMessage(message);
          processedCount++;
        } else if (message.text) {
          await processRegularMessage(message);
          processedCount++;
        }
        
        await markAsProcessed(update.update_id + 1);
      }
    }
    
    console.log(`Processed ${processedCount} messages`);
    
  } catch (error) {
    console.error('Error polling Telegram:', error);
    process.exit(1);
  }
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
  
  if (message.forward_from) {
    sourceInfo = `@${message.forward_from.username || message.forward_from.first_name}`;
  } else if (message.forward_from_chat) {
    sourceInfo = message.forward_from_chat.title || message.forward_from_chat.username;
    if (message.forward_origin && message.forward_origin.chat.username) {
      const username = message.forward_origin.chat.username;
      const messageId = message.forward_origin.message_id;
      sourceUrl = `https://t.me/${username}/${messageId}`;
    }
  } else if (message.forward_sender_name) {
    sourceInfo = message.forward_sender_name;
  }
  
  // Get text and entities (handle both regular messages and media with captions)
  const messageText = message.text || message.caption || '[No text content]';
  const messageEntities = message.entities || message.caption_entities || [];
  
  // Extract links from entities
  const links = extractLinks(message, messageText, messageEntities);
  const textWithLinks = formatTextWithLinks(messageText, messageEntities);
  
  const frontMatter = `---
raw_message: true
message_id: ${message.message_id}
timestamp: "${timestamp.toISOString()}"
source_info: "${sourceInfo}"
source_url: "${sourceUrl}"
has_media: ${!!(message.photo || message.video || message.document || message.audio || message.voice)}
---`;
  
  const content = `${frontMatter}\n\n${textWithLinks}`;
  
  fs.writeFileSync(filepath, content, 'utf8');
  console.log(`Created file: ${filepath}`);
  
  if (process.env.DEBUG === 'true') {
    console.log('File content:', content);
  }
}

async function processRegularMessage(message) {
  const timestamp = new Date();
  const filename = 'regular_' + formatTimestamp(timestamp) + '.md';
  const filepath = path.join('_inbox', filename);
  
  if (!fs.existsSync('_inbox')) {
    fs.mkdirSync('_inbox', { recursive: true });
  }
  
  // Get text and entities (handle both regular messages and media with captions)
  const messageText = message.text || message.caption || '[No text content]';
  const messageEntities = message.entities || message.caption_entities || [];
  
  const links = extractLinks(message, messageText, messageEntities);
  const textWithLinks = formatTextWithLinks(messageText, messageEntities);
  
  const frontMatter = `---
raw_message: true
message_id: ${message.message_id}
timestamp: "${timestamp.toISOString()}"
source_info: "direct_message"
source_url: ""
has_media: ${!!(message.photo || message.video || message.document || message.audio || message.voice)}
---`;
  
  const content = `${frontMatter}\n\n${textWithLinks}`;
  
  fs.writeFileSync(filepath, content, 'utf8');
  console.log(`Created regular message file: ${filepath}`);
}

async function markAsProcessed(offset) {
  try {
    await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/getUpdates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        offset: offset
      })
    });
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
    if (entity.type === 'url' || entity.type === 'text_link') {
      const entityText = text.substring(entity.offset, entity.offset + entity.length);
      const url = entity.type === 'url' ? entityText : entity.url;
      const markdownLink = `[${entityText}](${url})`;
      
      result = result.substring(0, entity.offset) + 
               markdownLink + 
               result.substring(entity.offset + entity.length);
    }
  });
  
  return result;
}

// Run the polling
pollTelegram();