---
date: 2026-03-01
model: claude-opus-4-6
description: "Design and implementation plan for migrating Telegram sends to ci-shared transport (issue #32)"
---

# Migrate Telegram Sends to ci-shared Transport — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace custom `fetch()` Telegram transport in `send-digest.js` and inline `curl` in `ci.yml` with ci-shared's `notify_telegram.sh`.

**Architecture:** Vendor `notify_telegram.sh` (with `TELEGRAM_PARSE_MODE` support from ci-shared#4, implemented as-if landed). Add thin local wrapper at `scripts/ci/notify_telegram.sh`. Node.js shells out via `execFileSync`; CI calls wrapper directly. Markdown-to-plain fallback stays in Node.js.

**Tech Stack:** Bash (shell scripts), Node.js (child_process.execFileSync), GitHub Actions YAML

---

## Context

- `vendor/ci-shared/scripts/` currently has only `run_silent.sh`
- `scripts/run_silent.sh` is a 5-line wrapper delegating to the vendored copy
- `send-digest.js:276-333` has custom `sendTelegram()` with `fetch()`, Markdown parse mode, and Markdown-to-plain retry
- `ci.yml:57-70` has inline curl with manual URL-encoding
- Test runner: Jest. No existing tests for `send-digest.js`.

## Call Sites

| Call site | Content | Parse mode |
|-----------|---------|------------|
| `send-digest.js:24` | empty inbox notification | Markdown |
| `send-digest.js:80` | daily/weekly digest | Markdown |
| `ci.yml:49-70` | CI build failure | Markdown |

---

### Task 1: Vendor `notify_telegram.sh` with parse_mode support

**Files:**
- Create: `vendor/ci-shared/scripts/notify_telegram.sh`

**Step 1: Create the vendored script**

Write `vendor/ci-shared/scripts/notify_telegram.sh` based on the current ci-shared version, adding `TELEGRAM_PARSE_MODE` env var support:

```bash
#!/usr/bin/env bash
# vendored-from-repo: https://github.com/igor1309/ci-shared
# vendored-from-path: scripts/notify_telegram.sh
# vendored-from-commit: pre-emptive (ci-shared#4 in-flight)
# vendored-on: 2026-03-01
# Telegram transport: send one or more message chunks to a bot/chat.
# Chunks are delivered sequentially in argument order. Fail-fast on
# first error; partial delivery is accepted.
#
# Usage: notify_telegram.sh <token> <chat_id> <chunk1> [chunk2...]
#
# Environment:
#   TELEGRAM_PARSE_MODE  – if set, adds parse_mode to API call
#                          (Markdown | MarkdownV2 | HTML)
#
# Caller is responsible for message formatting, splitting, and
# choosing which bot/chat to use.
set -euo pipefail

if [ "$#" -lt 3 ]; then
  echo "usage: notify_telegram.sh <token> <chat_id> <chunk1> [chunk2...]" >&2
  exit 2
fi

token="$1"
chat_id="$2"
shift 2

parse_mode_args=()
if [ -n "${TELEGRAM_PARSE_MODE:-}" ]; then
  parse_mode_args=(--data-urlencode "parse_mode=${TELEGRAM_PARSE_MODE}")
fi

for chunk in "$@"; do
  curl -fsS --connect-timeout 5 --max-time 20 \
    --retry 3 --retry-delay 1 --retry-all-errors \
    -X POST "https://api.telegram.org/bot${token}/sendMessage" \
    -d "chat_id=${chat_id}" \
    --data-urlencode "text=${chunk}" \
    "${parse_mode_args[@]}"
done
```

**Step 2: Make it executable**

Run: `chmod +x vendor/ci-shared/scripts/notify_telegram.sh`

**Step 3: Commit**

```
git add vendor/ci-shared/scripts/notify_telegram.sh
git commit -m "vendor notify_telegram.sh with parse_mode support"
```

---

### Task 2: Add local wrapper `scripts/ci/notify_telegram.sh`

**Files:**
- Create: `scripts/ci/notify_telegram.sh`

**Step 1: Create the wrapper script**

Follow the pattern of `scripts/run_silent.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec "$script_dir/../../vendor/ci-shared/scripts/notify_telegram.sh" "$@"
```

**Step 2: Make it executable**

Run: `chmod +x scripts/ci/notify_telegram.sh`

**Step 3: Verify wrapper delegates correctly**

Run: `./scripts/ci/notify_telegram.sh`
Expected: `usage: notify_telegram.sh <token> <chat_id> <chunk1> [chunk2...]` on stderr, exit code 2

**Step 4: Commit**

```
git add scripts/ci/notify_telegram.sh
git commit -m "add local wrapper for notify_telegram.sh"
```

---

### Task 3: Migrate `send-digest.js` transport to wrapper

**Files:**
- Modify: `scripts/send-digest.js:1` (add `child_process` require)
- Modify: `scripts/send-digest.js:276-333` (replace `sendTelegram` function)

**Step 1: Add `child_process` require at line 1**

Add `const { execFileSync } = require('child_process');` after the existing requires (line 2, after `path`).

Current (lines 1-2):
```javascript
const fs = require('fs');
const path = require('path');
```

New (lines 1-3):
```javascript
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
```

**Step 2: Replace `sendTelegram` function (lines 276-333)**

Replace the entire `sendTelegram` function with:

```javascript
function sendTelegram(botToken, chatId, message) {
  console.log('Sending message to Telegram...');
  console.log('Message preview:', message.substring(0, 200) + '...');

  const wrapper = path.join(__dirname, 'ci', 'notify_telegram.sh');

  try {
    execFileSync(wrapper, [botToken, chatId, message], {
      env: { ...process.env, TELEGRAM_PARSE_MODE: 'Markdown' },
      stdio: ['ignore', 'inherit', 'inherit'],
    });
  } catch {
    console.log('Retrying without Markdown...');
    const plainMessage = message
      .replace(/\*/g, '')
      .replace(/\\([_\[\]\(\)])/g, '$1');

    execFileSync(wrapper, [botToken, chatId, plainMessage], {
      stdio: ['ignore', 'inherit', 'inherit'],
    });
  }

  console.log('Message sent successfully');
}
```

Key changes:
- No longer `async` — `execFileSync` is synchronous
- `env` passes `TELEGRAM_PARSE_MODE: 'Markdown'` for the first attempt
- Fallback omits `TELEGRAM_PARSE_MODE` (inherits `process.env` without it)
- `stdio: ['ignore', 'inherit', 'inherit']` — no stdin, stdout/stderr pass through

**Step 3: Update callers from `await` to plain call**

The two call sites use `await sendTelegram(...)`. Since the function is no longer async, `await` on a non-thenable is harmless — no change needed at call sites.

**Step 4: Run existing tests**

Run: `npx jest`
Expected: All existing tests pass (no tests touch `sendTelegram`)

**Step 5: Commit**

```
git add scripts/send-digest.js
git commit -m "migrate send-digest.js transport to ci-shared wrapper"
```

---

### Task 4: Replace inline curl in `ci.yml`

**Files:**
- Modify: `.github/workflows/ci.yml:57-70`

**Step 1: Replace the `run` block in the notification step**

Current (lines 57-70):
```yaml
        run: |
          # Use a heredoc to safely create the multiline string.
          # Now, it references the simple shell variables defined in the 'env' block.
          MESSAGE_TEXT=$(cat <<-EOF
          🚨 *Build Failed:* [View Workflow Run](${GH_RUN_URL})
          EOF
          )

          # URL-encode the message text to handle newlines and special characters correctly.
          ENCODED_MESSAGE_TEXT=$(echo "$MESSAGE_TEXT" | awk -v ORS='%0A' '{ gsub(/&/, "\\&"); print }' | sed 's/ /%20/g')

          # Send the message using curl and the Telegram Bot API.
          # The '-s' flag makes curl silent (no progress meter).
          curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" -d "chat_id=${CHAT_ID}" -d "text=${ENCODED_MESSAGE_TEXT}" -d "parse_mode=Markdown"
```

New:
```yaml
        run: |
          TELEGRAM_PARSE_MODE=Markdown ./scripts/ci/notify_telegram.sh "$BOT_TOKEN" "$CHAT_ID" "🚨 *Build Failed:* [View Workflow Run](${GH_RUN_URL})"
```

The manual URL-encoding is no longer needed — `notify_telegram.sh` uses `--data-urlencode` which handles it.

**Step 2: Commit**

```
git add .github/workflows/ci.yml
git commit -m "replace inline curl with ci-shared wrapper in ci.yml"
```

---

### Task 5: Final verification and PR

**Step 1: Run full test suite**

Run: `npx jest`
Expected: All tests pass

**Step 2: Verify shell scripts are executable**

Run: `ls -la vendor/ci-shared/scripts/notify_telegram.sh scripts/ci/notify_telegram.sh`
Expected: Both have execute permission (`-rwxr-xr-x`)

**Step 3: Verify wrapper runs**

Run: `./scripts/ci/notify_telegram.sh 2>&1; echo "exit: $?"`
Expected: usage message, exit code 2

**Step 4: Create PR**

```
gh pr create --title "migrate telegram sends to ci-shared transport" --body "$(cat <<'EOF'
## Summary
- Vendor `notify_telegram.sh` from ci-shared with `TELEGRAM_PARSE_MODE` support (pre-emptive, ci-shared#4 in-flight)
- Add local wrapper `scripts/ci/notify_telegram.sh`
- Migrate `send-digest.js` transport from custom `fetch()` to `execFileSync` wrapper call
- Replace inline curl in `ci.yml` with wrapper call

Closes #32

## Test plan
- [ ] Existing tests pass (`npx jest`)
- [ ] Wrapper script runs and shows usage on no args
- [ ] CI workflow triggers correctly on next push
EOF
)"
```
