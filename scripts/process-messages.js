const fs = require('fs');
const path = require('path');
const { getAIEnrichment } = require('./services/ai.js');
const frontMatterCodec = require('./adapters/frontMatterCodec');
const logger = require('./adapters/consoleLogger');
const messageProcessor = require('./core/messageProcessor');

async function processMessages() {
  logger.info('Starting message processing...');
  
  try {
    // Check if _inbox exists
    if (!fs.existsSync('_inbox')) {
    logger.info('No _inbox directory found');
      return;
    }
    
    // Create inbox directory if it doesn't exist
    if (!fs.existsSync('inbox')) {
      fs.mkdirSync('inbox', { recursive: true });
    }
    
    // Get all files from _inbox
    const inboxFiles = fs.readdirSync('_inbox').filter(file => file.endsWith('.md'));
    logger.info(`Found ${inboxFiles.length} files to process`);
    
    if (inboxFiles.length === 0) {
      logger.info('No files to process in _inbox');
      return;
    }
    
    let processedCount = 0;
    let duplicateCount = 0;
    let failedCount = 0;
    
    for (const filename of inboxFiles) {
      const inboxPath = path.join('_inbox', filename);
    logger.info(`Processing file: ${filename}`);
      
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
        logger.error(`Error processing ${filename}: ${error.message}`);
        failedCount++;
        // Continue with other files
      }
    }
    
    logger.info(`Successfully processed ${processedCount} files`);
    if (duplicateCount > 0) {
      logger.info(`Detected ${duplicateCount} duplicates`);
    }
    if (failedCount > 0) {
      logger.info(`Left ${failedCount} files in _inbox after AI failures`);
    }
    
  } catch (error) {
    logger.error('Error in message processing:', error);
    process.exit(1);
  }
}

async function processFile(inboxPath) {
  const content = fs.readFileSync(inboxPath, 'utf8');
  
  // Parse front matter and content
  const { frontMatter, bodyContent } = frontMatterCodec.parse(content);
  
  if (process.env.DEBUG === 'true') {
    logger.info(`Original front matter: ${JSON.stringify(frontMatter, null, 2)}`);
    logger.info(`Body content preview: ${bodyContent.substring(0, 200)}...`);
  }

  const sourceUrl = frontMatter.source_url;
  if (sourceUrl && sourceUrl !== '') {
    const originalFilePath = findOriginalBySourceUrl(sourceUrl, 'inbox');

    if (originalFilePath) {
      logger.info(`Duplicate found for ${sourceUrl}. Original: ${originalFilePath}`);

      const originalFilename = path.basename(originalFilePath);
      const ticketFilename = `DUPL_${formatTimestamp(new Date())}.md`;
      const ticketPath = path.join('inbox', ticketFilename);

      const ticketContent = frontMatterCodec.stringify({
        frontMatter: {
          id: messageProcessor.generateId(),
          created_at: new Date().toISOString(),
          source_url: sourceUrl,
          is_duplicate: true,
          original_ref: originalFilename,
        },
        bodyContent: `Дубликат, см. оригинал: ${originalFilename}`,
      });

      fs.writeFileSync(ticketPath, ticketContent, 'utf8');
      logger.info(`Created duplicate ticket: ${ticketPath}`);

      fs.unlinkSync(inboxPath);
      logger.info(`Deleted raw duplicate file: ${inboxPath}`);
      return 'duplicate';
    }
  }
  
  // AI Enrichment Call
  let aiResults;
  try {
    aiResults = await getAIEnrichment(bodyContent);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.error(`AI enrichment failed for ${inboxPath}: ${reason}`);
    logger.info(`Keeping original file in _inbox for manual retry: ${inboxPath}`);
    return 'failed';
  }

  try {
    messageProcessor.validateAiResults(aiResults);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.error(`AI result validation failed for ${inboxPath}: ${reason}`);
    logger.info(`Keeping original file in _inbox for manual retry: ${inboxPath}`);
    return 'failed';
  }
  
  // Create enriched front matter using the pure core logic
  const enrichedFrontMatter = messageProcessor.enrichMessage(
    { frontMatter, bodyContent },
    aiResults
  );
  
  // Generate new filename with AI title and timestamp
  const timestamp = new Date(frontMatter.timestamp || Date.now());
  const newFilename = `${aiResults.title}-${formatTimestamp(timestamp)}.md`;
  const outboxPath = path.join('inbox', newFilename);
  
  // Create new content
  const newContent = frontMatterCodec.stringify({
    frontMatter: enrichedFrontMatter,
    bodyContent,
  });
  
  // Write to inbox
  fs.writeFileSync(outboxPath, newContent, 'utf8');
  logger.info(`Created processed file: ${outboxPath}`);
  
  if (process.env.DEBUG === 'true') {
    logger.info(`AI Results: ${JSON.stringify(aiResults)}`);
    logger.info(`New filename: ${newFilename}`);
  }
  
  // Delete original file from _inbox
  fs.unlinkSync(inboxPath);
  logger.info(`Deleted original file: ${inboxPath}`);
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

function formatTimestamp(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) {
    throw new TypeError(`Cannot format invalid date value: ${value}`);
  }

  return (
    date.getUTCFullYear() + '-' +
    String(date.getUTCMonth() + 1).padStart(2, '0') + '-' +
    String(date.getUTCDate()).padStart(2, '0') + '-' +
    String(date.getUTCHours()).padStart(2, '0') + '-' +
    String(date.getUTCMinutes()).padStart(2, '0') + '-' +
    String(date.getUTCSeconds()).padStart(2, '0')
  );
}

// Run the processing
processMessages();
