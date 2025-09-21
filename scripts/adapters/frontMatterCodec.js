const matter = require('gray-matter');

function parse(fileContent) {
  const { data, content } = matter(fileContent);
  return { frontMatter: data, bodyContent: content.trim() };
}

function stringify({ frontMatter, bodyContent = '' }) {
  const lines = Object.entries(frontMatter || {}).map(([key, value]) => {
    if (typeof value === 'string') {
      return `${key}: "${value}"`;
    }
    if (Array.isArray(value) || (value && typeof value === 'object')) {
      return `${key}: ${JSON.stringify(value)}`;
    }
    return `${key}: ${value}`;
  });

  const frontMatterBlock = `---\n${lines.join('\n')}\n---`;
  if (bodyContent === '') {
    return `${frontMatterBlock}\n`;
  }
  return `${frontMatterBlock}\n\n${bodyContent}`;
}

module.exports = { parse, stringify };
