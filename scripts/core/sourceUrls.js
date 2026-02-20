function extractSourceUrls(frontMatter) {
  if (!frontMatter || typeof frontMatter !== 'object') {
    return [];
  }

  const urls = [];
  addStringUrl(urls, frontMatter.source_url);
  addArrayUrls(urls, frontMatter.source_urls);
  addNestedUrls(urls, frontMatter.forwarded_messages);
  addNestedUrls(urls, frontMatter.source_metadata);
  addNestedDebugUrls(urls, frontMatter.debug);

  return Array.from(new Set(urls));
}

function addNestedDebugUrls(target, debug) {
  if (!debug || typeof debug !== 'object') {
    return;
  }

  addArrayUrls(target, debug.source_urls);
  addNestedUrls(target, debug.forwarded_messages);
  addNestedUrls(target, debug.source_metadata);
}

function addArrayUrls(target, values) {
  if (!Array.isArray(values)) {
    return;
  }

  values.forEach((value) => {
    addStringUrl(target, value);
  });
}

function addNestedUrls(target, entries) {
  if (!Array.isArray(entries)) {
    return;
  }

  entries.forEach((entry) => {
    if (!entry || typeof entry !== 'object') {
      return;
    }

    addStringUrl(target, entry.source_url);
  });
}

function addStringUrl(target, value) {
  if (typeof value !== 'string') {
    return;
  }

  const normalized = value.trim();
  if (normalized === '') {
    return;
  }

  target.push(normalized);
}

module.exports = {
  extractSourceUrls,
};
