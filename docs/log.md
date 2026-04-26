# Log

## 2026-04-26

Cut CI runner costs: merge intake poll+process into one daily 8pm Moscow run (was 12×/day across 2 runners), reduce digest to weekly Sunday only with npm cache, drop `ls -R` debug step, skip CI on draft PRs.

## 2026-03-01

- Migrate Telegram sends to ci-shared `notify_telegram.sh` transport. Replace fetch-based HTTP in `send-digest.js` with `execFileSync` to vendored wrapper. Replace inline curl in CI workflow with wrapper call.

## 2026-02-20

Deliver message bundling in the processing pipeline to keep related updates together and reduce digest noise.
Refine bundle payloads: reuse bundled note hashtag tags, move `message_ids` under debug, and remove redundant metadata fields.
Stabilize bundle ordering with update-order timestamp tie-breakers and clarify handling for new-note edge cases.
Harden automation by reusing shared CI `run-silent`, installing dependencies in Telegram polling workflow, and refreshing web pages.

## 2026-02-01

Improve workflow rebase conflict resolution and capture follow-up TODO for remaining cases.

## 2026-01-31

Fix empty summaries by skipping media group followers without caption.
Add browser page with multi-select tag filtering.
Change prompt to include preferred tag taxonomy.
Clean up inbox tags: 622 → 55 unique tags (91% reduction).
Add tag taxonomy and scrips with web-page to review and clean-up tags.
Change file naming (timestamp as prefix) template.

## 2025-09-22

Налетел на лимиты GitHub по Actions (впервые ever), сделал репозиторий публичным.

## 2025-09-21

**Completed major refactoring of process-messages.js.**  
`Gemini 2.5 Pro` applied `Component Improvement Review Guideline` to produce a comprehensive review, then used `Tactical Action Plan Guideline` to generate focused, machine-readable plans. `Codex` executed these plans with Gemini reviewing execution (using `repo2md.sh` script). The first coding step was building a characterization harness — the codebase’s initial tests — providing a TDD safety net alongside a new CI workflow. Each atomic change was validated against this harness, progressively decoupling core logic from filesystem, logging, and parsing into a Ports & Adapters architecture. Outcome: clean layering, fast unit tests, and higher development velocity.

## 2025-09-20

Refactoring did introduced bugs.
Sort messages in digest.
Fix weekly header, remove bold summary formatting.
Refine the user prompt.
Improve AI processing resilience: keep failed files in `_inbox`, surface provider errors, and validate results explicitly.
Switch default provider to OpenAI, added failing mock provider for testing.
Fix git workflow to use explicit fetch+rebase instead of problematic pull fallback.
Add review follow-up plan and roadmap.

## 2025-09-06

Update prompts based on ChatGPT review.
Extract prompts from JavaScript constants to separate markdown files in PROMPTS subfolder for easier editing.
Daily digest now properly filters messages from last 24 hours using `created_at` from front matter.

## 2025-08-24

Fix scheduling, workflows and refactor ai components (included mock to simplify workflow testing).
Add AI request retry, refactor Telegram polling to use modern API.
Move docs from ai-collection repo.

## 2025-08-23

Создана и автоматизирована система сбора и обработки сообщений из Telegram.
