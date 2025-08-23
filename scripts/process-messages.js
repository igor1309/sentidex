const fs = require('fs');
const path = require('path');

async function processMessages() {
  console.log('Starting message processing...');
  
  try {
    // Check if _inbox exists
    if (!fs.existsSync('_inbox')) {
      console.log('No _inbox directory found');
      return;
    }
    
    // Create inbox directory if it doesn't exist
    if (!fs.existsSync('inbox')) {
      fs.mkdirSync('inbox', { recursive: true });
    }
    
    // Get all files from _inbox
    const inboxFiles = fs.readdirSync('_inbox').filter(file => file.endsWith('.md'));
    console.log(`Found ${inboxFiles.length} files to process`);
    
    if (inboxFiles.length === 0) {
      console.log('No files to process in _inbox');
      return;
    }
    
    let processedCount = 0;
    
    for (const filename of inboxFiles) {
      const inboxPath = path.join('_inbox', filename);
      console.log(`Processing file: ${filename}`);
      
      try {
        await processFile(inboxPath);
        processedCount++;
      } catch (error) {
        console.error(`Error processing ${filename}:`, error.message);
        // Continue with other files
      }
    }
    
    console.log(`Successfully processed ${processedCount} files`);
    
  } catch (error) {
    console.error('Error in message processing:', error);
    process.exit(1);
  }
}

async function processFile(inboxPath) {
  const content = fs.readFileSync(inboxPath, 'utf8');
  const { frontMatter, bodyContent } = parseFrontMatter(content);
  
  if (process.env.DEBUG === 'true') {
    console.log('Original front matter:', JSON.stringify(frontMatter, null, 2));
  }
  
  // --- DEDUPLICATION LOGIC ---
  const sourceUrl = frontMatter.source_url;
  if (sourceUrl && sourceUrl !== '') {
    const originalFilePath = findOriginalBySourceUrl(sourceUrl, 'inbox');
    
    if (originalFilePath) {
      console.log(`Duplicate found for ${sourceUrl}. Original: ${originalFilePath}`);
      
      const originalFilename = path.basename(originalFilePath);
      const ticketFilename = `DUPL_${formatTimestamp(new Date())}.md`;
      const ticketPath = path.join('inbox', ticketFilename);
      
      const ticketFrontMatter = createFrontMatterString({
        id: generateId(),
        created_at: new Date().toISOString(),
        source_url: sourceUrl,
        is_duplicate: true,
        original_ref: originalFilename
      });
      
      const ticketContent = `${ticketFrontMatter}\n\nДубликат, см. оригинал: ${originalFilename}`;
      
      fs.writeFileSync(ticketPath, ticketContent, 'utf8');
      console.log(`Created duplicate ticket: ${ticketPath}`);
      
      // Clean up the original raw file and exit
      fs.unlinkSync(inboxPath);
      console.log(`Deleted raw duplicate file: ${inboxPath}`);
      return; // Stop processing this file
    }
  }
  
  // --- PROCESS AS A NEW, UNIQUE FILE ---
  console.log(`Processing as a new unique message.`);
  
  const aiResults = emulateAIProcessing(bodyContent, frontMatter);
  
  const enrichedFrontMatter = {
    id: frontMatter.id || generateId(),
    created_at: frontMatter.timestamp || new Date().toISOString(),
    source_info: frontMatter.source_info || 'unknown',
    source_url: frontMatter.source_url || '',
    has_media: frontMatter.has_media || false,
    language: detectLanguage(bodyContent),
    summary: aiResults.summary,
    tags: aiResults.tags,
    processed_at: new Date().toISOString()
  };
  
  const timestamp = new Date(frontMatter.timestamp || Date.now());
  const newFilename = formatTimestamp(timestamp) + '.md';
  const outboxPath = path.join('inbox', newFilename);
  
  const newFrontMatter = createFrontMatterString(enrichedFrontMatter);
  const newContent = `${newFrontMatter}\n\n${bodyContent}`;
  
  fs.writeFileSync(outboxPath, newContent, 'utf8');
  console.log(`Created processed file: ${outboxPath}`);
  
  fs.unlinkSync(inboxPath);
  console.log(`Deleted original file: ${inboxPath}`);
}

function findOriginalBySourceUrl(url, directory) {
  if (!fs.existsSync(directory)) {
    return null;
  }
  
  const files = fs.readdirSync(directory);
  for (const file of files) {
    if (file.endsWith('.md') && !file.startsWith('DUPL_')) {
      const filePath = path.join(directory, file);
      const content = fs.readFileSync(filePath, 'utf8');
      // Simple string search is fast and effective for this use case
      if (content.includes(`source_url: "${url}"`)) {
        return filePath;
      }
    }
  }
  return null;
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
      } else if (inFrontMatter && !frontMatterEnded) {
        frontMatterEnded = true;
      }
      continue;
    }
    
    if (inFrontMatter && !frontMatterEnded) {
      frontMatterLines.push(line);
    } else if (frontMatterEnded) {
      bodyLines.push(line);
    }
  }
  
  const frontMatter = {};
  frontMatterLines.forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();
      
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      
      if (value.startsWith('[') || value.startsWith('{')) {
        try { value = JSON.parse(value); } catch (e) {}
      }
      
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

function emulateAIProcessing(content, frontMatter) {
  let summary = content.replace(/\[No text content\]/, '').trim();
  if (summary.length > 100) {
    summary = summary.substring(0, 100);
    const lastSpace = summary.lastIndexOf(' ');
    if (lastSpace > 80) {
      summary = summary.substring(0, lastSpace);
    }
    summary = summary + '...';
  }
  
  if (!summary || summary.length < 10) {
    summary = `Message from ${frontMatter.source_info || 'unknown source'}`;
  }
  
  const tags = [];
  if (frontMatter.source_info) { tags.push('forwarded'); }
  if (frontMatter.has_media) { tags.push('media'); }
  
  const lowerContent = content.toLowerCase();
  if (lowerContent.includes('ai') || lowerContent.includes('ии')) { tags.push('ai'); }
  if (lowerContent.includes('code') || lowerContent.includes('programming') || lowerContent.includes('github')) { tags.push('programming'); }
  if (lowerContent.includes('business') || lowerContent.includes('startup')) { tags.push('business'); }
  
  return {
    summary: summary,
    tags: tags.length > 0 ? tags : ['general']
  };
}

function detectLanguage(content) {
  const hasRussian = /[а-яё]/i.test(content);
  const hasEnglish = /[a-z]/i.test(content);
  
  if (hasRussian && hasEnglish) return 'mixed';
  if (hasRussian) return 'ru';
  if (hasEnglish) return 'en';
  return 'unknown';
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatTimestamp(date) {
  return date.getFullYear() + '-' +
         String(date.getMonth() + 1).padStart(2, '0') + '-' +
         String(date.getDate()).padStart(2, '0') + '-' +
         String(date.getHours()).padStart(2, '0') + '-' +
         String(date.getMinutes()).padStart(2, '0') + '-' +
         String(date.getSeconds()).padStart(2, '0');
}

function createFrontMatterString(frontMatter) {
  let result = '---\n';
  for (const [key, value] of Object.entries(frontMatter)) {
    if (typeof value === 'string') {
      result += `${key}: "${value.replace(/"/g, '\\"')}"\n`;
    } else if (Array.isArray(value) || typeof value === 'object') {
      result += `${key}: ${JSON.stringify(value)}\n`;
    } else {
      result += `${key}: ${value}\n`;
    }
  }
  result += '---';
  return result;
}

// Run the processing
processMessages();