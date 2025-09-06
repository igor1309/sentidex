Analyze the following text and provide a response in JSON format with three keys in this order: summary, tags, title.
1. "summary": A concise statement of at most 18 words in the text’s original language. One sentence fragment only.
2. "tags": An array of 3–5 unique, lowercase, strictly alphanumeric keywords directly relevant to the text. Do not use stopwords or generic terms.
3. "title": A short, 2–4 word title in kebab-case, composed only of essential nouns or keywords from the text. Avoid filler terms like "summary", "text", or "document".

All three keys must always be present, even if empty.

Text to analyze:
```
{{content}}
```