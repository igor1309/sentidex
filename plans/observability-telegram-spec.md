---
title: "Hybrid Failure Alerts: GitHub Actions × Telegram"
status: draft
owner: observability
created: 2025-09-20
tags: [observability, logging, github-actions, alerts, telegram]
---

# Hybrid Failure Alerts: GitHub Actions × Telegram

## 1) Goals

- **Primary:** Immediate Telegram alerts for **failures** in production GitHub Actions runs.
- **Scope:** Keep alerts **brief** with just enough context to act (“little detail”). Logs remain in Actions.
- **Coverage:** Catch-all job failures **and** targeted critical errors inside the Node script.

## 2) Triggers (Hybrid)

- **A. Workflow-level (catch-all):** Send an alert when a job ends in a **failure**.
- **B. App-level (selective):** Inside `process-messages.js`, send alerts only for **known critical** error types (e.g., OpenAI API failures).

> Rationale: A ensures nothing is missed; B adds a tiny bit of context for high-value errors.

## 3) Alert Policy

- **Channel:** Telegram (existing bot).
- **Detail level:** Short message with key identifiers only.
- **De-duplication:** Include a unique **run key**. If both A and B fire for the same run, keep both but make them visually distinct.
- **Rate limiting:** Cap to **10 alerts/minute** per workflow. (Simple in-script throttle; workflow-level typically low volume.)
- **Retry:** Exponential backoff (up to 3 attempts) on Telegram 429/5xx.
- **Privacy:** No PII; redact long payloads.

## 4) Secrets & Config

Store in **GitHub Actions Secrets**:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

Optional:
- `ALERTS_ENABLED` = `true|false` (feature flag)
- `ALERTS_THROTTLE_PER_MINUTE` = `10`

## 5) Message Format (concise)

**Workflow-level (A):**
```
❌ {workflow}:{job} failed
run #{run_number} • {ref}@{sha_short}
url: {run_url}
```

**App-level (B):**
```
⚠️ critical error: {error_code or error_class}
run #{run_number} • {workflow}:{job}
hint: {hint or short message}
```

> Keep each to 1–3 lines; link back to run for details.

## 6) GitHub Actions: Add Failure Hook (A)

Add a final step that runs **only on failure**:

```yaml
# .github/workflows/process-messages.yml (snippet)
jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      # ... your existing steps

      - name: Telegram alert on failure
        if: ${{ failure() }}
        env:
          TG_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          TG_CHAT:  ${{ secrets.TELEGRAM_CHAT_ID }}
          GITHUB_SHA_SHORT: ${{ github.sha[0:7] }}
        run: |
          TEXT="❌ ${{ github.workflow }}:${{ github.job }} failed%0Arun #${{ github.run_number }} • ${{ github.ref }}@${{ env.GITHUB_SHA_SHORT }}%0Aurl: https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }}"
          curl -sS -X POST "https://api.telegram.org/bot${TG_TOKEN}/sendMessage"             -d "chat_id=${TG_CHAT}"             -d "text=${TEXT}"             -d "disable_web_page_preview=true"
```

Notes:
- Uses `if: failure()` so it won’t fire on success.
- URL points to the exact run.

## 7) App-Level Critical Alerts (B)

Add a small helper in `process-messages.js`:

```js
// telegram.js
const https = require('https');

function sendTelegram({ token, chatId, text }) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams({
      chat_id: chatId,
      text,
      disable_web_page_preview: 'true'
    }).toString();

    const req = https.request(
      {
        method: 'POST',
        hostname: 'api.telegram.org',
        path: `/bot${token}/sendMessage`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => (res.statusCode >= 200 && res.statusCode < 300 ? resolve() : reject(new Error(`TG ${res.statusCode}: ${data}`))));
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = { sendTelegram };
```

```js
// process-messages.js (snippet)
const { sendTelegram } = require('./telegram');

async function alertCritical(err, hint) {
  if (process.env.ALERTS_ENABLED !== 'true') return;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const run = `run #${process.env.GITHUB_RUN_NUMBER} • ${process.env.GITHUB_WORKFLOW}:${process.env.GITHUB_JOB}`;
  const short = err.code || err.name || 'error';
  const text = `⚠️ critical error: ${short}
${run}
hint: ${hint?.slice(0, 120) ?? 'see logs'}`;

  // simple throttle: at most 1 alert every 6s within this process
  if (!global.__last_alert_ts || Date.now() - global.__last_alert_ts > 6000) {
    global.__last_alert_ts = Date.now();
    try { await sendTelegram({ token, chatId, text }); } catch {}
  }
}

async function run() {
  try {
    // ... normal processing
  } catch (err) {
    // Example: only alert for critical sources (OpenAI/API failures)
    const isCritical = err?.isAxiosError || /openai|rate|429/i.test(String(err?.message));
    if (isCritical) await alertCritical(err, err.message);
    throw err; // preserve failure for Actions
  }
}

run().catch((e) => { process.exitCode = 1; });
```

## 8) Artifacts (Optional)

- Upload a compact JSONL (`alerts.jsonl`) with per-run summary (success/failed/duplicates). Useful for audits without adding a database.

```yaml
- name: Save run summary
  if: always()
  run: |
    printf '{{"run":%s,"status":"%s"}}\n' "${{ github.run_number }}" "${{ job.status }}" >> alerts.jsonl
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: run-alerts
    path: alerts.jsonl
```

## 9) Testing Plan

1. **Dry run:** Set `ALERTS_ENABLED=true`, point to a test chat. Inject a forced throw in the script to verify B.
2. **Workflow fail:** Add a failing step to verify A.
3. **Rate-limit:** Loop multiple critical errors quickly and verify throttle.
4. **Retry:** Temporarily block Telegram endpoint (use a proxy) to ensure retry works.
5. **Security:** Confirm tokens never printed in logs.

## 10) Rollout

- **Phase 1:** Enable only workflow-level alerts (A). Observe noise.
- **Phase 2:** Enable app-level critical alerts (B) with conservative criteria.
- **Phase 3:** Tune throttle and criteria; document common errors with known fixes.

## 11) Maintenance

- Keep the alert helper minimal and dependency-free.
- Review error criteria quarterly; adjust what’s “critical.”
- Rotate Telegram token periodically; restrict who can read secrets.
