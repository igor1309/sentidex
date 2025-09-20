const fs = require('fs');
const path = require('path');

function escapeMarkdown(text = '') {
  return String(text).replace(/([_*\[\]()])/g, '\\$1');
}

async function sendDigest() {
  try {
    const digestType = process.env.DIGEST_TYPE || 'daily'; // 'daily' or 'weekly'
    const botToken = process.env.BOT_TOKEN;
    const chatId = process.env.CHAT_ID;
    
    if (!botToken || !chatId) {
      console.error('Missing BOT_TOKEN or CHAT_ID');
      process.exit(1);
    }
    
    console.log(`Generating ${digestType} digest...`);
    console.log('DIGEST_TYPE environment variable:', process.env.DIGEST_TYPE);
    
    // Check if inbox exists
    if (!fs.existsSync('inbox')) {
      await sendTelegram(botToken, chatId, '📭 Sentidex inbox is empty.');
      return;
    }
    
    // Get all unique files from the inbox
    const allFiles = fs.readdirSync('inbox')
      .filter(f => f.endsWith('.md') && !f.startsWith('DUPL_'))
      .map(f => path.join('inbox', f));
    
    let filesToProcess = allFiles;
    
    // Filter for daily digest (files created in last 24 hours)
    if (digestType === 'daily') {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      console.log(`DEBUG: Current time: ${now.toISOString()}`);
      console.log(`DEBUG: 24 hours ago: ${twentyFourHoursAgo.toISOString()}`);
      
      filesToProcess = allFiles.filter(file => {
        try {
          const content = fs.readFileSync(file, 'utf8');
          const { frontMatter } = parseFrontMatter(content);
          
          if (frontMatter.created_at) {
            const createdAt = new Date(frontMatter.created_at);
            const include = createdAt >= twentyFourHoursAgo;
            console.log(`DEBUG: File ${file} created at: ${createdAt.toISOString()}, include: ${include}`);
            return include;
          } else {
            // Fallback to file modification time if no created_at
            const stats = fs.statSync(file);
            const include = stats.mtime >= twentyFourHoursAgo;
            console.log(`DEBUG: File ${file} (no created_at) modified at: ${stats.mtime.toISOString()}, include: ${include}`);
            return include;
          }
        } catch (error) {
          console.error(`DEBUG: Error reading file ${file}:`, error.message);
          return false;
        }
      });
      
      console.log(`Found ${allFiles.length} total files, filtered to ${filesToProcess.length} for last 24 hours digest.`);

    } else if (digestType === 'weekly') {
      console.log(`Found ${filesToProcess.length} total files for the weekly digest.`);
    }
    
    // Generate message from the filtered list of files
    const message = await generateMessage(digestType, filesToProcess);
    
    // Send to Telegram
    await sendTelegram(botToken, chatId, message);
    
  } catch (error) {
    console.error('Error in sendDigest:', error);
    process.exit(1);
  }
}

async function generateMessage(digestType, files) {
  if (files.length === 0) {
    if (digestType === 'daily') {
      return '✅ Нет новых идей за последние 24 часа';
    } else {
      return '✅ Очередь идей пуста';
    }
  }
  
  // Generate header with message count in badge style
  const today = new Date();
  const dateStr = today.toLocaleDateString('ru-RU');
  const weekNum = getWeekNumber(today);
  const countBadge = `\\[${files.length}\\]`;
  let message;
  if (digestType === 'daily') {
    message = `📅 ${dateStr} *Sentidex Daily* ${countBadge}`;
  } else { // 'weekly'
    message = `📊 ${dateStr} *Sentidex Weekly* - неделя ${weekNum} ${countBadge}`;
  }
  
  // Process each file
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`Processing file ${i + 1}/${files.length}: ${file}`);
    
    try {
      const content = fs.readFileSync(file, 'utf8');
      const { frontMatter, bodyContent } = parseFrontMatter(content);
      
      console.log('Parsed front matter:', JSON.stringify(frontMatter, null, 2));
      
      // Build entry
      let entry = `\n\n${i + 1}. `;
      
      // Summary
      if (frontMatter.summary) {
        entry += `${escapeMarkdown(frontMatter.summary)}`;
      } else {
        entry += `Идея ${escapeMarkdown(path.basename(file, '.md'))}`;
      }
      
      // Source
      if (frontMatter.source_info) {
        entry += `\n   📤 ${escapeMarkdown(frontMatter.source_info)}`;
      }
      
      // URL (escape Telegram Markdown control characters)
      if (frontMatter.source_url && frontMatter.source_url !== '') {
        const escapedUrl = escapeMarkdown(frontMatter.source_url);
        entry += `\n   🔗 ${escapedUrl}`;
      }
      
      // Tags
      if (frontMatter.tags && Array.isArray(frontMatter.tags) && frontMatter.tags.length > 0) {
        const tags = frontMatter.tags.map(tag => `#${escapeMarkdown(tag)}`).join(' ');
        entry += `\n   🏷 ${tags}`;
      }
      
      message += entry;
      
      // Check message length (Telegram limit ~4096)
      if (message.length > 3500) {
        const remaining = files.length - i - 1;
        if (remaining > 0) {
          message += `\n\n... и ещё ${remaining} идей`;
        }
        break;
      }
      
    } catch (error) {
      console.error(`Error processing file ${file}:`, error.message);
      continue;
    }
  }
  
  return message;
}

function parseFrontMatter(content) {
  const lines = content.split('\n');
  const frontMatterLines = [];
  const bodyLines = [];
  
  let inFrontMatter = false;
  let frontMatterEnded = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.trim() === '---') {
      if (!inFrontMatter) {
        inFrontMatter = true;
        continue;
      } else {
        frontMatterEnded = true;
        continue;
      }
    }
    
    if (inFrontMatter && !frontMatterEnded) {
      frontMatterLines.push(line);
    } else if (frontMatterEnded) {
      bodyLines.push(line);
    }
  }
  
  // Parse front matter
  const frontMatter = {};
  frontMatterLines.forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();
      
      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      
      // Parse JSON arrays/objects
      if (value.startsWith('[') || value.startsWith('{')) {
        try {
          value = JSON.parse(value);
        } catch (e) {
          console.log(`Failed to parse JSON for key ${key}: ${value}`);
        }
      }
      
      // Parse booleans
      if (value === 'true') value = true;
      if (value === 'false') value = false;
      
      frontMatter[key] = value;
    }
  });
  
  return {
    frontMatter,
    bodyContent: bodyLines.join('\n').trim()
  };
}

async function sendTelegram(botToken, chatId, message) {
  console.log('Sending message to Telegram...');
  console.log('Message preview:', message.substring(0, 200) + '...');
  
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  const params = new URLSearchParams({
    chat_id: chatId,
    text: message,
    parse_mode: 'Markdown'
  });
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      body: params,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    });
    
    const result = await response.json();
    
    if (!response.ok || !result.ok) {
      console.error('Telegram API error:', result);
      
      // Try without Markdown
      console.log('Retrying without Markdown...');
      const plainMessage = message
        .replace(/\*/g, '')
        .replace(/\\([_\[\]\(\)])/g, '$1');

      const paramsNoMarkdown = new URLSearchParams({
        chat_id: chatId,
        text: plainMessage
      });
      
      const response2 = await fetch(url, {
        method: 'POST',
        body: paramsNoMarkdown,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      });
      
      const result2 = await response2.json();
      if (!result2.ok) {
        throw new Error(`Telegram API failed: ${JSON.stringify(result2)}`);
      }
    }
    
    console.log('Message sent successfully');
    
  } catch (error) {
    console.error('Error sending to Telegram:', error);
    throw error;
  }
}

function getWeekNumber(date) {
  const start = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date - start) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + start.getDay() + 1) / 7);
}

// Run
sendDigest();
