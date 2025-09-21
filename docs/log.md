# Log

## 2025-09-21

Completed a major architectural refactoring of `process-messages.js` driven by a formal component review created using `Component Improvement Review Guideline.md`. The process followed a strict, test-driven methodology for safely modifying legacy code.

`Tactical Action Plan Guideline.md` used to create focused plans for AI coding agent.

First, a comprehensive characterization harness was built to capture the script's existing behavior without any production code changes. This safety net, along with a new CI workflow, provided a stable foundation for all subsequent work.

The refactoring itself was guided by a series of atomic, machine-readable plans. Each small, incremental change was validated against the complete test harness, ensuring no regressions were introduced. This disciplined process successfully decoupled the core logic from its external dependencies (filesystem, logging, parsing), transforming the monolithic script into a clean, layered application based on the Ports and Adapters pattern.

Finally, the new architecture was leveraged to add a suite of fast unit tests for the core business logic, improving future development velocity.

Codex as executor Gemini 2.5 Pro as Reviewer.

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
