# Sentidex

Telegram-based message processing pipeline for content curation and AI-enhanced organization.

## Workflows

### Automated Pipeline

**Sentidex Intake** (GitHub Actions)
- Runs every 30 minutes automatically
- Orchestrates the complete message processing pipeline
- Combines polling → AI processing → repository updates

### Core Components

1. **Message Collection** (`poll-telegram.js`)
   - Polls Telegram bot for new messages
   - Processes forwarded messages and regular messages
   - Extracts metadata, links, and media information
   - Saves raw messages to `_inbox/` directory

2. **AI Processing** (`process-messages.js`)
   - Processes files from `_inbox/` using AI services
   - Enriches content with summaries, tags, and titles
   - Detects duplicates by source URL
   - Moves processed files to `inbox/` directory

3. **Digest Generation** (`send-digest.js`)
   - Generates daily (7 AM Moscow time) and weekly digests from processed messages
   - Sends formatted summaries back to Telegram
   - Supports message filtering by creation time

## Architectural Decisions

### Unified Repository (Monorepo)

Sentidex intentionally keeps its code and data (`inbox/`, `_inbox/`) in a single repository. This "repo-as-a-database" model simplifies the architecture, treating each git commit as an atomic transaction.

To keep the code history clean, automated commits are made by distinct "Bot" authors, separating them from human development commits. For more details, see the [Architectural Decision Record](./docs/adr-monorepo-decision.md).

## Development

### Testing

The project uses Jest to run a suite of characterization tests that validate the behavior of the core scripts.

To run the full test suite:
```bash
npm test
```

To update test snapshots:
```bash
npm test -- -u
```

### Tags Page

To regenerate the static tags page at `web/tags.html`:
```bash
node scripts/build-tags-page.js
```

### Continuous Integration (CI)

We have an automated CI pipeline defined in `.github/workflows/ci.yml`. This workflow provides a critical quality gate for the project.

-   **Trigger:** Runs automatically on every push and pull request to the `trunk` branch.
-   **Actions:**
    1.  Installs all dependencies from the lockfile (`npm ci`).
    2.  Runs the complete test suite via the `npm test` command. The CI runner environment defaults to the UTC timezone, ensuring consistent results.
-   **On Failure:** If any test fails, the build is blocked. A notification is sent to the project's Telegram bot with a direct link to the failed workflow run for immediate debugging.

## Usage

Forward messages to SentidexBot @Telegram using it as `inbox` address.

## Roadmap

See `plans/roadmap.md` for the upcoming improvements ordered by complexity.
