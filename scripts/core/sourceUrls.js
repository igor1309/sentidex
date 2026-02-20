function extractSourceUrls(frontMatter) {
  if (!frontMatter || typeof frontMatter !== 'object') {
    return [];
  }

  const urls = [];
  addStringUrl(urls, frontMatter.source_url);
  addArrayUrls(urls, frontMatter.source_urls);
  addNestedUrls(urls, frontMatter.forwarded_messages);
  addNestedUrls(urls, frontMatter.source_metadata);

  return Array.from(new Set(urls));
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
