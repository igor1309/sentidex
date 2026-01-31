---
id: mip4yh8g7nmqnh0b0lf
created_at: '2025-12-02T20:18:51.941Z'
source_info: Константин Доронин
source_url: 'https://t.me/kdoronin_blog/1088'
has_media: true
language: mixed
summary: >-
  Не скиллами едиными — детерминированность через mandatory evaluation хуков
  Claude Code и активацию навыков.
tags:
  - claude
  - eval
  - skills
processed_at: '2025-12-02T22:14:33.664Z'
---
**Не скиллами едиными. 
**
Увлёкшись скиллами, я почти забыл про один из **моих любимых инструментов в Claude Code**. 

Имя ему – **hooks**.

Это тот самый инструмент, который в мир LLM-энтропии приносит то, чего порой так не хватает. **Детерминированность**.

Добавляем в `.claude/settings.json` настройки:

{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "*",        // на все запросы
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/skill-forced-eval-hook.sh"
          }
        ]
      }
    ]
  }
}        ]
      }
    ]
  }
}

А в файл `skill-forced-eval-hook.sh` кладём код:

#!/bin/bash
# UserPromptSubmit hook that forces explicit skill evaluation
#
# This hook requires Claude to explicitly evaluate each available skill
# before proceeding with implementation.
#
# Installation: Copy to .claude/hooks/UserPromptSubmit

cat <<'EOF'
INSTRUCTION: MANDATORY SKILL ACTIVATION SEQUENCE

Step 1 - EVALUATE (do this in your response):
For each skill in <available_skills>, state: [skill-name] - YES/NO - [reason]

Step 2 - ACTIVATE (do this immediately after Step 1):
IF any skills are YES → Use Skill(skill-name) tool for EACH relevant skill NOW
IF no skills are YES → State "No skills needed" and proceed

Step 3 - IMPLEMENT:
Only after Step 2 is complete, proceed with implementation.

CRITICAL: You MUST call Skill() tool in Step 2. Do NOT skip to implementation.
The evaluation (Step 1) is WORTHLESS unless you ACTIVATE (Step 2) the skills.

Example of correct sequence:
- research: NO - not a research task
- svelte5-runes: YES - need reactive state
- sveltekit-structure: YES - creating routes

[Then IMMEDIATELY use Skill() tool:]
> Skill(svelte5-runes)
> Skill(sveltekit-structure)

[THEN and ONLY THEN start implementation]
EOF


Готово! Теперь **все запросы в Claude Code** будут сопровождаться инструкцией, что **Skills – это благость и нужно не забывать их использовать**. 

Сам хук, после подсказки одного из подписчиков (спасибо, Виктор!), обнаружил [вот тут](https://github.com/spences10/svelte-claude-skills/blob/main/.claude/hooks/skill-forced-eval-hook.sh). Оставил автору звезду на репозитории в качестве благодарности 👍

📸 **Photo** (4 sizes available) - 115.8 KB
