# CX-Elvan

Minimal n8n workflow set for Elvan signal monitoring.

Included workflows:
- `workflows/workflow1-hn-producthunt.json` for Hacker News + Product Hunt collection, Gemini scoring, Notion writes, and hot Telegram alerts
- `workflows/phase5-telegram.json` for medium-score Telegram digests from Notion
- `workflows/phase6-weekly-summary.json` for the weekly Notion report and Telegram summary

Required environment variables are listed in `.env.example`.
