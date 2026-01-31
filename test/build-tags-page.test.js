const { execSync } = require('child_process');
const path = require('path');

describe('build-tags-page script', () => {
  test('should generate tags page successfully', () => {
    const scriptPath = path.join(__dirname, '..', 'scripts', 'build-tags-page.js');

    const output = execSync(`node ${scriptPath}`, { encoding: 'utf8' });

    expect(output).toMatch(/Generated web\/tags\.html with \d+ tags/);
  });
});
