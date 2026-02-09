---
id: mlfqxr9rj78ftkovi8
created_at: '2026-02-09T20:34:12.131Z'
source_info: ForgetMe | Нейросети
source_url: 'https://t.me/forgetmeai/5799'
has_media: true
language: mixed
summary: >-
  Подключение Claude Hooks к системным звукам для уведомлений о статусе Claude
  Code
tags:
  - claude
  - ai
  - ai-coding
  - audio
  - workflow
processed_at: '2026-02-09T22:31:16.815Z'
---
✴️ **Как добавить звуковые Claude Hooks для индикации работы Claude Code**

Идея простая: подключите **Claude hooks** к системным звукам — пусть **пиликает, когда задача закончена**, или **просит разрешение**. Самый кайф - поставить **свои сэмплы**: ностальгические звуки из **Warcraft/StarCraft/Mario/SpongeBob**. Так вы мгновенно понимаете, что происходит, не глядя в окно терминала.

Практика: на macOS удобно использовать **afplay**. Настраиваем хуки в .claude/settings.json - на старт сессии, отправку промпта, уведомления и стоп. Если вы на Windows/Linux, замените команду на системный плеер (например, powershell -c (New-Object Media.SoundPlayer ..." ) или paplay/aplay), путь к файлам — свой.

**Готовые сэмплы (пример):** **Warcraft Peon**, **Warcraft Peasant**, **Mario**, **SpongeBob** - просто положите .wav в папку, на которую указывает конфиг.

```json
# .claude/settings.json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          { "type": "command", "command": "afplay /Users/d/.claude/hooks/PeonReady1.wav" }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          { "type": "command", "command": "afplay /Users/d/.claude/hooks/PeonYes3.wav" }
        ]
      }
    ],
    "Notification": [
      {
        "hooks": [
          { "type": "command", "command": "afplay /Users/d/.claude/hooks/PeonWhat3.wav" }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": "afplay /Users/d/.claude/hooks/PeonBuildingComplete1.wav" }
        ]
      }
    ]
  }
}
```

Не знаю почему такое не добавят из коробки

🤑** ****ForgetMe**e](https://t.me/forgetmeai)** | ****Boosty**y](https://boosty.to/lastnightisrea)

**Приобрести подписку на любые сервисы**ы](https://t.me/forgetshop_bot)
⏩** ****@forgetshop_bot**

#полезности #claude #нейросети

🎥 **Video** (49s) - 1.7 MB - 960x720
