---
id: mljkjs8ksrr1yex8m3a
created_at: '2026-02-12T12:55:41.357Z'
source_info: 'Refat Talks: Tech & AI'
source_url: 'https://t.me/nobilix/224'
has_media: true
language: mixed
summary: >-
  Markdown-основа презентаций на Slidev с AI-инструментами, гибкой настройкой и
  удобным экспортом
tags:
  - ai
  - agents
  - open-source
  - productivity
  - education
processed_at: '2026-02-12T14:43:31.892Z'
---
[Slidev](https://sli.dev/) - пожалуй лучший способ создавать презентации в эпоху AI. Markdown-first, с мощным тулингом и экспортом в PDF и PowerPoint. Делюсь своим опытом.

Инструментов для презентаций сейчас вагон - от классических PowerPoint и Google Slides до Figma Slides, Gamma, и в каждом втором туле от NodebookLM до Perplexity. Но для своих выступлений, перепробовав кучу вариантов, я как file-first адепт искал инструмент на базе markdown. Сначала это был [Marp](https://marp.app/) - хорош для минимальных слайдов, но ограничен. В Slidev я нашел все что не хватало.

**Почему markdown для презентаций - это мощно**

Все крутится вокруг идеи что слайды - это текстовый файл. Это значит:

- **Хирургическая точность** - find & replace, regex, массовые правки за секунды. В одной из моих през было около 50 логотипов технологий - конечно проще было это сделать кодом чем тягать в визуальном редакторе.
- **Рефакторинг и рестайлинг** - поменял тему в одной строчке frontmatter и все слайды перестроились. Поменял шрифт - тоже одна строчка.
- **Git-friendly** - нормальные диффы, версионирование, бранчи. Презентация лежит рядом с кодом проекта.
- **Hackable** - это веб-приложение под капотом (Vue 3 + Vite), если чего-то не хватает, можно встроить что угодно: npm-пакеты, API-запросы, интерактивные компоненты. Одна только возможность использовать какие-нибудь Lucide-icons чего стоит.
- **Это просто быстрее** - ты тратишь меньше времени на программы презентаций и больше на сам контент.

**Что доступно из коробки**

- [Presenter View](https://sli.dev/guide/presenter-mode) - заметки, таймер, preview следующего слайда, remote control с телефона (работает как веб-приложение)
- [Экспорт](https://sli.dev/guide/exporting) в PDF, PPTX, PNG или деплой как статический сайт.
- Готовые [layouts](https://sli.dev/builtin/layouts), [темы](https://sli.dev/resources/theme-gallery) через npm, [UnoCSS](https://unocss.dev/) для стилизации
- [Mermaid](https://sli.dev/features/mermaid)-диаграммы, [LaTeX](https://sli.dev/features/latex)-формулы
- Подсветка кода с [пошаговым выделением строк](https://sli.dev/features/code-runner) (`{2|3-5|7}`)
- [Magic Move](https://sli.dev/features/magic-move) - анимированная трансформация одного блока кода в другой
- [Monaco Editor](https://sli.dev/features/monaco-editor) - live coding с автокомплитом прямо в слайде
- [Рисование](https://sli.dev/features/drawing) на слайдах во время презентации
- [VS Code расширение](https://sli.dev/features/vscode-extension) - preview, навигация по слайдам, drag-and-drop
- И многое другое, но в минимальной комплектации это все может быть просто один файл `slides.md` и одна команда `npx slidev`

**AI-ready**

Есть [Agent Skill](https://sli.dev/guide/work-with-ai) который ставится одной командой `npx skills add slidevjs/slidev` (хех, сначала у меня был свой, но недавно выкатили официальный). Плюс презентацию можно разбить на отдельные `.md` файлы - супер-удобно с точки зрения контекст инжиниринга.

Slidev позиционируется как "presentation slides for developers". Но имхо с AI-агентами это доступно примерно всем - тем более с таким удобным тулингом. Будете делать презентации - попробуйте!

🔥➕🔁 *@nobilix*

📎 **Document**: slidev.mp4 (8.6 MB) - video/mp4

🎬 **GIF/Animation** (1:08) - 8.6 MB - 1548x1080
