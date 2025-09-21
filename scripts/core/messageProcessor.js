// Core message processing utilities used by message ingestion scripts.

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function detectLanguage(content) {
  const safeContent = typeof content === 'string' ? content : '';
  const hasRussian = /[а-яё]/i.test(safeContent);
  const hasEnglish = /[a-z]/i.test(safeContent);

  if (hasRussian && hasEnglish) return 'mixed';
  if (hasRussian) return 'ru';
  if (hasEnglish) return 'en';
  return 'unknown';
}

function validateAiResults(aiResults) {
  if (!aiResults || typeof aiResults !== 'object') {
    throw new TypeError('enrichMessage requires a non-empty aiResults object');
  }

  const { summary, tags } = aiResults;

  if (typeof summary !== 'string' || summary.trim() === '') {
    throw new Error('AI summary must be a non-empty string');
  }

  if (!Array.isArray(tags)) {
    throw new Error('AI tags must be an array');
  }
}

function enrichMessage(rawMessage, aiResults) {
  validateAiResults(aiResults);

  const safeMessage = rawMessage && typeof rawMessage === 'object' ? rawMessage : {};
  const frontMatter = safeMessage.frontMatter && typeof safeMessage.frontMatter === 'object'
    ? safeMessage.frontMatter
    : {};
  const bodyContent = typeof safeMessage.bodyContent === 'string'
    ? safeMessage.bodyContent
    : '';

  const createdAt = frontMatter.timestamp || new Date().toISOString();
  const processedAt = new Date().toISOString();

  return {
    id: frontMatter.id || generateId(),
    created_at: createdAt,
    source_info: frontMatter.source_info || 'unknown',
    source_url: frontMatter.source_url || '',
    has_media: frontMatter.has_media || false,
    language: detectLanguage(bodyContent),
    summary: aiResults.summary,
    tags: aiResults.tags,
    processed_at: processedAt,
  };
}

module.exports = {
  enrichMessage,
  generateId,
  detectLanguage,
  validateAiResults,
};
