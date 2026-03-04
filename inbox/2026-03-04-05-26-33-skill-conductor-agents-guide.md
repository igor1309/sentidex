---
id: mmbs4p9vcbjzicaly9
created_at: '2026-03-04T05:26:33.000Z'
processed_at: '2026-03-04T08:33:18.067Z'
source_info: Aimasters.Me ◽️
source_url: 'https://t.me/aimastersme/536'
has_media: true
language: mixed
summary: >-
  Обзор концепции скиллов для агентов ИИ, их создания, тестирования и
  использования Skill Conductor.
tags:
  - agents
  - ai
  - claude
  - open-source
debug:
  message_ids:
    - 997
  bundle_start_at: '2026-03-04T05:26:33.000Z'
  bundle_end_at: '2026-03-04T05:26:33.000Z'
  bundle_status: ambiguous
  forwarded_messages:
    - message_id: 997
      timestamp: '2026-03-04T05:26:33.000Z'
      content: "**Markdown-файлы скоро нас заменят\n**\nНу, почти. Заменят не любые markdown, а Skills - инструкции для AI-агентов. Это что-то вроде должностных инструкций, книги рецептов и тех-карты в одном флаконе: что делать, в какой последовательности, с какими данными и инструментами. Агент подгружает skill постепенно и перестаёт галлюцинировать. Более подробно рассказывал в [этом видео](https://youtu.be/9Es8-zI8xzg?si=k0aGA46LW9MUAInC)\n\nВнутри любого скилла - набор инструкций, шаблоны, схемы, плюс встроенные скрипты, которые исполняются в строго заданных моментах. Модель не придумывает, как делать ту или иную задачу, а точно следует инструкциям.\n\nНапример\n- генерация визуалов и текстов по фирстилю для разных платформ - агент понимает платформу и создает контент под нее \n- мониторинг конкурентов: что, где, какие сайты и соцсети смотреть, в какую табличку складывать, кого и когда оповещать\n- ответы на обращения не по шаблону/промпту, а с предварительным сбором исторических данных о клиенте в CRM\n... и многое другое\n\nНаписать скилл кажется простым делом. Markdown, пара заголовков, запустил. По факту большинство скиллов работают так: **модель читает описание, говорит «ага, все понятно» - и игнорирует 80% тела файла.** Вы думаете что всё ок, пока результат не повергнет в ужас\n\n**Хороший скилл - это сложный и длительный процесс тестирования и доработки. **Потому что скилл - передача вашего собственного опыта в формат, который AI может воспроизвести.\n\nНо не тужитесь. Я создал skill, который помогает улучшать наши самопалки\n\nВзял четыре лучших подхода к созданию скиллов и скрестил их в один:\n\n• [Гайд Anthropic](https://claude.com/blog/complete-guide-to-building-skills-for-claude) - 32 страницы best practices, 5 архитектурных паттернов\n• [Superpowers](https://github.com/obra/superpowers) от Jesse Vincent - TDD-подход\n• [Best Practices](https://github.com/mgechev/skills-best-practices) от Minko Gechev (Google) - валидация через LLM\n• [Skill Creator](https://github.com/anthropics/skills/tree/main/skills/skill-creator) от Anthropic - упаковка\n• Добавил систему скоринга по 5 критериям и петлю самопроверки и улучшения \n\nПолучился **Skill Conductor** - 5 режимов: CREATE, EVAL, EDIT, REVIEW, PACKAGE.\n\n\U0001F449 [skill-conductor на GitHub](https://github.com/smixs/skill-conductor) \U0001F448\n\nСкачайте ZIP (зелёная кнопка Code со стрелочкой), бросьте в десктопный Claude-Settings-Capabilities или распакуйте в `.claude/skills/` для Claude Code.\n\nПопросите использовать skill-conductor, чтобы проверить и улучшить ваши кастомные скиллы\n\n @aimastersme \n▫️ [AI обучение команд](https://aimasters.me/ru/) \n⚡️ [Power Users](https://t.me/aimasters_chat/2945)\n\n\U0001F4F8 **Photo** (4 sizes available) - 91.7 KB"
      source_info: Aimasters.Me ◽️
      source_url: 'https://t.me/aimastersme/536'
      forward_date: '2026-03-04T03:21:01.000Z'
      has_media: true
      media_type: photo
      forward_protected: false
  source_metadata:
    - message_id: 997
      message_type: forward
      source_info: Aimasters.Me ◽️
      source_url: 'https://t.me/aimastersme/536'
      forward_protected: false
  ambiguity_reason: orphan_forward
---
==== FORWARDS ====

---- Forward 1 (message_id: 997) ----
Source: Aimasters.Me ◽️

**Markdown-файлы скоро нас заменят
**
Ну, почти. Заменят не любые markdown, а Skills - инструкции для AI-агентов. Это что-то вроде должностных инструкций, книги рецептов и тех-карты в одном флаконе: что делать, в какой последовательности, с какими данными и инструментами. Агент подгружает skill постепенно и перестаёт галлюцинировать. Более подробно рассказывал в [этом видео](https://youtu.be/9Es8-zI8xzg?si=k0aGA46LW9MUAInC)

Внутри любого скилла - набор инструкций, шаблоны, схемы, плюс встроенные скрипты, которые исполняются в строго заданных моментах. Модель не придумывает, как делать ту или иную задачу, а точно следует инструкциям.

Например
- генерация визуалов и текстов по фирстилю для разных платформ - агент понимает платформу и создает контент под нее 
- мониторинг конкурентов: что, где, какие сайты и соцсети смотреть, в какую табличку складывать, кого и когда оповещать
- ответы на обращения не по шаблону/промпту, а с предварительным сбором исторических данных о клиенте в CRM
... и многое другое

Написать скилл кажется простым делом. Markdown, пара заголовков, запустил. По факту большинство скиллов работают так: **модель читает описание, говорит «ага, все понятно» - и игнорирует 80% тела файла.** Вы думаете что всё ок, пока результат не повергнет в ужас

**Хороший скилл - это сложный и длительный процесс тестирования и доработки. **Потому что скилл - передача вашего собственного опыта в формат, который AI может воспроизвести.

Но не тужитесь. Я создал skill, который помогает улучшать наши самопалки

Взял четыре лучших подхода к созданию скиллов и скрестил их в один:

• [Гайд Anthropic](https://claude.com/blog/complete-guide-to-building-skills-for-claude) - 32 страницы best practices, 5 архитектурных паттернов
• [Superpowers](https://github.com/obra/superpowers) от Jesse Vincent - TDD-подход
• [Best Practices](https://github.com/mgechev/skills-best-practices) от Minko Gechev (Google) - валидация через LLM
• [Skill Creator](https://github.com/anthropics/skills/tree/main/skills/skill-creator) от Anthropic - упаковка
• Добавил систему скоринга по 5 критериям и петлю самопроверки и улучшения 

Получился **Skill Conductor** - 5 режимов: CREATE, EVAL, EDIT, REVIEW, PACKAGE.

👉 [skill-conductor на GitHub](https://github.com/smixs/skill-conductor) 👈

Скачайте ZIP (зелёная кнопка Code со стрелочкой), бросьте в десктопный Claude-Settings-Capabilities или распакуйте в `.claude/skills/` для Claude Code.

Попросите использовать skill-conductor, чтобы проверить и улучшить ваши кастомные скиллы

 @aimastersme 
▫️ [AI обучение команд](https://aimasters.me/ru/) 
⚡️ [Power Users](https://t.me/aimasters_chat/2945)

📸 **Photo** (4 sizes available) - 91.7 KB
