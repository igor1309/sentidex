---
id: mimrojvlj40eo468kls
created_at: '2025-12-01T03:46:21.673Z'
source_info: Neural Kovalskii
source_url: 'https://t.me/neuraldeep/1758'
has_media: false
language: mixed
summary: 'Сборник лучших подходов, практик и материалов по RAG с примерами и ссылками.'
tags:
  - langchain
  - chroma
  - qdrant
  - bogdanisssimo
processed_at: '2025-12-01T06:27:23.168Z'
---
**Лучшие практики и подходы для RAG** 
(буду наполнять)


Очередной раз спросили в чате канала что почитать про RAG ([https://t.me/neuraldeepchat](https://t.me/neuraldeepchat))

Соберем тут все лучшее присылайте и ваши статьи и разборы

Тут материалы предыдущих ответов

1) [https://t.me/neuraldeepchat/3176](https://t.me/neuraldeepchat/3176)
2) [https://t.me/neuraldeepchat/2953](https://t.me/neuraldeepchat/2953)


1) Чанкование (sliding window) можно подглядеть концепты от [langchain](https://python.langchain.com/docs/concepts/text_splitters/)
[https://github.com/langchain-ai/langchain/tree/master/libs/text-splitters](https://github.com/langchain-ai/langchain/tree/master/libs/text-splitters)

*Tired of making your gazillionth chunker? Sick of the overhead of large libraries? Want to chunk your texts quickly and efficiently? Chonkie the mighty hippo is here to help!*
[https://github.com/chonkie-inc/chonkie](https://github.com/chonkie-inc/chonkie)



2) Векторные бд от pgvector до qdrant можно начать с chroma (IVF_Flat или HNSW)

3) Векторные модели для ру 
ai-forever/FRIDA
BAAI/bge-m3
intfloat/multilingual-e5-large
Qwen3-Embedding-8B

4) Реранкер после KNN сделать доп ранжирование
BAAI/bge-reranker-v2-m3
Qwen3-Reranker-8B


5) LLM + vLMM (база qwen-2.5-7b-instruct)
RefalMachine/RuadaptQwen2.5-14B-Instruct
t-tech/T-lite-it-1.0
t-tech/T-pro-it-2.0

Agentic RAG(Qwen3-30B-A3B-Instruct-2507) 
РЕПО([https://github.com/vamplabAI/sgr-agent-core/tree/tool-confluence](https://github.com/vamplabAI/sgr-agent-core/tree/tool-confluence))

Презентация от [Дяди](https://t.me/dealerAI) 
[Построение RAG систем от исследований до индустрии](https://docs.google.com/presentation/d/1BtQr3Otb63qxKbc2k6YKJ5HuWc927nVj/edit?slide=id.g2c1e7f4de2f_5_140#slide=id.g2c1e7f4de2f_5_140)


Хорошо описанные подходы от Богдана 
[https://t.me/bogdanisssimo/2047](https://t.me/bogdanisssimo/2047)

Лучшее решение РАГ по документации от Ильи(@IlyaRice) которое выиграло первое место на ERC2 
[https://github.com/IlyaRice/RAG-Challenge-2/tree/main](https://github.com/IlyaRice/RAG-Challenge-2/tree/main)


Готовые фреймворки одобренные нашим сообществом 
[https://github.com/langgenius/dify/](https://github.com/langgenius/dify/)
[https://github.com/Marker-Inc-Korea/AutoRAG](https://github.com/Marker-Inc-Korea/AutoRAG)
[https://github.com/run-llama/llama_index](https://github.com/run-llama/llama_index)
[https://github.com/mastra-ai/mastra](https://github.com/mastra-ai/mastra)

Кейс red_mad_robot по RAG (DCD) для строительной компании (t-lite)
[https://habr.com/ru/companies/redmadrobot/articles/892882/](https://habr.com/ru/companies/redmadrobot/articles/892882/)

Серия про file first от Рефата
[https://t.me/nobilix/182](https://t.me/nobilix/182)

Классика (Запись эфира по RAGу без эмбеддингов)
[https://t.me/oestick/397](https://t.me/oestick/397)

#RAG
#best_rag_practice

Сохраняй в избранное чтобы не потерять
