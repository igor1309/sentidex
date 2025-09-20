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

## Usage

Forward messages to SentidexBot @Telegram using it as `inbox` address.

## Roadmap

See `docs/roadmap.md` for the upcoming improvements ordered by complexity.
