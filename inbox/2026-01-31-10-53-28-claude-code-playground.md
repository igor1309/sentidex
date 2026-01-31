---
id: ml2efgcwit3zocp4aaa
created_at: '2026-01-31T10:53:28.127Z'
source_info: 'Поляков считает: AI, код и кейсы'
source_url: 'https://t.me/countwithsasha/446'
has_media: true
language: mixed
summary: Claude Code Playground интерактивные HTML-демки для правок и ревью интерфейсов
tags:
  - claude
  - ai-coding
  - workflow
  - video-gen
processed_at: '2026-01-31T14:20:07.183Z'
---
**От текста к интерфейсу: новый скилл Claude Code**

Anthropic добавили скилл Playground — теперь вместо угрюмых markdown-файлов Claude Code генерирует интерактивные HTML-демки. Ну и да, использовать скилл можно хоть в [Cursor,](https://cursor.com/ru/docs/context/skills) хоть со [сторонними](https://t.me/countwithsasha/387) моделями.

🧪 **Что попробовал**

Попросил Claude Code предложить правки к `CLAUDE.md` одного проекта в интерактивном формате. Получил HTML-страницу с набором предложений, где каждое можно accept/decline одной кнопкой. Отмечаешь нужное → Claude применяет.

Вместо чтения простыни текста и корректировок буквами — визуальный чеклист. Это действительно может быть удобным для обсуждения сложных планов, где важно вносить правки атомарно к нужным фичам.

🔧 **Где ещё пригодится**

🔸 [Настройка дизайна](https://github.com/anthropics/claude-plugins-official/blob/main/plugins/playground/skills/playground/templates/design-playground.md) — крутишь слайдеры (цвета, отступы, тени), видишь превью, получаешь промпт с финальными значениями, который можно воплотить.

🔸 Построение [SQL-запросов](https://github.com/anthropics/claude-plugins-official/blob/main/plugins/playground/skills/playground/templates/data-explorer.md) — собираешь запрос через интерфейс, проверяешь результат. Сомнительный скилл.

🔸 [Ревью PR —](https://github.com/anthropics/claude-plugins-official/blob/main/plugins/playground/skills/playground/templates/diff-review.md) построчные комментарии с кнопками approve/reject

🔸 Карта [кодовой базы](https://github.com/anthropics/claude-plugins-official/blob/main/plugins/playground/skills/playground/templates/code-map.md) — визуализация архитектуры проекта

📦 **Как установить**

```

/plugin install playground@claude-plugins-official

```

Репозиторий: [github.com/anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/playground)

🚀 Мне понравилось то, насколько лаконично объявлен навык и шаблоны. Явно старались экономить токены.

⚠️ Минус символический: интерфейс генерируется на английском. Русский надо просить отдельно.

**А вы как предпочитаете получать результат от агентов **— текстом или интерфейсом? 

----

[Поляков считает](https://t.me/countwithsasha) — AI, код и кейсы

🎥 **Video** (23s) - 1.4 MB - 3010x1558
