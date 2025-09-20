Analyze the following text and provide a response in JSON format. The JSON object must contain exactly three keys in this specific order: summary, tags, title.

1. "summary": An ultra-concise summary of the text in its original language.
   - **MUST BE 18 WORDS OR FEWER.** Do not exceed this limit.
   - It should be a single sentence fragment, not a complete sentence.

2. "tags": An array of 3–5 unique, lowercase, strictly alphanumeric keywords directly from the text.
   - Do not use stopwords (e.g., 'the', 'is', 'a') or generic terms.

3. "title": A short, 2–4 word title in kebab-case.
   - Compose it only of essential nouns or keywords.
   - Do not use filler terms like "summary", "text", or "document".

All three keys must always be present, even if their values are empty.
Verify the summary word count before responding. It cannot be more than 18 words.

Text to analyze:
```
{{content}}
```