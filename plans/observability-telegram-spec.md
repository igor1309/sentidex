—
title: “Hybrid Failure Alerts: GitHub Actions × Telegram”
status: draft
owner: observability
created: 2025-09-20
tags: [observability, logging, github-actions, alerts, telegram]
—

# Hybrid Failure Alerts: GitHub Actions × Telegram

## 1) Goals

- **Primary:** Immediate Telegram alerts for **failures** in production GitHub Actions runs.
- **Scope:** Keep alerts **brief** with just enough context to act (“little detail”). Logs remain in Actions.
- **Coverage:** Catch-all job failures **and** targeted critical errors inside the Node script.
- **Non-goals:** Not intended for success notifications, full log forwarding, or analytics.

## 2) Triggers (Hybrid)

- **A. Workflow-level (catch-all):** Send an alert when a job ends in a **failure**.
- **B. App-level (selective):** Inside `process-messages.js`, send alerts only for **known critical** error types (e.g., OpenAI API failures).

> Rationale: A ensures nothing is missed; B adds a tiny bit of context for high-value errors.  
> Duplicates are currently allowed; long-term, may merge A + B into a combined alert.

## 3) Alert Policy

- **Channel:** Telegram (existing bot).
- **Detail level:** Short message with key identifiers only.
- **De-duplication:** Include a unique **run key**. If both A and B fire for the same run, keep both but make them visually distinct.
- **Rate limiting:** Cap to **10 alerts/minute** per workflow (configurable via env).  
- **Retry:** Exponential backoff (up to 3 attempts), max ~1 minute delay, on Telegram 429/5xx.  
- **Privacy:** No PII. Redact long payloads and scrub secrets (e.g., API keys).

## 4) Secrets & Config

Store in **GitHub Actions Secrets**:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

Optional:
- `ALERTS_ENABLED` = `true|false` (feature flag)
- `ALERTS_THROTTLE_PER_MINUTE` = `10`

> Recommendation: use a consistent prefix (e.g., `ALERTS_`) for clarity. Rotate tokens at least quarterly.

## 5) Message Format (concise)

**Workflow-level (A):**