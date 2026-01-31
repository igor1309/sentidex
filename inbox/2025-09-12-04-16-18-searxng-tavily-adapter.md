---
id: "mfs2jz0dt8ob1vjdnmb"
created_at: "2025-09-12T04:16:18.696Z"
source_info: "Neural Kovalskii"
source_url: "https://t.me/neuraldeep/1611"
has_media: false
language: "mixed"
summary: "Замена Tavily на SearXNG с адаптером обеспечивает бесплатный приватный поиск без лимитов"
tags:
  - github
processed_at: "2025-09-20T09:31:29.149Z"
---

**SearXNG Tavily Adapter: когда жаба душит платить за поиск 🐸**

Надоело тратить деньги на Tavily при тестировании агентов?
Мне тоже! За вечер сделал решение

**Проблема**: Tavily API съедает бюджет при разработке research агентов 
Уже на тестах улетело больше $100 а это мы еще к бенчмаркам не перешли 

**Решение**: SearXNG (open-source метапоисковик) + мой адаптер = drop-in замена Tavily достаточно поднять и сменить `base_url` уже звучу как маркетолог (нет)

```python
# Было (платно):
client = TavilyClient("tvly-дорогой-ключ")

# Стало (бесплатно):  
client = TavilyClient(base_url="http://localhost:8000")
```
Точно тот же API, но:
$0 вместо $$$$$$$$$$
Полная *приватность*  
Без лимитов запросов
Web scraping для research агентов (только вот raw_content на bs4)
70+ поисковых движков под капотом (bing сразу в бан!) 
погоду он находит при запросах *"прогноз цены биткоина 2026"
*

**Быстрый старт:**
```bash
git clone https://github.com/vakovalskii/searxng-docker-tavily-adapter
docker compose up -d
# Готово! API работает на localhost:8000
```

**Эффект жабы удовлетворен** теперь могу тестировать 
research агентов сутками за $5/месяц сервера вместо API лимитов! 

GitHub: [https://github.com/vakovalskii/searxng-docker-tavily-adapter](https://github.com/vakovalskii/searxng-docker-tavily-adapter)

P.S. SearXNG существует годами, но мало кто знает что из него можно сделать замену коммерческих API!

Не забываем ставить звезды в репо!