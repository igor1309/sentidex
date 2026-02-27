---
id: mm4vyr2yvdt0zlerzc
created_at: '2026-02-27T09:01:00.000Z'
processed_at: '2026-02-27T12:46:15.706Z'
source_info: Tips AI | IT & AI
source_url: 'https://t.me/tips_ai/4603'
has_media: true
language: mixed
summary: >-
  OpenClaw Claude Code добавлен Auto Memory, записывает данные проекта и
  архитектурные решения, индекс загружается сессиями
tags:
  - memory
  - openclaw
  - ai
  - api
debug:
  message_ids:
    - 950
  bundle_start_at: '2026-02-27T09:01:00.000Z'
  bundle_end_at: '2026-02-27T09:01:00.000Z'
  bundle_status: ambiguous
  forwarded_messages:
    - message_id: 950
      timestamp: '2026-02-27T09:01:00.000Z'
      content: "~~OpenClaw ~~Claude Code добавили [Auto Memory](https://code.claude.com/docs/en/memory)\n\nВключаешь по команде /memory и клод сам записывает всё что узнаёт о проекте: команды сборки, дебаг-техники, предпочтения по коду, архитектурные решения. \n\n[CLAUDE.md](CLAUDE.md) — останется твоими инструкциями, а [Memory.md](Memory.md) его блокнотом, который он сам ведёт и обновляет.\n\n[MEMORY.md](MEMORY.md) — это только индекс, сами детали Claude выносит в отдельные файлы: [debugging.md](debugging.md), [api-conventions.md](api-conventions.md) и так далее. \n\nВыглядит вот так:\n  ~/.claude/projects/<project>/memory/\n  ├── MEMORY.md          # индекс, грузится каждую сессию\n  ├── debugging.md       # паттерны отладки\n  ├── api-conventions.md # архитектурные решенияons.md](api-conventions.md) # архитектурные решения\n\nПри следующей сессии автоматически грузятся первые 200 строк [MEMORY.md](MEMORY.md). \n\nТематические файлы подгружаются по запросу не раздувают контекст без нужды.\n\n@tips_ai #news\n\n\U0001F3A5 **Video** (23s) - 1.1 MB - 1920x1080"
      source_info: Tips AI | IT & AI
      source_url: 'https://t.me/tips_ai/4603'
      forward_date: '2026-02-27T08:56:14.000Z'
      has_media: true
      media_type: video
      forward_protected: false
  source_metadata:
    - message_id: 950
      message_type: forward
      source_info: Tips AI | IT & AI
      source_url: 'https://t.me/tips_ai/4603'
      forward_protected: false
  ambiguity_reason: orphan_forward
---
==== FORWARDS ====

---- Forward 1 (message_id: 950) ----
Source: Tips AI | IT & AI

~~OpenClaw ~~Claude Code добавили [Auto Memory](https://code.claude.com/docs/en/memory)

Включаешь по команде /memory и клод сам записывает всё что узнаёт о проекте: команды сборки, дебаг-техники, предпочтения по коду, архитектурные решения. 

[CLAUDE.md](CLAUDE.md) — останется твоими инструкциями, а [Memory.md](Memory.md) его блокнотом, который он сам ведёт и обновляет.

[MEMORY.md](MEMORY.md) — это только индекс, сами детали Claude выносит в отдельные файлы: [debugging.md](debugging.md), [api-conventions.md](api-conventions.md) и так далее. 

Выглядит вот так:
  ~/.claude/projects/<project>/memory/
  ├── MEMORY.md          # индекс, грузится каждую сессию
  ├── debugging.md       # паттерны отладки
  ├── api-conventions.md # архитектурные решенияons.md](api-conventions.md) # архитектурные решения

При следующей сессии автоматически грузятся первые 200 строк [MEMORY.md](MEMORY.md). 

Тематические файлы подгружаются по запросу не раздувают контекст без нужды.

@tips_ai #news

🎥 **Video** (23s) - 1.1 MB - 1920x1080
