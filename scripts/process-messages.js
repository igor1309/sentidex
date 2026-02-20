const logger = require('./adapters/consoleLogger');
const duplicateDetector = require('./adapters/duplicateDetector');
const fileSystem = require('./adapters/fileSystem');
const formatTimestamp = require('./adapters/formatTimestamp');
const frontMatterCodec = require('./adapters/frontMatterCodec');
const messageProcessor = require('./core/messageProcessor');
const { extractSourceUrls } = require('./core/sourceUrls');
const { mapTag } = require('./lib/tags');
const { getAIEnrichment } = require('./services/ai.js');

async function processMessages() {
  logger.info('Starting message processing...');
  
  try {
    // Check if _inbox exists
    if (!fileSystem.exists('_inbox')) {
      logger.info('No _inbox directory found');
      return;
    }
    
    // Create inbox directory if it doesn't exist
    if (!fileSystem.exists('inbox')) {
      fileSystem.mkdir('inbox');
    }

    // Get all files from _inbox
    const inboxFiles = fileSystem.readdir('_inbox').filter(file => file.endsWith('.md'));
    logger.info(`Found ${inboxFiles.length} files to process`);
    
    if (inboxFiles.length === 0) {
      logger.info('No files to process in _inbox');
      return;
    }
    
    let processedCount = 0;
    let duplicateCount = 0;
    let failedCount = 0;
    
    for (const filename of inboxFiles) {
      const inboxPath = fileSystem.join('_inbox', filename);
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
  const content = fileSystem.readFile(inboxPath);
  
  // Parse front matter and content
  const { frontMatter, bodyContent } = frontMatterCodec.parse(content);
  
  if (process.env.DEBUG === 'true') {
    logger.info(`Original front matter: ${JSON.stringify(frontMatter, null, 2)}`);
    logger.info(`Body content preview: ${bodyContent.substring(0, 200)}...`);
  }

  const sourceUrls = extractSourceUrls(frontMatter);
  for (const sourceUrl of sourceUrls) {
    const originalFilePath = duplicateDetector.findOriginalBySourceUrl(sourceUrl, {
      fileSystem,
      directory: 'inbox',
    });

    if (originalFilePath) {
      logger.info(`Duplicate found for ${sourceUrl}. Original: ${originalFilePath}`);

      const originalFilename = fileSystem.basename(originalFilePath);
      const ticketFilename = `${formatTimestamp(new Date())}_DUPL.md`;
      const ticketPath = fileSystem.join('inbox', ticketFilename);

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

      fileSystem.writeFile(ticketPath, ticketContent);
      logger.info(`Created duplicate ticket: ${ticketPath}`);

      fileSystem.unlink(inboxPath);
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

  const enrichedAiResults = {
    ...aiResults,
    tags: mergeAiTagsWithNoteTags(aiResults.tags, bodyContent),
  };
  
  // Create enriched front matter using the pure core logic
  const enrichedFrontMatter = messageProcessor.enrichMessage(
    { frontMatter, bodyContent },
    enrichedAiResults
  );
  const preservedMetadata = extractPreservedMetadata(frontMatter, sourceUrls);
  const finalFrontMatter = {
    ...enrichedFrontMatter,
    ...preservedMetadata,
  };
  removeEmptyFields(finalFrontMatter);
  
  // Generate new filename with AI title and timestamp
  const timestamp = new Date(frontMatter.timestamp || Date.now());
  const newFilename = `${formatTimestamp(timestamp)}-${aiResults.title}.md`;
  const outboxPath = fileSystem.join('inbox', newFilename);
  
  // Create new content
  const newContent = frontMatterCodec.stringify({
    frontMatter: finalFrontMatter,
    bodyContent,
  });
  
  // Write to inbox
  fileSystem.writeFile(outboxPath, newContent);
  logger.info(`Created processed file: ${outboxPath}`);
  
  if (process.env.DEBUG === 'true') {
    logger.info(`AI Results: ${JSON.stringify(aiResults)}`);
    logger.info(`New filename: ${newFilename}`);
  }
  
  // Delete original file from _inbox
  fileSystem.unlink(inboxPath);
  logger.info(`Deleted original file: ${inboxPath}`);
  return 'processed';
}

function extractPreservedMetadata(frontMatter, sourceUrls) {
  if (!frontMatter || typeof frontMatter !== 'object') {
    return {};
  }

  const preservedMetadata = {};
  const debugMetadata = normalizeDebugMetadata(frontMatter);
  if (Object.keys(debugMetadata).length > 0) {
    preservedMetadata.debug = debugMetadata;
  }

  const bundleKeys = [
    'source_urls',
    // legacy compatibility for already-collected records
    'message_bundle',
    'bundle_start_at',
    'bundle_end_at',
    'forwarded_messages',
    'source_metadata',
    'bundle_status',
    'ambiguity_reason',
  ];

  bundleKeys.forEach((key) => {
    if (frontMatter[key] !== undefined) {
      preservedMetadata[key] = frontMatter[key];
    }
  });

  const primarySourceUrl = sourceUrls.length > 0 ? sourceUrls[0] : null;
  if (primarySourceUrl) {
    preservedMetadata.source_url = primarySourceUrl;
  }

  return preservedMetadata;
}

function normalizeDebugMetadata(frontMatter) {
  const debugMetadata = frontMatter.debug && typeof frontMatter.debug === 'object'
    ? { ...frontMatter.debug }
    : {};

  if (!Array.isArray(debugMetadata.message_ids) && Array.isArray(frontMatter.message_ids)) {
    debugMetadata.message_ids = frontMatter.message_ids;
  }

  return debugMetadata;
}

function removeEmptyFields(frontMatter) {
  if (typeof frontMatter.note_text === 'string') {
    delete frontMatter.note_text;
  }

  if (frontMatter.source_url === '') {
    delete frontMatter.source_url;
  }

  if (Array.isArray(frontMatter.source_urls) && frontMatter.source_urls.length <= 1) {
    delete frontMatter.source_urls;
  }
}

function mergeAiTagsWithNoteTags(aiTags, bodyContent) {
  if (!Array.isArray(aiTags)) {
    return [];
  }

  const noteTags = extractHashtagsFromBundleNote(bodyContent);
  if (noteTags.length === 0) {
    return aiTags;
  }

  const mergedTags = [...aiTags];
  const knownTags = new Set(
    aiTags
      .map((tag) => normalizeTag(tag))
      .filter((tag) => tag !== null),
  );

  noteTags.forEach((noteTag) => {
    if (knownTags.has(noteTag)) {
      return;
    }

    knownTags.add(noteTag);
    mergedTags.push(noteTag);
  });

  return mergedTags;
}

function extractHashtagsFromBundleNote(bodyContent) {
  if (typeof bodyContent !== 'string' || bodyContent.trim() === '') {
    return [];
  }

  const noteSectionMatch = bodyContent.match(
    /==== NOTE ====\r?\n\r?\n([\s\S]*?)(?:\r?\n\r?\n==== FORWARDS ====|$)/,
  );

  if (!noteSectionMatch || typeof noteSectionMatch[1] !== 'string') {
    return [];
  }

  const noteSection = noteSectionMatch[1];
  const hashtagMatches = noteSection.match(/#([\p{L}\p{N}_-]+)/gu);

  if (!Array.isArray(hashtagMatches)) {
    return [];
  }

  const noteTags = [];
  const seen = new Set();

  hashtagMatches.forEach((hashtag) => {
    const normalizedTag = normalizeTag(hashtag.slice(1));
    if (normalizedTag === null || seen.has(normalizedTag)) {
      return;
    }

    seen.add(normalizedTag);
    noteTags.push(normalizedTag);
  });

  return noteTags;
}

function normalizeTag(tag) {
  if (typeof tag !== 'string') {
    return null;
  }

  const trimmedTag = tag.trim().replace(/^#/, '');
  if (trimmedTag === '') {
    return null;
  }

  const mappedTag = mapTag(trimmedTag);
  if (typeof mappedTag !== 'string' || mappedTag.trim() === '') {
    return null;
  }

  return mappedTag;
}

// Run the processing
processMessages();
