const fs = require("fs");
const path = require("path");

// Canonical tags (these are valid and should be kept)
const CANONICAL_TAGS = new Set([
  "api", "backend", "cerebras", "chatbot", "cli", "design", "eval",
  "frontend", "gemini", "git", "github", "glm", "grok", "hr",
  "langfuse", "langgraph", "openai", "openrouter", "perplexity", "postgres",
  "proxy", "rag", "repo", "skills", "swift", "swiftui", "tdd", "telegram", "vps",
  // From original taxonomy
  "ai", "agents", "audio", "claude", "devops", "docker", "education",
  "image-gen", "llm", "mcp", "memory", "news", "open-source",
  "opinion", "productivity", "prompting", "research", "resource",
  "tutorial", "video-gen", "workflow", "writing", "business",
]);

// Map to canonical tags
const TAG_MAPPING = {
  // API
  "apify": "api",

  // OpenAI
  "chatgpt": "openai",
  "chatkit": "openai",
  "gpt4": "openai",
  "gpt-4": "openai",
  "gpt5": "openai",
  "gpt-5": "openai",

  // RAG
  "chroma": "rag",
  "embedding": "rag",

  // Eval
  "evaluation": "eval",
  "evaluations": "eval",

  // Design
  "figma": "design",

  // Skills
  "skill": "skills",
  "skillsmp": "skills",
  "superpowers": "skills",
  "openskills": "skills",
  "скиллов": "skills",

  // Git
  "workdir": "git",
  "worktrees": "git",

  // HR
  "резюме": "hr",
  "рекрутер": "hr",
  "собесах": "hr",

  // Repo
  "репозиторий": "repo",
  "репозитория": "repo",

  // Telegram
  "телеграм": "telegram",

  // Proxy
  "cliproxyapi": "proxy",

  // Claude
  "opus": "claude",

  // Postgres
  "postgresql": "postgres",

  // Russian translations
  "ии": "ai",
  "агент": "agents",
  "агентов": "agents",
  "промпт": "prompting",
  "промпты": "prompting",
  "гайд": "tutorial",
  "обзор": "opinion",
  "новости": "news",

  // English synonyms
  "prompts": "prompting",
  "prompt": "prompting",
  "oss": "open-source",
  "opensource": "open-source",
  "how-to": "tutorial",
  "howto": "tutorial",
};

// Noise tags to remove
const DROP_TAGS = new Set([
  // Dimensions/durations/numbers
  "108kb", "1660x1080", "1920x1172", "1file", "20b", "20s", "25790",
  "2678x1780", "2d", "3", "36s", "4s",
  // English noise
  "act", "adapter", "advent", "aeo", "allergy", "analytics", "ape",
  "app-build", "arena", "arxiv", "askuserquestiontool", "applicant",
  "appstore", "aqua", "architecture", "asr", "autogen", "blue", "bmc",
  "bounding", "bogdanisssimo", "browserbase", "builder", "bytes",
  "calendar", "canvas", "cc", "cgevent", "chrome", "collaboration",
  "communitynodes", "compose", "concurrency", "connectors", "cost",
  "csv", "cuda", "dataset", "debugging", "deck", "deep", "delegate",
  "devday", "developer", "developermode", "developers", "distortions",
  "dns", "emergence", "emotions", "excel", "exec", "exploration",
  "ezremove", "f5", "fathom", "features", "file", "filegen", "flow",
  "food", "forgetting", "founders", "fps", "g6gnb8u", "gamma", "gap",
  "ggsel", "gguf", "gimbal", "grep", "groq", "happenstance", "headless",
  "hetzner", "hooks", "htmx", "hub", "huggingface", "humanizer",
  "ingest", "instagram", "introspection", "ios", "json", "kanban",
  "kit", "kpis", "kursor", "languages", "leet", "livebench", "lmarena",
  "local-llm", "lovable", "ltx", "ollama", "mac", "maku", "manus", "mapkit",
  "markdown", "marketplace", "matreshka", "mdc", "mdx",
  "migration", "minimax", "mitmproxy", "mlx", "moltbot", "moltworker",
  "monity", "montazh", "mvp", "nano", "napkin", "nas", "neighbors",
  "ner", "neuralprofit", "node", "oauth", "observability", "obsidian",
  "obstacle", "ocr", "okrs", "operator", "options",
  "orchestrator", "os", "ota", "oura", "p", "pacing", "pagespeed",
  "pandas", "pandoc", "pat", "pdf", "pdfgrep",
  "perspectives", "picocss", "pinedrama", "plan", "poe",
  "preprocessing", "pro", "project", "prolego",
  "protocol", "pty", "pydantic", "python", "qdrant", "quality",
  "quickstart", "r2", "ray", "rclone", "react", "realtime",
  "realtimeapi", "reasoning", "recraft", "reddit", "reflection",
  "relationship", "rss", "ru", "rules", "runner", "rust", "saas",
  "safe", "sandbox", "saner", "save", "scanner", "scraping",
  "scratchpad", "script", "searxng", "seedream", "sgr", "shihipar",
  "shotgunpro", "silver", "size", "spec", "spiry", "stream",
  "subscription", "synthetic", "systemd", "tasks", "tavily",
  "tech", "templates", "termius", "testing", "thariq", "thinking",
  "thought", "tiktok", "timeline", "tmux", "token", "tokens", "tool",
  "trace", "trae", "twitt", "uber", "ugrep", "understanding",
  "unknown", "ux", "vaes", "vercel", "viral", "vlm", "watermark",
  "wb", "webrtc", "wispr", "wordpress", "worldbuilding", "xbox",
  "xml", "youtube", "zed",
  // Russian noise
  "автоматизировать", "аккуратно", "алгоритм", "амстердаме",
  "аналитикам", "антропики", "апскейлеры", "архитектура",
  "архитектурных", "банана", "банану", "батчами", "бедокуров",
  "бенчмарк", "библиотека", "бизнес", "бизнеса", "блокноты", "бот",
  "быстро", "вайбкод", "вайбкодинг", "векторный", "верстку", "видео",
  "вкладки", "восстановления", "всё", "геймдеве", "генерация",
  "генерациях", "глобальными", "годно", "готового", "гранты",
  "данных", "действовать", "делал", "денвер", "детских",
  "диаграммами", "диалог", "диалоге", "диалогов", "диаризация",
  "документация", "домен", "доступа", "журнал", "завтра", "задачи",
  "задеплоить", "застройщика", "защита", "зощенко", "иллюстраций",
  "инвесторов", "инсайт", "инструкций", "инструкция", "инструментов",
  "интервью", "исторические", "канала", "кандидата", "карпаты",
  "картами", "картинок", "категориям", "клиентами", "книги", "код",
  "кодексу", "кодинг", "кодов", "команда", "консилиум", "контекст",
  "контексту", "контент", "контрактов", "красиво", "креаторов",
  "критик", "курс", "лайфхаки", "личности", "лови", "магия",
  "макконахи", "марафон", "маркетплейс", "мартышкин", "менеджеров",
  "микродрам", "миллениалы", "мир", "моделировать", "молодёжь",
  "навигация", "нейросети", "облака", "облачные", "обновил",
  "обновление", "обфускацию", "объяснения", "огроооомная",
  "онбординг", "оплаты", "отзывов", "отчет", "оупенсорс", "ошибки",
  "паблишера", "памяти", "память", "папку", "парсинга", "паттерны",
  "периметра", "персонажей", "персонажи", "письма", "плагиата",
  "плагин", "плагинов", "плагины", "план", "плана", "подбор",
  "подписчиков", "подробности", "подхалимство", "поиск", "покупать",
  "пользователи", "помогает", "понять", "порядок", "постинг",
  "посты", "похвала", "правила", "правилами", "презентаций",
  "приватностью", "привычки", "признаки", "приложений", "проверка",
  "прогера", "проксей", "пропарсить", "прототипируем", "профиля",
  "прямоты", "психолог", "разбор", "режимы", "рерайтов", "роутингом",
  "руководителей", "сервисов", "симуляторы", "сканов", "скорость",
  "скрипт", "слайды", "слово", "смысл", "современных", "создания",
  "спойлер", "стартапу", "структура", "структуры", "сущности",
  "угодничество", "упорядочить", "уроков", "уточнения", "фактуру",
  "флоу", "хабр", "хакатоне", "хейтер", "хостинг", "ценность",
  "ценообразование", "шаблон", "эмоций", "юзкейсов", "язык",
  "яндекс", "японском",
  // Photo/media noise
  "photo", "sizes", "kb", "available", "duration", "resolution", "metadata",
]);

function extractTagsFromContent(content) {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return [];

  const frontmatter = frontmatterMatch[1];

  const inlineMatch = frontmatter.match(/tags:\s*\[([^\]]+)\]/);
  if (inlineMatch) {
    return inlineMatch[1].split(",").map((t) => t.trim().replace(/['"]/g, ""));
  }

  const yamlMatch = frontmatter.match(/tags:\n((?:\s+-\s+.+\n?)+)/);
  if (yamlMatch) {
    return yamlMatch[1]
      .split("\n")
      .filter(Boolean)
      .map((line) => line.replace(/^\s+-\s+/, "").trim().replace(/['"]/g, ""));
  }

  return [];
}

function extractTagsFromFile(filepath) {
  const content = fs.readFileSync(filepath, "utf8");
  return extractTagsFromContent(content);
}

function extractAllTags(inboxDir) {
  const files = fs.readdirSync(inboxDir).filter((f) => f.endsWith(".md"));
  const allTags = new Set();

  for (const file of files) {
    const tags = extractTagsFromFile(path.join(inboxDir, file));
    tags.forEach((tag) => allTags.add(tag.toLowerCase()));
  }

  return allTags;
}

function mapTag(tag) {
  const lower = tag.toLowerCase();

  // Drop noise
  if (DROP_TAGS.has(lower)) {
    return null;
  }

  // Map to canonical
  if (TAG_MAPPING.hasOwnProperty(lower)) {
    return TAG_MAPPING[lower];
  }

  // Already canonical
  if (CANONICAL_TAGS.has(lower)) {
    return lower;
  }

  // Unknown - keep as-is
  return lower;
}

function mapTags(tags) {
  const result = new Set();

  for (const tag of tags) {
    const mapped = mapTag(tag);
    if (mapped !== null) {
      result.add(mapped);
    }
  }

  return [...result].sort();
}

function getCanonicalTags() {
  return new Set(CANONICAL_TAGS);
}

function getMapping() {
  return { ...TAG_MAPPING };
}

function getDropTags() {
  return new Set(DROP_TAGS);
}

module.exports = {
  CANONICAL_TAGS,
  TAG_MAPPING,
  DROP_TAGS,
  extractTagsFromContent,
  extractTagsFromFile,
  extractAllTags,
  mapTag,
  mapTags,
  getCanonicalTags,
  getMapping,
  getDropTags,
};
