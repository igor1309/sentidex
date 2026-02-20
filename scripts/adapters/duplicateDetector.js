const frontMatterCodec = require('./frontMatterCodec');
const { extractSourceUrls } = require('../core/sourceUrls');

// Adapter encapsulating duplicate detection logic against the inbox repository.

function findOriginalBySourceUrl(url, { fileSystem, directory }) {
  if (!url || typeof url !== 'string') {
    throw new TypeError('findOriginalBySourceUrl requires a non-empty url string');
  }

  const targetDirectory = directory || 'inbox';

  if (!fileSystem.exists(targetDirectory)) {
    return null;
  }

  const files = fileSystem.readdir(targetDirectory);
  for (const file of files) {
    if (!file.endsWith('.md') || file.startsWith('DUPL_')) {
      continue;
    }

    const filePath = fileSystem.join(targetDirectory, file);
    const content = fileSystem.readFile(filePath);
    const { frontMatter } = frontMatterCodec.parse(content);
    const sourceUrls = extractSourceUrls(frontMatter);

    if (sourceUrls.includes(url)) {
      return filePath;
    }
  }

  return null;
}

module.exports = {
  findOriginalBySourceUrl,
};
