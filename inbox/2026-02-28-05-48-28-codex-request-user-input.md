---
id: mm61zwx6wru2athfa9k
created_at: '2026-02-28T05:48:28.000Z'
processed_at: '2026-02-28T08:22:53.802Z'
source_info: 'Поляков считает: AI, код и кейсы'
source_url: 'https://t.me/countwithsasha/506'
has_media: true
language: mixed
summary: >-
  Codex доступ к запросам пользователя во время выполнения через
  functions.request_user_input
tags:
  - ai
  - ai-coding
  - llm
  - openai
debug:
  message_ids:
    - 953
  bundle_start_at: '2026-02-28T05:48:28.000Z'
  bundle_end_at: '2026-02-28T05:48:28.000Z'
  bundle_status: ambiguous
  forwarded_messages:
    - message_id: 953
      timestamp: '2026-02-28T05:48:28.000Z'
      content: "**В полку фанатов Codex маленький праздник: завезли тул для вопросов**\n\n*Еще codex spark модели принесли всем подписчикам, раньше были доступны только за $200, но сейчс не об этом.*\n*UPD: пока только лимиты* *открыли всем пользователям, использовать на низкой подписке нельзя\U0001F600*\n\nРаньше функционал вопрсов к пользователю был доступен только в plan-режиме, а в обычном нет. Для примера AskUserQuestionTool в Claude Сode доступен всегда.\n\n\U0001F513 **Что изменилось**\n\nВ [версии 0.106.0](https://github.com/openai/codex/releases/tag/rust-v0.106.0) request_user_input наконец включили в обычный режим работы. Началось всё с [issue #10384](https://github.com/openai/codex/issues/10384) — наш соотечественник месяц назад попросил эту фичу и вот ее реализовали.\n\nЧтобы включить, нужен feature flag:\n\n```shell\n\ncodex features enable default_mode_request_user_input\n\n```\n\nПосле этого агент сможет задавать вопросы прямо во время выполнения задачи, а не только на этапе планирования. Сам тул называется functions.request_user_input\n\n⚙️ **Мой кейс**\n\nЛично я использую Codex как ревьювера через кастомный скилл `codex review` (рассказывал [тут](https://t.me/countwithsasha/457)). \n\n\U0001F680 С момента выхода поста скилл для ревью сильно прокачался: стал точнее ревьювить и научился даже в git worktree. \n\nРаньше агент мог только смотреть код и давать фидбэк. Теперь появилась возможность проводить более глубокую инициализацию сессии — агент спрашивает про контекст изменений, приоритеты, ограничения. Может подвестить неявную логику или достать неочевидные знания.\n\n----\n\n[Поляков считает](https://t.me/countwithsasha) — AI, код и кейсы\n\n\U0001F4F8 **Photo** (4 sizes available) - 68.5 KB"
      source_info: 'Поляков считает: AI, код и кейсы'
      source_url: 'https://t.me/countwithsasha/506'
      forward_date: '2026-02-27T18:44:25.000Z'
      has_media: true
      media_type: photo
      forward_protected: false
  source_metadata:
    - message_id: 953
      message_type: forward
      source_info: 'Поляков считает: AI, код и кейсы'
      source_url: 'https://t.me/countwithsasha/506'
      forward_protected: false
  ambiguity_reason: orphan_forward
---
==== FORWARDS ====

---- Forward 1 (message_id: 953) ----
Source: Поляков считает: AI, код и кейсы

**В полку фанатов Codex маленький праздник: завезли тул для вопросов**

*Еще codex spark модели принесли всем подписчикам, раньше были доступны только за $200, но сейчс не об этом.*
*UPD: пока только лимиты* *открыли всем пользователям, использовать на низкой подписке нельзя😀*

Раньше функционал вопрсов к пользователю был доступен только в plan-режиме, а в обычном нет. Для примера AskUserQuestionTool в Claude Сode доступен всегда.

🔓 **Что изменилось**

В [версии 0.106.0](https://github.com/openai/codex/releases/tag/rust-v0.106.0) request_user_input наконец включили в обычный режим работы. Началось всё с [issue #10384](https://github.com/openai/codex/issues/10384) — наш соотечественник месяц назад попросил эту фичу и вот ее реализовали.

Чтобы включить, нужен feature flag:

```shell

codex features enable default_mode_request_user_input

```

После этого агент сможет задавать вопросы прямо во время выполнения задачи, а не только на этапе планирования. Сам тул называется functions.request_user_input

⚙️ **Мой кейс**

Лично я использую Codex как ревьювера через кастомный скилл `codex review` (рассказывал [тут](https://t.me/countwithsasha/457)). 

🚀 С момента выхода поста скилл для ревью сильно прокачался: стал точнее ревьювить и научился даже в git worktree. 

Раньше агент мог только смотреть код и давать фидбэк. Теперь появилась возможность проводить более глубокую инициализацию сессии — агент спрашивает про контекст изменений, приоритеты, ограничения. Может подвестить неявную логику или достать неочевидные знания.

----

[Поляков считает](https://t.me/countwithsasha) — AI, код и кейсы

📸 **Photo** (4 sizes available) - 68.5 KB
