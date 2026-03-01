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
