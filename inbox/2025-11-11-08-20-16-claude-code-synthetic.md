---
id: mhuf4a3j8e5v794peen
created_at: '2025-11-11T08:20:16.961Z'
source_info: AI-Driven Development. Родион Мостовой
source_url: 'https://t.me/ai_driven/165'
has_media: true
language: mixed
summary: >-
  Обзор подписок на локальные LLM: Claude Code, Synthetic, API, развертывание
  моделей и реферальная программа.
tags:
  - claude
  - code
  - synthetic
  - minimax
  - glm
processed_at: '2025-11-11T10:18:09.055Z'
---
**Claude Code всё?**

Ну что, друзья, Open Source LLMs для кодинга стремительно догоняют своих закрытых ~~братьев~~ сестер. Недавно вышли аж 3 значимых модели от китайцев - это Minimax M2, GLM 4.6 и Kimi K2 Thinking, очень мощные модели, догоняющие Sonnet 4.5 и GPT-5.

Я думаю, для многих не секрет, что китайцы сейчас, во-первых, начали предоставлять подписки на свои LLM (GLM, MiniMax), во-вторых, дают возможность юзать их из Claude Code.
Но, по мне, так ключевая проблема китайских подписок в Privacy - субъективно, вероятность того, что данные будут использованы для обучения (как минимум) существенно выше. И вот тут на сцене появляется сервис Synthetic

**1. Synthetic подписка - Claude Code x3**
Суть сервиса в том, что они предоставляют дешевый доступ к множеству современных LLM - но главное, умеют это делать по подписке. Так вот, даже в подписке за 20$ они пишут, что лимиты на лучшие модели x3 от тех, что Claude дают за те же деньги. Minimax M2, GLM 4.6 и Kimi K2 Thinking там есть. Важно, что они заверяют, что дата центры с их GPUшками находятся в US и EU, что компания у них американская и что данные юзеров для дообучения они никогда не используют.
С Claude Code (CC) они тоже умеют интегрироваться **нативно** и даже дают готовый конфиг, который позволяет легко и просто запускать их Claude Code с их подпиской одной командой:
```shell
# Add to  ~/.zshrc
synclaude() {
  ANTHROPIC_BASE_URL=https://api.synthetic.new/anthropic \
  ANTHROPIC_AUTH_TOKEN=${SYNTHETIC_API_KEY} \
  ANTHROPIC_DEFAULT_OPUS_MODEL=hf:moonshotai/Kimi-K2-Thinking \
  ANTHROPIC_DEFAULT_SONNET_MODEL=hf:MiniMaxAI/MiniMax-M2 \
  ANTHROPIC_DEFAULT_HAIKU_MODEL=hf:MiniMaxAI/MiniMax-M2 \
  CLAUDE_CODE_SUBAGENT_MODEL=hf:zai-org/GLM-4.6 \
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1 \
  claude "$@"
}
```
После этого просто пишем в терминале `synclaude` и радуемся специальному клоду (не забудьте задать ключи `SYNTHETIC_API_KEY` у себя в env). Я успел проверить - работает довольно бодро и стабильно.

Еще, люди в чатах жаловались, что подписки от китайцев на китайские модели работают довольно медленно. Мои быстрые эксперименты с Synthetic показали, что их модели прям шустренько отвечают.

Отмечу, что в таком варианте подписке есть еще один неочевидный плюс, в отличие от китайских - новые LLM выходят стремительно и неизвестно какая опенсорс LLM будет лучшей для кодинга завтра. Здесь же выглядит так, что ребята добавляют поддержку хороших моделей очень быстро (на реддите [писали](https://www.reddit.com/r/LocalLLaMA/comments/1oq1arc/comment/nnhz7gy/?context=3&utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button), что K2 Thinking они первые в US развернули).

**2. API по подписке**
Интересно, что любую из доступных always-on моделей можно так же использовать и через API по подписке.

**3. Деплой своих моделей**
Неочевидный приятный бонус - этот сервис так же умеет разворачивать почти любую LLM с HugginFace (on demand) и это прямо находка для тех, кто деплоит локальные ллмки в организациях - есть возможность очень быстро и дешево протестировать LLMку или ее кванты. Мною проверено - работает.

**Приятная рефералка**
Пользуясь случаем, поделюсь своей реф ссылкой на этой сервис [https://synthetic.new/?referral=eWEfhLA6nZXwE1D](https://synthetic.new/?referral=eWEfhLA6nZXwE1D) - в случае подписки, +10$ на баланс прилетит и мне и вам.

@ai_driven

📸 **Photo** (4 sizes available) - 88.9 KB
