---
id: mixpnozr7khwirkgvca
created_at: '2025-12-08T18:23:58.903Z'
source_info: Мысли Рвачева
source_url: 'https://t.me/rvnikita_blog/1468'
has_media: true
language: mixed
summary: >-
  Описание добавления инструкций Claude и папки временных скриптов с
  игнорированием в git
tags:
  - ai
  - coding
  - claude
processed_at: '2025-12-08T22:16:11.847Z'
---
Известно, что Claude Code любит сгенерить скрипт и запустить его когда требуется более сложная задача. С одной стороны очень классное решение - с другой стороны забивает мусором основной проект.

Для себя эту проблему я решил так: 

1. Добавил в ~/.claude/[CLAUDE.md](CLAUDE.md) (файл с инструкциями который будет применяться к Claude Code ко всем проектам не зависимо от того запускаете вы его из терминала или как расширение VSCode)

`# Claude Instructions

## Temporary Scripts

When creating temporary scripts that perform temporary tasks but are not part of the final project (e.g., data migration scripts, one-time setup scripts, testing utilities), place them in the `.claude_temp_scripts` folder to keep the project clean and organized.`

2. Добавил папку .claude_temp_scripts в .gitignore, чтобы она не попадала в репо

#ai #coding #claude 

[—————————
Мысли Рвачева
—————————](https://t.me/+OvImEUmA7W5mYTRi)

📸 **Photo** (3 sizes available) - 25.1 KB
