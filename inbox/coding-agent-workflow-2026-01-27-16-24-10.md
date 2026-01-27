---
id: mkwxndc7jeknlwmfrz
created_at: '2026-01-27T16:24:10.660Z'
source_info: Maxim E.
source_url: ''
has_media: false
language: mixed
summary: >-
  Встроенный скилл coding-agent для интерактивных CLI-агентов: запуск через
  exec/pty, мониторинг и безопасность.
tags:
  - exec
  - workdir
  - pty
  - git
  - repo
processed_at: '2026-01-27T18:31:32.167Z'
---
Там есть вот такой встроенный скилл. Вот объяснение от агента: 

`coding-agent` — да, он у меня есть (встроенный скилл в /usr/lib/node_modules/clawdbot/skills/coding-agent/).

Как он работает по сути:

• Это инструкционный скилл “bash-first”: он не добавляет магический tool, а задаёт правильный паттерн запуска внешних “кодинг-агентов” через exec + (для долгих задач) process.
• Он предназначен для управления интерактивными CLI-агентами:  • Codex CLI (codex)
  • Claude Code (claude)
  • OpenCode (opencode)
  • Pi Coding Agent (pi)

• Критичное правило: всегда запускать с pty:true, потому что это интерактивные TTY-приложения; без PTY они часто “ломаются”/виснут/портят вывод.
Основной рабочий паттерн:

1. Запуск в нужной папке:  • exec с workdir:<проект> и pty:true
  • если задача длинная — background:true, чтобы получить sessionId

2. Мониторинг/управление:  • process log/poll/write/submit/kill по sessionId

3. Для Codex важная деталь: ему часто нужен git repo (в скилле прямо предлагается git init в temp dir для “one-shot”).
Плюс скилл содержит “правила безопасности/гигиены” (например, не запускать Codex в ~/clawd/, чтобы он не читал системные файлы агента).

Если хочешь — могу прямо показать ключевые фрагменты SKILL.md (или кратко пересказать именно те части, которые ты используешь: background-сессии, авто-notify через clawdbot gateway wake, etc.).ckground-сессии, авто-notify через `clawdbot gateway wake`, etc.).
