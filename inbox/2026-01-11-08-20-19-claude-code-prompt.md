---
id: mk9kxiu14gq0lnd3mb3
created_at: '2026-01-11T08:20:19.845Z'
source_info: 'Поляков считает: AI, код и кейсы'
source_url: 'https://t.me/countwithsasha/392'
has_media: false
language: mixed
summary: >-
  Обсуждение промпта Claude Code, автора Thariq Shihipar и AskUserQuestionTool,
  детали спецификаций проекта.
tags:
  - claude
  - code
processed_at: '2026-01-11T10:16:48.793Z'
---
**Промпт от разработчика Claude Code, который заставляет AI задавать правильные вопросы**

Со всех утюгов вижу пост про то, как заставить Claude Code детально разбирать спецификацию проекта. Нигде нет ссылки на автора, так что исправляю: это Thariq Shihipar ([его твиттер](https://x.com/trq212)), разработчик из Anthropic, который работает над Claude Code.

🎯 **Сам промпт**

```

read this @SPEC.md and interview me in detail using 
the AskUserQuestionTool about literally anything: 
technical implementation, UI & UX, concerns, 
tradeoffs, etc. but make sure the questions are 
not obvious

be very in-depth and continue interviewing me 
continually until it's complete, then write the 
spec to the file

```

или на русском (также работает, тут главное тегнуть тул)

```

прочитай @SPEC.md и подробно проинтервьюируй меня, используя AskUserQuestionTool, буквально обо всём: техническая реализация, UI и UX, риски/опасения, компромиссы (tradeoffs) и т. д. — но убедись, что вопросы не очевидные.

погружайся максимально глубоко и продолжай интервью непрерывно, пока оно не будет полностью завершено, а затем запиши спецификацию в файл.

```

Фишка в том, что промпт явно указывает на `AskUserQuestionTool` — внутренний инструмент Claude Code для уточняющих вопросов. После этого модель начинает задавать десятки наводящих вопросов под любой, даже крошечный проект.

💡 Детализация получается шикарная. Но для MVP это может быть перебор — проект сразу обрастает фичами, которые ты ещё не обдумал.

⚖️ **Когда использовать**

Промпт хорош, когда ты уже понимаешь, что строишь, и хочешь ничего не упустить. Плохо работает на кейсах «быстро что-нибудь собрать» — получится звезда смерти вместо простого теста.

Кстати, работает не только в Claude Code — [но и в GLM](https://t.me/countwithsasha/387).

У Thariq есть и другие интересные публикации — например, про то, как правильно ранжировать данные через LLM (спойлер: «оцени от 1 до 100» — это полная хрень). Но это тема для отдельного поста.

----

[Поляков считает](https://t.me/countwithsasha) — AI, код и кейсы
