# Roadmap

Planned product improvements for Sentidex, ordered from the quickest wins to more involved initiatives.

1. **Automated clean-up for AI hiccups**  
   Extend `scripts/process-messages.js` so files that fail AI enrichment are auto-tagged (e.g., `ai-failed`) and re-queued, keeping the intake moving without manual fixes.

2. **Digest triage cues inside Telegram**  
   Enrich digest messages with lightweight indicators derived from front matter (age badges, media markers) so Telegram remains the single place for prioritisation while retaining the original source links.

3. **Telegram maintenance commands**  
   Let the bot respond to commands like `/status`, `/done <id>`, or `/snooze <id>` by routing through the polling workflow to stage Git commits that archive or reshape queue items directly from chat.

4. **Queue dashboard**  
   Publish a read-only dashboard (e.g., GitHub Pages or Supabase-backed view) that mirrors the inbox with filters for tags, language, age, and media. Optional actions can open PRs/issues to annotate or archive notes, turning the queue into a visual workspace.
