const { execFileSync } = require('child_process');
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

    const fileMetaCache = new Map();
    let filesToProcess = allFiles;
    
    // Filter for daily digest (files created in last 24 hours)
    if (digestType === 'daily') {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      console.log(`DEBUG: Current time: ${now.toISOString()}`);
      console.log(`DEBUG: 24 hours ago: ${twentyFourHoursAgo.toISOString()}`);
      
      filesToProcess = allFiles.filter(file => {
        try {
          const meta = getFileMetadata(file, fileMetaCache);
          if (!meta || !meta.createdAt) {
            console.log(`DEBUG: File ${file} has no created_at metadata.`);
            return false;
          }

          const include = meta.createdAt >= twentyFourHoursAgo;
          console.log(`DEBUG: File ${file} created at: ${meta.createdAt.toISOString()}, include: ${include}`);
          return include;
        } catch (error) {
          console.error(`DEBUG: Error reading metadata for ${file}:`, error.message);
          return false;
        }
      });
      
      console.log(`Found ${allFiles.length} total files, filtered to ${filesToProcess.length} for last 24 hours digest.`);

    } else if (digestType === 'weekly') {
      console.log(`Found ${filesToProcess.length} total files for the weekly digest.`);
    }
    
    // Sort by created_at descending
    filesToProcess = filesToProcess.slice().sort((a, b) => {
      const metaA = getFileMetadata(a, fileMetaCache);
      const metaB = getFileMetadata(b, fileMetaCache);
      const timeA = metaA && metaA.createdAt ? metaA.createdAt.getTime() : 0;
      const timeB = metaB && metaB.createdAt ? metaB.createdAt.getTime() : 0;
      return timeB - timeA;
    });

    // Generate message from the filtered list of files
    const message = await generateMessage(digestType, filesToProcess, fileMetaCache);
    
    // Send to Telegram
    await sendTelegram(botToken, chatId, message);
    
  } catch (error) {
    console.error('Error in sendDigest:', error);
    process.exit(1);
  }
}

async function generateMessage(digestType, files, fileMetaCache = new Map()) {
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
  let message;
  const countBadge = `\\[${files.length}]`;
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
      const meta = fileMetaCache.get(file) || getFileMetadata(file, fileMetaCache);
      if (!meta) {
        console.log(`DEBUG: Skipping file ${file} due to missing metadata.`);
        continue;
      }

      const frontMatter = meta.frontMatter || {};
      const bodyContent = meta.bodyContent || '';

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

function getFileMetadata(file, cache) {
  if (cache.has(file)) {
    return cache.get(file);
  }

  try {
    const content = fs.readFileSync(file, 'utf8');
    const parsed = parseFrontMatter(content);

    let createdAt;
    if (parsed.frontMatter && parsed.frontMatter.created_at) {
      const dt = new Date(parsed.frontMatter.created_at);
      if (!Number.isNaN(dt.getTime())) {
        createdAt = dt;
      }
    }

    if (!createdAt) {
      const stats = fs.statSync(file);
      createdAt = stats.mtime;
    }

    const meta = {
      frontMatter: parsed.frontMatter || {},
      bodyContent: parsed.bodyContent || '',
      createdAt,
    };

    cache.set(file, meta);
    return meta;

  } catch (error) {
    console.error(`DEBUG: Failed to load metadata for ${file}:`, error.message);
    cache.set(file, null);
    return null;
  }
}

function sendTelegram(botToken, chatId, message) {
  console.log('Sending message to Telegram...');
  console.log('Message preview:', message.substring(0, 200) + '...');

  const wrapper = path.join(__dirname, 'ci', 'notify_telegram.sh');

  try {
    execFileSync(wrapper, [botToken, chatId, message], {
      env: { ...process.env, TELEGRAM_PARSE_MODE: 'Markdown' },
      stdio: ['ignore', 'inherit', 'inherit'],
    });
  } catch (err) {
    console.error('Telegram send failed:', err.message);
    console.log('Retrying without Markdown...');
    const plainMessage = message
      .replace(/\*/g, '')
      .replace(/\\([_\[\]\(\)])/g, '$1');

    try {
      execFileSync(wrapper, [botToken, chatId, plainMessage], {
        stdio: ['ignore', 'inherit', 'inherit'],
      });
    } catch (retryErr) {
      throw new Error(`Telegram send failed (retry without Markdown): ${retryErr.message}`);
    }
  }

  console.log('Message sent successfully');
}

function getWeekNumber(date) {
  const start = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date - start) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + start.getDay() + 1) / 7);
}

// Run
sendDigest();
