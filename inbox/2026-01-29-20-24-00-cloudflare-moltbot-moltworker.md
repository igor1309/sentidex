---
id: ml00sirbck18px986j7
created_at: '2026-01-29T20:24:00.138Z'
source_info: Yuriy Burykin
source_url: ''
has_media: false
language: mixed
summary: >-
  Прототип Moltworker для Moltbot на платформе Cloudflare, минимальная стоимость
  5 долларов.
tags:
  - cloudflare
processed_at: '2026-01-29T22:22:49.847Z'
---
[https://jpcaparas.medium.com/the-moltbot-saga-continues-cloudflare-enters-the-chat-5650b39af31f](https://jpcaparas.medium.com/the-moltbot-saga-continues-cloudflare-enters-the-chat-5650b39af31f)
Cloudflare выпустила прототип, позволяющий запускать Moltbot в своей сети на периферии сети вместо покупки Mac mini.

Вчера был анонсирован Moltworker от Cloudflare. Это промежуточное ПО Worker, которое запускает Moltbot полностью на их платформе для разработчиков.

**Подробности**:
Выпущен 29 января 2026 года в качестве прототипа (не продукт Cloudflare)
Минимальная стоимость: 5 долларов в месяц (платный тариф Workers)
Использует 5 сервисов Cloudflare: AI Gateway, Sandbox SDK, хранилище R2, рендеринг в браузере, доступ с нулевым доверием

**Репозиторий** на GitHub уже доступен: [github.com/cloudflare/moltworker](github.com/cloudflare/moltworker)

**Причина**:
Интернет наводнен сообщениями о покупке Mac mini для локального запуска Moltbot. Apple, вероятно, в восторге. Кошельки — меньше.
Это меняет экономику с «покупки оборудования» на «оплату вычислительных ресурсов по мере их использования».
Холодные запуски и доверие Cloudflare в вопросах взаимодействия с ИИ — это реальные компромиссы.

Стоит отметить, что это всего лишь прототип. Cloudflare пока не продает это как готовый продукт.
