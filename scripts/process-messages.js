const fs = require('fs');
const path = require('path');
const { getAIEnrichment } = require('./services/ai.js');

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
    let duplicateCount = 0;
    let failedCount = 0;
    
    for (const filename of inboxFiles) {
      const inboxPath = path.join('_inbox', filename);
      console.log(`Processing file: ${filename}`);
      
      try {
        const result = await processFile(inboxPath);

        if (result === 'processed') {
          processedCount++;
        } else if (result === 'duplicate') {
          duplicateCount++;
        } else if (result === 'failed') {
          failedCount++;
        }
      } catch (error) {
        console.error(`Error processing ${filename}:`, error.message);
        failedCount++;
        // Continue with other files
      }
    }
    
    console.log(`Successfully processed ${processedCount} files`);
    if (duplicateCount > 0) {
      console.log(`Detected ${duplicateCount} duplicates`);
    }
    if (failedCount > 0) {
      console.log(`Left ${failedCount} files in _inbox after AI failures`);
    }
    
  } catch (error) {
    console.error('Error in message processing:', error);
    process.exit(1);
  }
}

async function processFile(inboxPath) {
  const content = fs.readFileSync(inboxPath, 'utf8');
  
  // Parse front matter and content
  const { frontMatter, bodyContent } = parseFrontMatter(content);
  
  if (process.env.DEBUG === 'true') {
    console.log('Original front matter:', JSON.stringify(frontMatter, null, 2));
    console.log('Body content preview:', bodyContent.substring(0, 200) + '...');
  }

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

      fs.unlinkSync(inboxPath);
      console.log(`Deleted raw duplicate file: ${inboxPath}`);
      return 'duplicate';
    }
  }
  
  // AI Enrichment Call
  let aiResults;
  try {
    aiResults = await getAIEnrichment(bodyContent);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`AI enrichment failed for ${inboxPath}: ${reason}`);
    console.log(`Keeping original file in _inbox for manual retry: ${inboxPath}`);
    return 'failed';
  }

  try {
    validateAIResults(aiResults);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`AI result validation failed for ${inboxPath}: ${reason}`);
    console.log(`Keeping original file in _inbox for manual retry: ${inboxPath}`);
    return 'failed';
  }
  
  // Create enriched front matter
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
  
  // Generate new filename with AI title and timestamp
  const timestamp = new Date(frontMatter.timestamp || Date.now());
  const newFilename = `${aiResults.title}-${formatTimestamp(timestamp)}.md`;
  const outboxPath = path.join('inbox', newFilename);
  
  // Create new content
  const newFrontMatter = createFrontMatterString(enrichedFrontMatter);
  const newContent = `${newFrontMatter}\n\n${bodyContent}`;
  
  // Write to inbox
  fs.writeFileSync(outboxPath, newContent, 'utf8');
  console.log(`Created processed file: ${outboxPath}`);
  
  if (process.env.DEBUG === 'true') {
    console.log('AI Results:', aiResults);
    console.log('New filename:', newFilename);
  }
  
  // Delete original file from _inbox
  fs.unlinkSync(inboxPath);
  console.log(`Deleted original file: ${inboxPath}`);
  return 'processed';
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
  
  // Parse YAML-like front matter
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
          // Keep as string if JSON parse fails
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

function detectLanguage(content) {
  // Simple language detection
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
      result += `${key}: "${value}"\n`;
    } else if (Array.isArray(value) || typeof value === 'object') {
      result += `${key}: ${JSON.stringify(value)}\n`;
    } else {
      result += `${key}: ${value}\n`;
    }
  }
  
  result += '---';
  return result;
}

function validateAIResults(results) {
  if (!results || typeof results !== 'object') {
    throw new Error('Empty AI result');
  }

  const { title, summary, tags } = results;

  if (!title || typeof title !== 'string') {
    throw new Error('AI result missing title');
  }

  if (!summary || typeof summary !== 'string') {
    throw new Error('AI result missing summary');
  }

  if (!Array.isArray(tags)) {
    throw new Error('AI result missing tags array');
  }
}

// Run the processing
processMessages();
