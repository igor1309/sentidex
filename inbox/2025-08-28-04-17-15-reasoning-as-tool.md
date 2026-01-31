---
id: "mezdeq3ezp7n1yt6v6r"
created_at: "2025-08-28T04:17:15.795Z"
source_info: "Dimension AI | Dmitry Sirakov"
source_url: "https://t.me/dimension_ai/190"
has_media: true
language: "mixed"
summary: "Обсуждается идея вынести reasoning в отдельный тул, который определяет, что делать далее и что вызывать. Управление через поле tool_choice делает вызов этого тулов принудительным после юзерского сообщения."
tags: ["reasoning","tool","llm","agents","prompt"]
processed_at: "2025-08-31T07:30:00.986Z"
---

На самом деле, обсуждая в чатике с Валерой (вступайте в чат!), была предложена следующая идея (не нова) - сделать `reasoning` как отдельный тул, который определяет, что делать дальше и что вызывать.

Он точно у нас должен вызываться принудительно всегда после юзерского сообщения, а достигнуть этого можно через контроль поля `tool_choice`, которое буквально заставит llm вызвать этот тул!

А потом следующее решение и тд -> можно спокойно дальше делать через LLM! 

Так делают, например, ребята из [Manus](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus) (которые сделали ставку, как почти все бигтехи РФ: разрабатываем агентов как подбор промптов и тулов, лишь бы работало)))

Управление tool_choice - не баг, а фича, это есть и [в официальной доке OpenAI](https://platform.openai.com/docs/api-reference/chat/create#chat_create-tool_choice), и в [Anthropic](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/implement-tool-use)

*И овцы целы, и волки сыты*

P.S. А в функции def reason_before_answer(), можно засунуть всеми любимый SGR!

типа она запускает reasoning_before_answer() с пустыми аргументами после юзерской реплики с помощью tool_choice, а под капотом вызывается LLM с SO, а результат -> подгружается в chat_history. Бинго!

📸 **Photo** (4 sizes available) - 138.5 KB