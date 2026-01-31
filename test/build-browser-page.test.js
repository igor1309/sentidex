const { execSync } = require('child_process');
const path = require('path');

describe('build-browser-page script', () => {
  test('should generate browser page successfully', () => {
    const scriptPath = path.join(__dirname, '..', 'scripts', 'build-browser-page.js');

    const output = execSync(`node ${scriptPath}`, { encoding: 'utf8' });

    expect(output).toMatch(/Generated web\/browser\.html with \d+ tags and \d+ files/);
  });
});
