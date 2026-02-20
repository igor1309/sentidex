---
id: mltww9pxzgw926sbejs
created_at: '2026-02-19T18:43:26.108Z'
source_info: AI Product | Igor Akimov
source_url: 'https://t.me/ai_product/1953'
has_media: false
language: mixed
summary: >-
  Использование multi-agent режима в Codex CLI: создание саб-агентов,
  оркестрация и консолидация вывода.
tags:
  - ai
  - agents
  - llm
  - openai
processed_at: '2026-02-19T20:26:51.573Z'
---
О, в Codex CLI завезли multi-agent режим, можно реально “распараллелить мозги” на одну задачу.

Может создавать несколько специализированных саб-агентов параллельно и потом собирать их вывод в один общий ответ. Особенно полезно для задач, которые легко делятся: explore кодовой базы, ревью, планирование фичи на шаги, поиск багов и т.д.
Можно описать свои роли агентов и для каждой роли задать свою модель/инструкции/режим sandbox.

Как включить:
В CLI: /experimental → включить Multi-agents → перезапустить Codex
Или флагом в конфиге ~/.codex/config.toml:
[features]
multi_agent = true

Пока multi-agent активность видна именно в CLI. В Codex app / IDE extension “скоро”.

Как это работает в процессе
Codex сам делает оркестрацию: создает саб-агентов, прокидывает уточнения, ждёт результаты, закрывает треды.
Когда агентов много – ждёт всех и отдаёт консолидированный ответ. Можно и вручную просить “spawn N agents”, и он сам решит когда надо.

Пример из доки: задаёшь ревью PR и просишь по одному агенту на пункт:
security
code quality
bugs
race
test flakiness
maintainability

Командой /agent переключаться между тредами, смотреть что происходит.

Есть встроенные роли: default, worker, explorer.
И можно на роль переопределять ключевые штуки: model, model_reasoning_effort, sandbox_mode, developer_instructions.

Ссылка на доку: [https://developers.openai.com/codex/multi-agent](https://developers.openai.com/codex/multi-agent)
