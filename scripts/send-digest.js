const fs = require('fs');
const path = require('path');

async function sendDigest() {
  try {
    const digestType = process.env.DIGEST_TYPE || 'daily';
    const botToken = process.env.BOT_TOKEN;
    const chatId = process.env.CHAT_ID;
    
    if (!botToken || !chatId) {
      console.error('Missing BOT_TOKEN or CHAT_ID');
      process.exit(1);
    }
    
    console.log(`Generating ${digestType} digest...`);
    
    // Check if inbox exists
    if (!fs.existsSync('inbox')) {
      await sendTelegram(botToken, chatId, '📭 Sentidex inbox is empty.');
      return;
    }
    
    // Get files
    const files = fs.readdirSync('inbox')
      .filter(f => f.endsWith('.md'))
      .map(f => path.join('inbox', f));
    
    console.log(`Found ${files.length} total files`);
    
    let filteredFiles = files;
    
    // Filter for daily digest (files created today)
    if (digestType === 'daily') {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
      
      filteredFiles = files.filter(file => {
        const stats = fs.statSync(file);
        const fileDate = stats.mtime.toISOString().split('T')[0];
        return fileDate === todayStr;
      });
      
      console.log(`Filtered to ${filteredFiles.length} files from today (${todayStr})`);
    }
    
    // Generate message
    const message = await generateMessage(digestType, filteredFiles);
    
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
      return '✅ Нет новых идей за сегодня';
    } else {
      return '✅ Очередь идей пуста';
    }
  }
  
  // Header
  const today = new Date();
  const dateStr = today.toLocaleDateString('ru-RU');
  const weekNum = getWeekNumber(today);
  
  let header;
  if (digestType === 'daily') {
    header = `📅 *Sentidex Daily* - ${dateStr}`;
  } else {
    header = `📊 *Sentidex Weekly* - неделя ${weekNum}`;
  }
  
  let message = `${header}\\nНайдено идей: ${files.length}\\n`;
  
  // Process each file
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`Processing file ${i + 1}/${files.length}: ${file}`);
    
    try {
      const content = fs.readFileSync(file, 'utf8');
      const { frontMatter, bodyContent } = parseFrontMatter(content);
      
      console.log('Parsed front matter:', JSON.stringify(frontMatter, null, 2));
      
      // Build entry
      let entry = `\\n${i + 1}. `;
      
      // Summary
      if (frontMatter.summary) {
        entry += `*${frontMatter.summary}*`;
      } else {
        entry += `*Идея ${path.basename(file, '.md')}*`;
      }
      
      // Source
      if (frontMatter.source_info) {
        entry += `\\n   📤 ${frontMatter.source_info}`;
      }
      
      // URL
      if (frontMatter.source_url && frontMatter.source_url !== '') {
        entry += `\\n   🔗 ${frontMatter.source_url}`;
      }
      
      // Tags
      if (frontMatter.tags && Array.isArray(frontMatter.tags) && frontMatter.tags.length > 0) {
        const tags = frontMatter.tags.map(tag => `#${tag}`).join(' ');
        entry += `\\n   🏷 ${tags}`;
      }
      
      message += entry;
      
      // Check message length (Telegram limit ~4096)
      if (message.length > 3500) {
        const remaining = files.length - i - 1;
        if (remaining > 0) {
          message += `\\n\\n... и ещё ${remaining} идей`;
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
  const lines = content.split('\\n');
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
    bodyContent: bodyLines.join('\\n').trim()
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
      const paramsNoMarkdown = new URLSearchParams({
        chat_id: chatId,
        text: message.replace(/\*/g, '').replace(/\\_/g, '_')
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