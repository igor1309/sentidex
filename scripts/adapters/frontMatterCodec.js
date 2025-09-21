const matter = require('gray-matter');

function parse(fileContent) {
  const { data, content } = matter(fileContent);
  return { frontMatter: data, bodyContent: content.trim() };
}

function stringify({ frontMatter = {}, bodyContent = '' }) {
  return matter.stringify(bodyContent, frontMatter);
}

module.exports = { parse, stringify };
