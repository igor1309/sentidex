---
date: 2026-02-01
model: gpt-5
description: "Review notes and follow-ups for process-messages rebase conflict handling."
---
# Process Messages Rebase TODO

## Summary
- Capture review concerns about automated rebase conflict resolution in the process-messages workflow.

## Findings
- Potential data loss in `_inbox` conflicts: current strategy keeps local (`--ours`) which may overwrite upstream `_inbox` files added by polling.
- Potential data loss in `inbox` conflicts: current strategy keeps upstream (`--theirs`) which may drop newly processed outputs from the local commit.
- `rebase --skip` on empty staged changes may silently discard a processing commit without visibility into whether changes were expected.

## Questions
- Should upstream `_inbox` always win over local during conflicts, or should local always win?
- Are processed `inbox` files append-only, or should upstream dedupe be authoritative?

## Risks and Testing Gaps
- No CI replay of real rebase conflicts to validate conflict policy and ensure no data loss.

## Next Steps
- Define conflict resolution policy for `_inbox` and `inbox` explicitly.
- Add CI scenario or manual test to simulate concurrent poll/process runs and verify resolution behavior.
