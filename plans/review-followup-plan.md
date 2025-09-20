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
