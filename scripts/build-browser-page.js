const fs = require("fs");
const path = require("path");

const inboxDir = path.join(__dirname, "..", "inbox");
const webDir = path.join(__dirname, "..", "web");

const files = fs.readdirSync(inboxDir).filter((f) => f.endsWith(".md"));

const tagCounts = new Map();
const fileData = [];

for (const file of files) {
  const content = fs.readFileSync(path.join(inboxDir, file), "utf8");
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) continue;

  const frontmatter = frontmatterMatch[1];

  const titleMatch = frontmatter.match(/title:\s*["']?([^"'\n]+)["']?/);
  const dateMatch = frontmatter.match(/date:\s*(\d{4}-\d{2}-\d{2})/);
  const summaryMatch = frontmatter.match(/summary:\s*["']?([^"'\n]+)["']?/);

  const title = titleMatch ? titleMatch[1].trim() : file;
  const date = dateMatch ? dateMatch[1] : "";
  const summary = summaryMatch ? summaryMatch[1].trim() : "";

  const fileTags = [];
  const inlineMatch = frontmatter.match(/tags:\s*\[([^\]]+)\]/);
  if (inlineMatch) {
    const tags = inlineMatch[1].split(",").map((t) => t.trim().replace(/['"]/g, ""));
    fileTags.push(...tags);
  } else {
    const yamlArrayMatch = frontmatter.match(/tags:\n((?:\s+-\s+.+\n?)+)/);
    if (yamlArrayMatch) {
      const lines = yamlArrayMatch[1].split("\n").filter(Boolean);
      for (const line of lines) {
        const tag = line.replace(/^\s+-\s+/, "").trim().replace(/['"]/g, "");
        if (tag) fileTags.push(tag);
      }
    }
  }

  for (const tag of fileTags) {
    tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
  }

  fileData.push({ file, title, date, tags: fileTags, summary });
}

const sortedTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]);
const sortedFiles = fileData.sort((a, b) => b.file.localeCompare(a.file));

const escapeHtml = (str) => str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inbox Browser</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      background: #f5f5f5;
    }
    h1 { margin-bottom: 0.5rem; }
    .stats { color: #666; margin-bottom: 0.5rem; }
    .note { color: #999; font-size: 0.85rem; margin-bottom: 1.5rem; }
    .note code { background: #e8e8e8; padding: 0.2rem 0.4rem; border-radius: 3px; }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }
    .tag {
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 0.4rem 0.8rem;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s;
      user-select: none;
    }
    .tag:hover { background: #e8f4fc; }
    .tag.selected { background: #0066cc; color: #fff; border-color: #0066cc; }
    .tag .count {
      color: #888;
      font-size: 0.8rem;
      margin-left: 0.3rem;
    }
    .tag.selected .count { color: #cce0ff; }
    #search {
      width: 100%;
      padding: 0.8rem;
      font-size: 1rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      margin-bottom: 1rem;
    }
    .clear-btn {
      background: #666;
      color: #fff;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      margin-bottom: 1rem;
      display: none;
    }
    .clear-btn:hover { background: #444; }
    .clear-btn.visible { display: inline-block; }
    table {
      width: 100%;
      border-collapse: collapse;
      background: #fff;
      border-radius: 4px;
      overflow: hidden;
    }
    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #eee;
    }
    th { background: #f9f9f9; font-weight: 600; }
    tr:hover { background: #f5f9fc; }
    .file-tags { display: flex; flex-wrap: wrap; gap: 0.25rem; }
    .file-tag {
      background: #e8e8e8;
      padding: 0.2rem 0.5rem;
      border-radius: 3px;
      font-size: 0.75rem;
    }
    .summary { color: #666; font-size: 0.9rem; max-width: 400px; }
    .no-results { padding: 2rem; text-align: center; color: #666; }
  </style>
</head>
<body>
  <h1>Inbox Browser</h1>
  <p class="stats">${sortedTags.length} tags, ${sortedFiles.length} files</p>
  <p class="note">Static page. Run <code>node scripts/build-browser-page.js</code> to update.</p>
  <input type="text" id="search" placeholder="Filter tags..." autofocus>
  <div class="tags" id="tags">
${sortedTags.map(([tag, count]) => `    <span class="tag" data-tag="${tag}">${tag}<span class="count">${count}</span></span>`).join("\n")}
  </div>
  <button class="clear-btn" id="clear">Clear selection</button>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Title</th>
        <th>Tags</th>
        <th>Summary</th>
      </tr>
    </thead>
    <tbody id="files">
${sortedFiles.map((f) => `      <tr data-tags="${f.tags.join(",")}">
        <td>${f.date}</td>
        <td>${escapeHtml(f.title)}</td>
        <td><div class="file-tags">${f.tags.map((t) => `<span class="file-tag">${t}</span>`).join("")}</div></td>
        <td class="summary">${escapeHtml(f.summary)}</td>
      </tr>`).join("\n")}
    </tbody>
  </table>
  <script>
    const search = document.getElementById("search");
    const tagsContainer = document.getElementById("tags");
    const clearBtn = document.getElementById("clear");
    const rows = document.querySelectorAll("#files tr");
    const tagElements = document.querySelectorAll(".tag");
    const selectedTags = new Set();

    function updateDisplay() {
      const q = search.value.toLowerCase();
      tagElements.forEach(tag => {
        tag.style.display = tag.dataset.tag.includes(q) ? "" : "none";
      });
      clearBtn.classList.toggle("visible", selectedTags.size > 0);
      rows.forEach(row => {
        const rowTags = row.dataset.tags.split(",").filter(Boolean);
        const matches = selectedTags.size === 0 || [...selectedTags].every(t => rowTags.includes(t));
        row.style.display = matches ? "" : "none";
      });
    }

    search.addEventListener("input", updateDisplay);

    tagsContainer.addEventListener("click", (e) => {
      const tag = e.target.closest(".tag");
      if (!tag) return;
      const tagName = tag.dataset.tag;
      if (selectedTags.has(tagName)) {
        selectedTags.delete(tagName);
        tag.classList.remove("selected");
      } else {
        selectedTags.add(tagName);
        tag.classList.add("selected");
      }
      updateDisplay();
    });

    clearBtn.addEventListener("click", () => {
      selectedTags.clear();
      tagElements.forEach(t => t.classList.remove("selected"));
      updateDisplay();
    });
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(webDir, "browser.html"), html);
console.log(`Generated web/browser.html with ${sortedTags.length} tags and ${sortedFiles.length} files`);
