# Sentidex Review Follow-up Plan

## 1. Prevent Inbox Overwrites
- Add millisecond or message ID suffix to `_inbox` filenames in both message handlers.
- Verify new naming strategy keeps raw exports idempotent under concurrent updates.

## 2. Harden Front Matter Serialization
- Update `createFrontMatterString` to escape quotes/newlines or switch to a YAML library.
- Re-run parsing helpers to confirm summaries and titles with punctuation round-trip correctly.

## 3. Sanitize AI-Derived Filenames
- Normalize AI titles before use (kebab-case, strip unsafe characters).
- Add collision fallback when the target filename already exists in `inbox/`.

## 4. Rate-Limit Aware Retries
- Introduce a decorator-style helper that wraps provider calls to centralize retry/delay handling across OpenRouter, OpenAI, and future providers.
- Support provider-specific metadata (e.g., OpenRouter `x-ratelimit-reset`, OpenAI `Retry-After`) with sane fallbacks when headers are absent.
- Combine jittered exponential backoff for transient faults with explicit pauses when quotas reset, and keep `_inbox` messages untouched if processing halts.
