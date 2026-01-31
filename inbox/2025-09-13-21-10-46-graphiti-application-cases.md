---
id: "mfisbobyqvc2j5871v7"
created_at: "2025-09-13T21:10:46.785Z"
source_info: "Константин Доронин"
source_url: "https://t.me/kdoronin_blog/946"
has_media: true
language: "mixed"
summary: "Кейсы применения Graphiti, включающие память проекта с помощью MCP и Cursor."
tags: ["graphiti","cursor","mcp","memory","project"]
processed_at: "2025-09-13T21:35:10.318Z"
---

**Про кейсы применения Graphiti. 
**
Изучаю практические кейсы, **которые уже были реализованы с помощью Graphiti**. Из-за того, что библиотека новая и ей всего год, примеров  не так чтобы огромное количество.

Тем ценнее, что **авторы Graphiti сами периодически подкидывают весьма интересные материалы для изучения**.

Например, у них в блоге [есть кейс](https://blog.getzep.com/cursor-adding-memory-with-graphiti-mcp/) о том, как реализовать **память о программном проекте** в качестве Graphiti-графа **с помощью MCP Graphiti, подключенному к Cursor**.

Фактически, в результате мы получаем память о проекте и всех изменениях, которые в нём происходили. С учётом связей между различными сущностями. Что позволяет Cursor-у в любой момент задать в граф вопрос в духе **"Кто, зачем и когда добавил этот метод?"** и **получить на него ответ**.

**При этом запустить пример достаточно просто:
**
1. Устанавливаем Graphiti [по инструкции отсюда](https://github.com/getzep/graphiti?tab=readme-ov-file#installation).

2. Запускаем MCP-сервер по [этой инструкции](https://github.com/getzep/graphiti/blob/main/mcp_server/README.md).

3. Добавляем [Cursor Rules](https://github.com/getzep/graphiti/blob/main/mcp_server/cursor_rules.md) от ребят из Zep.

Готово! Вы восхитительны! Можно создавать новый проект, смотреть, как заполняется граф и дорабатывать решение под свои нужды 🔥

📸 **Photo** (4 sizes available) - 47.3 KB