---
id: mmd7mocr56kdmj2qe1
created_at: '2026-03-05T05:29:17.000Z'
processed_at: '2026-03-05T08:34:57.099Z'
source_info: Aimasters.Me ◽️
source_url: 'https://t.me/aimastersme/537'
has_media: false
language: mixed
summary: >-
  Обновления Anthropic skill-creator синхронны с релизом skill-conductor;
  архитектура, TDD и 5 осей скоринга
tags:
  - ai
  - agents
  - workflow
  - ai-coding
debug:
  message_ids:
    - 1023
  bundle_start_at: '2026-03-05T05:29:17.000Z'
  bundle_end_at: '2026-03-05T05:29:17.000Z'
  bundle_status: ambiguous
  forwarded_messages:
    - message_id: 1023
      timestamp: '2026-03-05T05:29:17.000Z'
      content: "Anthropic [обновили свой skill-creator](https://claude.com/blog/improving-skill-creator-test-measure-and-refine-agent-skills) ровно в тот момент, когда я выложил skill-conductor. Синхрон настолько точный, что я проверил - нет, они у меня не списывали \U0001F923\n\nСпасибо @weistigr за подсказку ❤️ \nУ нас в группе оч крутые подпискики собрались, между прочимпискики собрались, между прочим\n\nКрч, разобрал их апдейт по косточкам. Это очень-очень сильный скилл - мощный интсрумент. Там три агента-специалиста. И я в восторге от этого подхода! \n\nСейчас копаю именно в эту сторону: рой агентов в skill - это целая команда вместо одного медленного сотрудника *(ну вот, уже AI стал медленным, дожили) *\n\nНо я был бы не я, если бы тут же не забрал лучшее в свой [conductor](https://t.me/aimastersme/536). \n\nОбновил и улучшил skill-conductor. И вот в чем отличие:\n\n**1. Архитектура до кода**\nCreator сразу прыгает к \"давай напишем [SKILL.md](SKILL.md)\". Conductor заставляет сначала выбрать паттерн. Самая дорогая ошибка - неправильная архитектура. Переписывать потом долго и больно.\n\n**2. Test Driven Development - **Сначала прогон и падающие тесты без skill, потом пишем skill \n\n**3. 5 осей скоринга с числовыми значениями\n**Если набирает 45-50, то готов в продакшн, если меньше - переписывать. \n\nВ общем, [Сreator](https://github.com/anthropics/skills/tree/main/skills/skill-creator) - это серьёзный testing engine. [Conductor](https://github.com/smixs/skill-conductor) - это полный цикл от идеи до пакета. \n\nВыбирайте сами, что вам ближе\n\nОбновлённый skill-conductor по [ссылке](https://github.com/smixs/skill-conductor)\n\n @aimastersme"
      source_info: Aimasters.Me ◽️
      source_url: 'https://t.me/aimastersme/537'
      forward_date: '2026-03-05T03:04:08.000Z'
      has_media: false
      media_type: none
      forward_protected: false
  source_metadata:
    - message_id: 1023
      message_type: forward
      source_info: Aimasters.Me ◽️
      source_url: 'https://t.me/aimastersme/537'
      forward_protected: false
  ambiguity_reason: orphan_forward
---
==== FORWARDS ====

---- Forward 1 (message_id: 1023) ----
Source: Aimasters.Me ◽️

Anthropic [обновили свой skill-creator](https://claude.com/blog/improving-skill-creator-test-measure-and-refine-agent-skills) ровно в тот момент, когда я выложил skill-conductor. Синхрон настолько точный, что я проверил - нет, они у меня не списывали 🤣

Спасибо @weistigr за подсказку ❤️ 
У нас в группе оч крутые подпискики собрались, между прочимпискики собрались, между прочим

Крч, разобрал их апдейт по косточкам. Это очень-очень сильный скилл - мощный интсрумент. Там три агента-специалиста. И я в восторге от этого подхода! 

Сейчас копаю именно в эту сторону: рой агентов в skill - это целая команда вместо одного медленного сотрудника *(ну вот, уже AI стал медленным, дожили) *

Но я был бы не я, если бы тут же не забрал лучшее в свой [conductor](https://t.me/aimastersme/536). 

Обновил и улучшил skill-conductor. И вот в чем отличие:

**1. Архитектура до кода**
Creator сразу прыгает к "давай напишем [SKILL.md](SKILL.md)". Conductor заставляет сначала выбрать паттерн. Самая дорогая ошибка - неправильная архитектура. Переписывать потом долго и больно.

**2. Test Driven Development - **Сначала прогон и падающие тесты без skill, потом пишем skill 

**3. 5 осей скоринга с числовыми значениями
**Если набирает 45-50, то готов в продакшн, если меньше - переписывать. 

В общем, [Сreator](https://github.com/anthropics/skills/tree/main/skills/skill-creator) - это серьёзный testing engine. [Conductor](https://github.com/smixs/skill-conductor) - это полный цикл от идеи до пакета. 

Выбирайте сами, что вам ближе

Обновлённый skill-conductor по [ссылке](https://github.com/smixs/skill-conductor)

 @aimastersme
