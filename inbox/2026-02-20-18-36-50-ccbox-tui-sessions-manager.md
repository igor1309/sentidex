---
id: mlv9dg1yrvo24111oma
created_at: '2026-02-20T18:36:50.766Z'
source_info: Aleksei
source_url: ''
has_media: false
language: mixed
summary: >-
  TUI-менеджер локальных сессий кодинг-агентов с индексацией, таймлайном и
  статистикой.
tags:
  - local-llm
  - ai-coding
  - agents
  - workflow
processed_at: '2026-02-20T19:03:54.502Z'
---
ccbox -- TUI-менеджер сессий кодинг-агентов

  Rust-приложение для терминала, которое индексирует и показывает локальные сессии Codex CLI, Claude Code и Gemini CLI в едином интерфейсе.

  Что делает:
  - Браузер проектов и сессий с поиском и фильтрацией по движку
  - Таймлайн сессии: промпты, tool calls, результаты, контекст -- все в хронологическом порядке
  - Статистика: токены, длительность, использование инструментов, apply_patch changes
  - Fork/resume сессии Codex с произвольного места в таймлайне
  - Запуск новых сессий (Pipes/TTY режимы) с attach/detach
  - CLI-режим для скриптов: ccbox projects, ccbox sessions, ccbox history
  - Self-update через GitHub Releases
  - Агент-скилл для Codex/Claude/Gemini -- агент сам может инспектировать свои прошлые сессии

  Стек: Rust, Ratatui, SQLite. Работает на macOS, Linux, Windows.

  Установка:
  brew tap diskd-ai/ccbox && brew install ccbox

  GitHub: [https://github.com/diskd-ai/ccbox](https://github.com/diskd-ai/ccbox)
  Лицензия: MIT

  #opensource
