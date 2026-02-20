const { getAIEnrichment } = require('./services/ai.js');
const duplicateDetector = require('./adapters/duplicateDetector');
const fileSystem = require('./adapters/fileSystem');
const formatTimestamp = require('./adapters/formatTimestamp');
const frontMatterCodec = require('./adapters/frontMatterCodec');
const logger = require('./adapters/consoleLogger');
const messageProcessor = require('./core/messageProcessor');
const { bundleFiles } = require('./core/messageBundler');

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

    // Parse all files
    const parsedFiles = [];
    for (const filename of inboxFiles) {
      const inboxPath = fileSystem.join('_inbox', filename);
      try {
        const content = fileSystem.readFile(inboxPath);
        const { frontMatter, bodyContent } = frontMatterCodec.parse(content);
        parsedFiles.push({ filename, path: inboxPath, frontMatter, bodyContent });
      } catch (error) {
        logger.info(`Processing file: ${filename}`);
        logger.error(`Error processing ${filename}: ${error.message}`);
        failedCount++;
      }
    }

    // Bundle files
    const items = bundleFiles(parsedFiles);

    for (const item of items) {
      try {
        let result;
        if (item.type === 'bundle' && item.note && item.forwards.length > 0) {
          // Note + forwards → process as bundle
          logger.info(`Processing bundle: note ${item.note.filename} + ${item.forwards.length} forward(s)`);
          result = await processBundle(item);
        } else if (item.type === 'bundle' && item.note && item.forwards.length === 0) {
          // Note-only bundle → process as individual file
          logger.info(`Processing file: ${item.note.filename}`);
          result = await processFile(item.note);
        } else if (item.type === 'bundle' && !item.note) {
          // Ambiguous bundle (forwards without note) → process each forward individually
          for (const fwd of item.forwards) {
            logger.info(`Processing file: ${fwd.filename} (unbundled forward)`);
            const fwdResult = await processFile(fwd);
            if (fwdResult === 'processed') processedCount++;
            else if (fwdResult === 'duplicate') duplicateCount++;
            else if (fwdResult === 'failed') failedCount++;
          }
          continue;
        } else {
          // Other → process individually
          logger.info(`Processing file: ${item.file.filename}`);
          result = await processFile(item.file);
        }

        if (result === 'processed') processedCount++;
        else if (result === 'duplicate') duplicateCount++;
        else if (result === 'failed') failedCount++;
      } catch (error) {
        logger.error(`Error processing item: ${error.message}`);
        failedCount++;
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

async function processFile(parsed) {
  const { frontMatter, bodyContent } = parsed;
  const inboxPath = parsed.path;

  if (process.env.DEBUG === 'true') {
    logger.info(`Original front matter: ${JSON.stringify(frontMatter, null, 2)}`);
    logger.info(`Body content preview: ${bodyContent.substring(0, 200)}...`);
  }

  const sourceUrl = frontMatter.source_url;
  if (sourceUrl && sourceUrl !== '') {
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

  // Create enriched front matter using the pure core logic
  const enrichedFrontMatter = messageProcessor.enrichMessage(
    { frontMatter, bodyContent },
    aiResults
  );

  // Generate new filename with AI title and timestamp
  const timestamp = new Date(frontMatter.timestamp || Date.now());
  const newFilename = `${formatTimestamp(timestamp)}-${aiResults.title}.md`;
  const outboxPath = fileSystem.join('inbox', newFilename);

  // Create new content
  const newContent = frontMatterCodec.stringify({
    frontMatter: enrichedFrontMatter,
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

async function processBundle(bundle) {
  const allFiles = [bundle.note, ...bundle.forwards];
  const allPaths = allFiles.map(f => f.path);

  // Check for duplicates across all source_urls in the bundle
  for (const file of allFiles) {
    const sourceUrl = file.frontMatter.source_url;
    if (sourceUrl && sourceUrl !== '') {
      const originalFilePath = duplicateDetector.findOriginalBySourceUrl(sourceUrl, {
        fileSystem,
        directory: 'inbox',
      });
      if (originalFilePath) {
        logger.info(`Duplicate found in bundle for ${sourceUrl}. Original: ${originalFilePath}`);

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

        // Delete all source files and return
        for (const p of allPaths) {
          fileSystem.unlink(p);
        }
        return 'duplicate';
      }
    }
  }

  // Combine body content: note text + forward sections
  let combinedBody = bundle.note.bodyContent;
  for (const fwd of bundle.forwards) {
    combinedBody += '\n\n---\n\n';
    const source = fwd.frontMatter.source_info || 'Unknown';
    combinedBody += `**Source: ${source}**\n\n`;
    combinedBody += fwd.bodyContent;
  }

  // AI Enrichment on combined content
  let aiResults;
  try {
    aiResults = await getAIEnrichment(combinedBody);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.error(`AI enrichment failed for bundle: ${reason}`);
    logger.info('Keeping bundle files in _inbox for manual retry');
    return 'failed';
  }

  try {
    messageProcessor.validateAiResults(aiResults);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.error(`AI result validation failed for bundle: ${reason}`);
    logger.info('Keeping bundle files in _inbox for manual retry');
    return 'failed';
  }

  // Enrich front matter based on the note
  const enrichedFrontMatter = messageProcessor.enrichMessage(
    { frontMatter: bundle.note.frontMatter, bodyContent: combinedBody },
    aiResults
  );

  // Add bundle-specific metadata
  enrichedFrontMatter.bundle = true;
  enrichedFrontMatter.bundle_status = bundle.status;
  enrichedFrontMatter.bundle_size = 1 + bundle.forwards.length;
  enrichedFrontMatter.forwards = bundle.forwards.map(fwd => ({
    source_info: fwd.frontMatter.source_info,
    source_url: fwd.frontMatter.source_url,
    forward_date: fwd.frontMatter.forward_date,
    has_media: fwd.frontMatter.has_media,
    media_type: fwd.frontMatter.media_type,
  }));

  // Generate filename from note timestamp + AI title
  const timestamp = new Date(bundle.note.frontMatter.timestamp || Date.now());
  const newFilename = `${formatTimestamp(timestamp)}-${aiResults.title}.md`;
  const outboxPath = fileSystem.join('inbox', newFilename);

  const newContent = frontMatterCodec.stringify({
    frontMatter: enrichedFrontMatter,
    bodyContent: combinedBody,
  });

  fileSystem.writeFile(outboxPath, newContent);
  logger.info(`Created bundled file: ${outboxPath}`);

  if (process.env.DEBUG === 'true') {
    logger.info(`Bundle AI Results: ${JSON.stringify(aiResults)}`);
    logger.info(`Bundle filename: ${newFilename}`);
  }

  // Delete all source files from _inbox
  for (const p of allPaths) {
    fileSystem.unlink(p);
    logger.info(`Deleted source file: ${p}`);
  }

  return 'processed';
}

// Run the processing
processMessages();
