const path = require("path");
const { extractAllTags, mapTag, getMapping } = require("./lib/tags");

const inboxDir = path.join(__dirname, "..", "inbox");

// Extract all unique tags
const allTags = extractAllTags(inboxDir);
const sortedTags = [...allTags].sort();

console.log(`Found ${sortedTags.length} unique tags\n`);

// Group by mapping result
const kept = [];
const mapped = [];
const removed = [];

for (const tag of sortedTags) {
  const result = mapTag(tag);

  if (result === null) {
    removed.push(tag);
  } else if (result !== tag) {
    mapped.push({ from: tag, to: result });
  } else {
    kept.push(tag);
  }
}

// Print results
if (mapped.length > 0) {
  console.log("=== MAPPED ===");
  for (const { from, to } of mapped) {
    console.log(`  ${from} → ${to}`);
  }
  console.log();
}

if (removed.length > 0) {
  console.log("=== REMOVED (noise) ===");
  for (const tag of removed) {
    console.log(`  ${tag}`);
  }
  console.log();
}

console.log("=== KEPT AS-IS ===");
for (const tag of kept) {
  console.log(`  ${tag}`);
}

console.log(`\n--- Summary ---`);
console.log(`Mapped: ${mapped.length}`);
console.log(`Removed: ${removed.length}`);
console.log(`Kept: ${kept.length}`);
console.log(`Total: ${sortedTags.length}`);
