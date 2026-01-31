---
id: "mesl14z9bx33l20yya"
created_at: "2025-08-26T12:31:57.692Z"
source_info: "Neural Kovalskii"
source_url: "https://t.me/neuraldeep/1583"
has_media: true
language: "mixed"
summary: "Обсуждается создание простого инструмента Deep Research на основе Tavily API и GPT‑4o‑mini с шагами Clarification, GeneratePlan, AdaptPlan, WebSearch и CreateReport."
tags:
  - openai
processed_at: "2025-08-26T13:29:00.789Z"
---

**SGR Deep Research**

А почему бы не взять все лучшие идеи из [демо](https://t.me/llm_driven_products/54353) и идей ребят из [чата](https://t.me/llm_driven_products/54341)
Собрать свои идеи по Deep Research 
И сделать самый простой инструмент поиска инфы в интернете через Tavlily API?

А сделать, вот он [https://github.com/vakovalskii/sgr-deep-research](https://github.com/vakovalskii/sgr-deep-research) (звездочки приветствуются) 

gpt-4o-mini
Tavily API
SGR-concept

Из интересного что заметил такая модель сама определяет что например чипов M6 у applе не существует и на ходу меняет план рисерча потому что нашла это в данных из инета
Или что термин SGR ей не понятен и просит его расшифровать

Что я закинул туда "навайбкодил" 

1. 🤔 Clarification (ВЫСШИЙ ПРИОРИТЕТ)
   - При любой неопределенности в запросе
   - Неизвестные термины, акронимы, аббревиатуры
   - Неоднозначные запросы с множественными интерпретациями
   - Отсутствие контекста для специализированных областей

2. 📋 GeneratePlan
   - Когда план не существует и запрос ясен
   - После получения уточнений от пользователя

3. 🔄 AdaptPlan
   - Когда требуется адаптация исследовательского подхода
   - При обнаружении неточностей в первоначальных предположениях

4. 🔍 WebSearch
   - Когда нужна дополнительная информация И searches_done < 3
   - МАКСИМУМ 3-4 поиска на исследование

5. 📄 CreateReport
   - При searches_done >= 2 ИЛИ enough_data = True
   - Когда собрана информация для полного анализа

6. ✅ ReportCompletion
   - После создания отчета
   - Финализация исследования

*Соответствие концепту SGR верифицировало Ринатом 😂*

Предлагайте ваши эксперименты! Вон даже ребята из [Cбера](https://gist.github.com/sb-static/bb1a17e763a4b9f7e50d16c37487e2a3) подключились!

📸 **Photo** (4 sizes available) - 117.3 KB