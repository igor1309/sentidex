---
id: mnfxcjej88t5xef2bff
created_at: '2026-04-01T08:42:21.000Z'
processed_at: '2026-04-01T10:50:08.827Z'
source_info: '@macTwoPosBot'
has_media: false
language: en
summary: >-
  Overview of a multi-tier tweet extraction and platform-research pipeline using
  FxTwitter, without API keys.
tags:
  - ai
  - llm
  - workflow
  - research
debug:
  message_ids:
    - 1156
  bundle_start_at: '2026-04-01T08:42:21.000Z'
  bundle_end_at: '2026-04-01T08:42:21.000Z'
  bundle_status: ambiguous
  forwarded_messages:
    - message_id: 1156
      timestamp: '2026-04-01T08:42:21.000Z'
      content: >-
        **1) **`fetch-tweet.sh`** — single tweet extraction**


        Takes a tweet URL → parses `{user}` and `{status_id}` from it (handles
        [x.com](x.com), [twitter.com](twitter.com),
        [vxtwitter.com](vxtwitter.com), [fxtwitter.com](fxtwitter.com) formats)
        → cascades through three tiers until one succeeds:


        ```

        Tier 1: curl https://api.fxtwitter.com/{user}/status/{id}
                → structured JSON, no auth, 10s timeout
                → gets: text, author, likes/retweets/replies/views,
                  media URLs, quote text, reply parent, X article body

        Tier 2: yt-dlp --dump-json {url}
                → fallback for media tweets only
                → loses: replies count, articles, quotes

        Tier 3: curl https://r.jina.ai/{url}
                → last resort, markdown blob
                → loses: all structured fields

        ```


        First success exits. No API keys at any tier.


        **2) Platform-research tweet discovery pipeline**


        ```

        Query "AI coding tools"
                │
                ▼
          Expand into 2-3 variants
          ("AI coding tools", "LLM code generation", "AI developer tools")
                │
                ▼
          For each variant, fire two searches in parallel:
            • GET google.com/search?q=site:x.com+{query}  (desktop Chrome UA)
            • POST html.duckduckgo.com/html/ body=site:x.com+{query}
                │
                ▼
          Regex-extract tweet URLs from HTML results
          Deduplicate across all variants
                │
                ▼
          For each unique URL, enrich via FxTwitter:
            curl https://api.fxtwitter.com/{user}/status/{id}
                │
                ▼
          Normalize into list of items:
            { text (300ch excerpt), author, date, likes, retweets,
              replies, media_urls, tweet_id, source: "fxtwitter" }

        ```


        Depth controls how many make it through: quick=5, default=15, deep=30.


        Both paths lean on the same free FxTwitter API as the core enrichment
        engine — no Twitter API keys, no OAuth, no cookies.
      source_info: '@macTwoPosBot'
      source_url: ''
      forward_date: '2026-04-01T08:22:01.000Z'
      has_media: false
      media_type: none
      forward_protected: false
  source_metadata:
    - message_id: 1156
      message_type: forward
      source_info: '@macTwoPosBot'
      source_url: ''
      forward_protected: false
  ambiguity_reason: orphan_forward
---
==== FORWARDS ====

---- Forward 1 (message_id: 1156) ----
Source: @macTwoPosBot

**1) **`fetch-tweet.sh`** — single tweet extraction**

Takes a tweet URL → parses `{user}` and `{status_id}` from it (handles [x.com](x.com), [twitter.com](twitter.com), [vxtwitter.com](vxtwitter.com), [fxtwitter.com](fxtwitter.com) formats) → cascades through three tiers until one succeeds:

```
Tier 1: curl https://api.fxtwitter.com/{user}/status/{id}
        → structured JSON, no auth, 10s timeout
        → gets: text, author, likes/retweets/replies/views,
          media URLs, quote text, reply parent, X article body

Tier 2: yt-dlp --dump-json {url}
        → fallback for media tweets only
        → loses: replies count, articles, quotes

Tier 3: curl https://r.jina.ai/{url}
        → last resort, markdown blob
        → loses: all structured fields

```

First success exits. No API keys at any tier.

**2) Platform-research tweet discovery pipeline**

```
Query "AI coding tools"
        │
        ▼
  Expand into 2-3 variants
  ("AI coding tools", "LLM code generation", "AI developer tools")
        │
        ▼
  For each variant, fire two searches in parallel:
    • GET google.com/search?q=site:x.com+{query}  (desktop Chrome UA)
    • POST html.duckduckgo.com/html/ body=site:x.com+{query}
        │
        ▼
  Regex-extract tweet URLs from HTML results
  Deduplicate across all variants
        │
        ▼
  For each unique URL, enrich via FxTwitter:
    curl https://api.fxtwitter.com/{user}/status/{id}
        │
        ▼
  Normalize into list of items:
    { text (300ch excerpt), author, date, likes, retweets,
      replies, media_urls, tweet_id, source: "fxtwitter" }

```

Depth controls how many make it through: quick=5, default=15, deep=30.

Both paths lean on the same free FxTwitter API as the core enrichment engine — no Twitter API keys, no OAuth, no cookies.
