const fs = require("fs");
const path = require("path");
const { extractTagsFromFile, mapTags } = require("./lib/tags");

const inboxDir = path.join(__dirname, "..", "inbox");
const files = fs.readdirSync(inboxDir).filter((f) => f.endsWith(".md"));

let filesUpdated = 0;

for (const file of files) {
  const filepath = path.join(inboxDir, file);
  let content = fs.readFileSync(filepath, "utf8");

  const frontmatterMatch = content.match(/^(---\n)([\s\S]*?)(\n---)/);
  if (!frontmatterMatch) continue;

  const [fullMatch, start, frontmatter, end] = frontmatterMatch;

  const oldTags = extractTagsFromFile(filepath);
  if (oldTags.length === 0) continue;

  const newTags = mapTags(oldTags);

  // Check if tags changed
  const oldSorted = [...oldTags].map((t) => t.toLowerCase()).sort().join(",");
  const newSorted = newTags.join(",");

  if (oldSorted === newSorted) continue;

  // Update frontmatter with new tags in YAML array format
  const newTagsYaml = "tags:\n" + newTags.map((t) => `  - ${t}`).join("\n");

  let newFrontmatter;
  const inlineMatch = frontmatter.match(/tags:\s*\[[^\]]+\]/);
  if (inlineMatch) {
    newFrontmatter = frontmatter.replace(/tags:\s*\[[^\]]+\]/, newTagsYaml);
  } else {
    newFrontmatter = frontmatter.replace(/tags:\n(?:\s+-\s+.+\n?)+/, newTagsYaml + "\n");
  }

  const newContent = start + newFrontmatter + end + content.slice(fullMatch.length);
  fs.writeFileSync(filepath, newContent);
  filesUpdated++;

  console.log(`${file}`);
  console.log(`  - ${oldTags.join(", ")}`);
  console.log(`  + ${newTags.join(", ")}`);
}

console.log(`\nUpdated ${filesUpdated} files`);
