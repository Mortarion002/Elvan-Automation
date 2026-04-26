# CX-Elvan

Signal intelligence workflows for Elvan.ai, built in n8n.

This project monitors public product and customer-feedback conversations, enriches them with LLM analysis, scores lead intent, stores structured records in Neon Postgres, and sends actionable Telegram alerts.
Neon is now the operational handoff between workflows. Workflow 1 only collects, analyzes, scores, and upserts signals into Neon. Separate downstream workflows read from Neon for hot alerts, medium digests, and weekly summaries.

## What This Project Does

Every cycle, the pipeline:

1. Collects posts from Hacker News and Product Hunt.
2. Normalizes post payloads into one common shape.
3. Filters for NPS/CSAT/CES and feedback-related relevance.
4. Removes duplicates using in-memory checks and Neon upserts.
5. Calls an LLM to extract pain point, intent, urgency, and draft reply.
6. Scores and tiers each signal (`hot`, `medium`, `low`).
7. Writes all qualified signals to Neon `signal_events`.
8. Sends hot Telegram alerts from a separate Neon reader workflow.
9. Sends medium digest and weekly summary reports from Neon.

Timezone used across workflows: `Asia/Kolkata`.

## Repository Structure

```text
.
|- Readme.md
|- .env.example
|- scripts/
|  |- dedup.js
|  |- flatten-hn.js
|  |- flatten-ph.js
|  |- flatten-reddit.js
|  |- keyword-filter.js
|  |- parse-gemini.js
|  |- scoring.js
|  `- weekly-summary.js
`- workflows/
   |- workflow1-hn-producthunt.json
   |- phase5a-neon-hot-alerts.json
   |- phase5b-neon-medium-digest.json
   |- phase6-neon-weekly-summary.json
   |- phase5-telegram.json
   `- phase6-weekly-summary.json
```

`phase5-telegram.json` and `phase6-weekly-summary.json` are the older Notion-backed reader workflows. Prefer the Neon-backed workflows for new imports.

## Workflow Overview

### 1) Core Collector + Scoring
File: `workflows/workflow1-hn-producthunt.json`

Purpose:
- Collect from HN + Product Hunt every 6 hours.
- Enrich with an OpenAI chat model.
- Score and route into tiers.
- Upsert all scored items into Neon `signal_events`.
- Stop there; alerting and reporting are handled by separate Neon reader workflows.

Schedule:
- Cron: `0 */6 * * *`

Major stages:
- `Setup HN URLs` -> `Fetch HN Posts` -> `Flatten HN Posts`
- `Setup PH Queries` -> `Fetch PH Posts` -> `Flatten PH Posts`
- `Merge Sources` -> `Keyword Filter` -> `Limit` (max 20)
- `Dedup Static Memory` (24h URL memory)
- `Basic LLM Chain` with `ChatGPT Chat Model`
- `Parse LLM Response`
- `Scoring`
- `Prep Neon Signal Row` -> `Neon Existing Signal Query` -> `Filter New Neon Rows` -> `Neon Upsert Signals`

### 2) Hot Signal Alerts
File: `workflows/phase5a-neon-hot-alerts.json`

Purpose:
- Every 10 minutes, query Neon for unalerted hot signals.
- Send one Telegram alert per hot signal.
- Mark sent records as `alerted = true` in Neon.

Schedule:
- Cron: `*/10 * * * *`

### 3) Medium Signal Digest
File: `workflows/phase5b-neon-medium-digest.json`

Purpose:
- Every 6 hours, pull recent medium signals from Neon where `alerted = false`.
- Send a compact Telegram digest.
- Mark sent records as `alerted = true` in Neon.

Schedule:
- Cron: `15 */6 * * *`

Digest behavior:
- Looks back 24 hours.
- Sorts by score descending.
- Sends top 8 items.
- Truncates message near Telegram length limits.

### 4) Weekly Summary Report
File: `workflows/phase6-neon-weekly-summary.json`

Purpose:
- Weekly rollup of all Neon signals from last 7 days.
- Computes stats and asks Gemini for a narrative summary.
- Creates a weekly report page in a second Notion database.
- Sends a Telegram weekly report message with key stats.

Schedule:
- Cron: `0 9 * * 1` (every Monday at 09:00, workflow timezone)

## Data Sources

### Hacker News
- Endpoint style: HN Algolia API.
- Pulls multiple query patterns (stories + ask_hn + competitor-oriented terms).

### Product Hunt
- Endpoint: `https://api.producthunt.com/v2/api/graphql`
- Uses Product Hunt developer token.
- Pulls customer-success topic posts plus broader competitor search query.

### Reddit
- A flattening helper exists in `scripts/flatten-reddit.js`.
- Reddit is not currently wired into the provided workflow JSON files.

## Environment Variables

Copy `.env.example` into your n8n environment and set real values:

```env
# Gemini
GEMINI_API_KEY=your_gemini_api_key_here

# Optional parallel analytics channel
NEON_DATABASE_URL=your_neon_postgres_connection_string_here

# Notion
NOTION_API_KEY=your_notion_integration_token_here
NOTION_DB_ID=your_legacy_signal_database_id_here
NOTION_WEEKLY_DB_ID=your_weekly_report_database_id_here

# Telegram
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_telegram_chat_id_here

# Product Hunt
PRODUCTHUNT_DEV_TOKEN=your_producthunt_developer_token_here
```

`Workflow 1` uses the n8n credential `OPENAI_API`, so its OpenAI key is configured in n8n credentials rather than in this `.env.example` block.

## Required n8n Credentials

The workflow JSON expects these credential names in n8n:

- `OPENAI_API` for `Workflow 1`
- `GEMINI_API` for `Phase 6`
- `NEON_POSTGRES` for Workflow 1 and all Neon-backed reader workflows
- `TELEGRAM_API` for Telegram sends

Note:
- Product Hunt and weekly Notion report creation use HTTP Request nodes with env vars in headers.
- `Workflow 1` uses an n8n OpenAI credential, not an env-var API key in the workflow JSON.
- The Neon Postgres nodes use an n8n credential, so set up a Postgres credential and bind it to the Neon query/upsert nodes after import if n8n does not auto-match by name.

## Neon Signal Table

The Neon-backed workflows expect `public.signal_events` to contain the fields written by Workflow 1:

- `dedupe_key`
- `source`
- `source_system`
- `workflow`
- `external_id`
- `title`
- `body`
- `url`
- `author`
- `subreddit`
- `intent`
- `urgency`
- `priority`
- `tool_mentioned`
- `pain_point`
- `elvan_angle`
- `draft_reply`
- `score`
- `base_score`
- `boosted_score`
- `comments_count`
- `upvotes`
- `alerted`
- `hot_lead`
- `occurred_at`

The collector upserts on `dedupe_key`, so repeated collector runs should update existing rows instead of creating duplicates.

## Notion Database Schema

### Optional Primary Signals Database (`NOTION_DB_ID`)

The old Notion-backed digest workflows use this schema. The new Neon-backed alert and digest workflows do not require per-signal Notion inserts.

Create these properties exactly (types matter):

- `Title` -> Title
- `Source` -> Select
- `Subreddit` -> Rich text
- `Pain Point` -> Rich text
- `Intent` -> Select
- `Urgency` -> Select
- `Tool Mentioned` -> Rich text
- `Elvan Angle` -> Rich text
- `Base Score` -> Number
- `Boosted Score` -> Number
- `Draft Reply` -> Rich text
- `URL` -> URL
- `Alerted` -> Checkbox
- `Created At` -> Date

Recommended select options:
- `Intent`: `buying`, `venting`, `learning`, `comparing`
- `Urgency`: `high`, `medium`, `low`
- `Source`: `HackerNews`, `ProductHunt`, `Reddit`, `WeeklyReport` (optional)

### Weekly Reports Database (`NOTION_WEEKLY_DB_ID`)

Used by `phase6-neon-weekly-summary.json`.

Minimum required properties:
- `Title` -> Title
- `Source` -> Select
- `Pain Point` -> Rich text
- `Elvan Angle` -> Rich text
- `Boosted Score` -> Number
- `Alerted` -> Checkbox
- `Created At` -> Date

## Script Reference

The `scripts/` folder contains reusable Code node logic snapshots.

- `flatten-hn.js`: Expand HN Algolia `hits` into one post per item.
- `flatten-ph.js`: Expand Product Hunt edges and merge comments into `body`.
- `flatten-reddit.js`: Parse Reddit listing payloads into normalized post items.
- `keyword-filter.js`: Keep only relevant posts using CX keyword matching.
- `dedup.js`: 24h URL deduplication using workflow static global data.
- `parse-gemini.js`: Parse JSON output from an LLM chain with fallback defaults.
- `scoring.js`: Apply boost logic and compute `tier`.
- `weekly-summary.js`: Aggregate weekly stats and build Gemini summary prompt.

Important:
- Active workflow JSON files embed their own `jsCode` directly inside nodes.
- If you edit files in `scripts/`, you still need to paste/update corresponding code in n8n nodes (or re-export workflows) for runtime behavior to change.

## Data Shape (Normalized Signal Item)

After flattening, each signal is expected to include fields similar to:

```json
{
  "title": "post title",
  "body": "post body or merged text",
  "url": "https://...",
  "author": "username",
  "subreddit": "optional",
  "source": "HackerNews | ProductHunt | Reddit",
  "base_score": 1,
  "boosted_score": 1,
  "tier": "low | medium | hot"
}
```

## Setup Guide

1. Create or open an n8n instance.
2. Set all environment variables from `.env.example`.
3. Create credentials in n8n:
   - `OPENAI_API`
   - `GEMINI_API`
   - `NEON_POSTGRES`
   - `TELEGRAM_API`
4. Create the weekly Notion database if you want weekly report pages.
5. Share the weekly Notion database with your Notion integration token.
6. Import workflows in this order:
   - `workflows/workflow1-hn-producthunt.json`
   - `workflows/phase5a-neon-hot-alerts.json`
   - `workflows/phase5b-neon-medium-digest.json`
   - `workflows/phase6-neon-weekly-summary.json`
7. Open each imported workflow and verify:
   - credential bindings
   - env-var references
   - cron schedules and timezone
8. Run manual test executions for each workflow.
9. Activate workflows once validated.

## Operational Flow and Dedup Strategy

There are two layers of duplicate protection:

- Layer 1: In-workflow static memory (`seenUrls`) with 24h pruning.
- Layer 2: Neon existence check plus upsert by `dedupe_key`.

This combination prevents repeat LLM processing in short windows and prevents duplicate Neon rows over longer periods. Existing Neon rows are skipped before the upsert so previously alerted rows are not reset to unalerted.

## Alerting Logic

- `hot` (`score >= 7`): written to Neon, then alerted by `phase5a-neon-hot-alerts.json`.
- `medium` (`score 5-6`): written to Neon, then included in `phase5b-neon-medium-digest.json`.
- `low` (`score < 5`): written to Neon for historical analysis, no Telegram alert.

## Shared Dashboard Integration

The live dashboard can now combine:

- X/Post and Reddit findings mirrored into Neon by the `X_Post` project
- HN/Product Hunt signals written into Neon by `Workflow 1`
- Weekly report pages stored in Notion by the Neon weekly workflow

That means the dashboard and downstream automations can read the same operational signal table.

## Troubleshooting

### Empty output
- Confirm source APIs are returning data.
- Check keyword filter is not over-restrictive.
- Validate Notion filter date windows for digest and weekly workflows.

### LLM parse failures
- Ensure LLM prompt still returns strict JSON.
- `parse-gemini.js` and workflow parse node include fallback values if parsing fails.

### Notion insert/query errors
- Verify `NOTION_API_KEY`, database IDs, and integration sharing.
- Confirm property names match exactly (case-sensitive).

### Telegram send failures
- Verify bot token, chat ID, and bot permission in target chat or channel.

### Product Hunt API issues
- Confirm `PRODUCTHUNT_DEV_TOKEN` validity and rate limits.

## Security Notes

- Do not commit real secrets to git.
- Keep `.env.example` as placeholders only.
- Rotate tokens immediately if exposed.

## Known Gaps and Extension Ideas

- `scripts/flatten-reddit.js` exists but Reddit is not wired in current workflow JSON.
- Scoring logic in `scripts/scoring.js` may differ from embedded scoring code in exported workflow JSON; keep both synchronized when changing ranking rules.
- Add retries/backoff and observability (error channel, failure Telegram, execution tags).
- Add automated consistency checks between `scripts/` and embedded workflow `jsCode`.
- The older Notion-backed `phase5-telegram.json` and `phase6-weekly-summary.json` remain in the repo for reference, but the Neon-backed workflows should be used going forward.

## License

See `License`.
