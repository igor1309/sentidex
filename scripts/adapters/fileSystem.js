const fs = require('fs');
const path = require('path');

// Adapter providing file system operations used by the message processor.

function exists(filePath) {
  return fs.existsSync(filePath);
}

function mkdir(dirPath) {
  return fs.mkdirSync(dirPath, { recursive: true });
}

function readdir(dirPath) {
  return fs.readdirSync(dirPath);
}

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeFile(filePath, content) {
  return fs.writeFileSync(filePath, content, 'utf8');
}

function unlink(filePath) {
  return fs.unlinkSync(filePath);
}

module.exports = {
  exists,
  mkdir,
  readdir,
  readFile,
  writeFile,
  unlink,
  join: path.join,
  basename: path.basename,
};
