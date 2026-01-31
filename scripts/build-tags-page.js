const fs = require("fs");
const path = require("path");

const inboxDir = path.join(__dirname, "..", "inbox");
const webDir = path.join(__dirname, "..", "web");

const files = fs.readdirSync(inboxDir).filter((f) => f.endsWith(".md"));

const tagCounts = new Map();

for (const file of files) {
  const content = fs.readFileSync(path.join(inboxDir, file), "utf8");
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) continue;

  const frontmatter = frontmatterMatch[1];

  // Extract tags - handles both array formats: ["a","b"] and - a\n- b
  const inlineMatch = frontmatter.match(/tags:\s*\[([^\]]+)\]/);
  if (inlineMatch) {
    const tags = inlineMatch[1].split(",").map((t) => t.trim().replace(/['"]/g, ""));
    for (const tag of tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  } else {
    const yamlArrayMatch = frontmatter.match(/tags:\n((?:\s+-\s+.+\n?)+)/);
    if (yamlArrayMatch) {
      const lines = yamlArrayMatch[1].split("\n").filter(Boolean);
      for (const line of lines) {
        const tag = line.replace(/^\s+-\s+/, "").trim().replace(/['"]/g, "");
        if (tag) tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }
  }
}

const sortedTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inbox Tags</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem;
      background: #f5f5f5;
    }
    h1 { margin-bottom: 0.5rem; }
    .stats { color: #666; margin-bottom: 2rem; }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .tag {
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 0.4rem 0.8rem;
      font-size: 0.9rem;
      cursor: default;
      transition: background 0.2s;
    }
    .tag:hover { background: #e8f4fc; }
    .tag .count {
      color: #888;
      font-size: 0.8rem;
      margin-left: 0.3rem;
    }
    #search {
      width: 100%;
      padding: 0.8rem;
      font-size: 1rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      margin-bottom: 1.5rem;
    }
  </style>
</head>
<body>
  <h1>Inbox Tags</h1>
  <p class="stats">${sortedTags.length} unique tags from ${files.length} files</p>
  <input type="text" id="search" placeholder="Filter tags..." autofocus>
  <div class="tags" id="tags">
${sortedTags.map(([tag, count]) => `    <span class="tag" data-tag="${tag}">${tag}<span class="count">${count}</span></span>`).join("\n")}
  </div>
  <script>
    const search = document.getElementById("search");
    const tags = document.querySelectorAll(".tag");
    search.addEventListener("input", () => {
      const q = search.value.toLowerCase();
      tags.forEach(tag => {
        tag.style.display = tag.dataset.tag.includes(q) ? "" : "none";
      });
    });
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(webDir, "tags.html"), html);
console.log(`Generated web/tags.html with ${sortedTags.length} tags`);
