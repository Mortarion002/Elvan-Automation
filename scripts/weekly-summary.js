// Aggregates all Notion pages from the last 7 days into summary stats.
// Outputs one item with: total, hot_count, by_source, top_intent,
// top5_leads, top3_competitors, top_subreddit, date_range, gemini_prompt.
const items = $input.all();
const pages = [];

for (const item of items) {
  const results = item.json.results || [];
  for (const page of results) {
    const props = page.properties || {};
    const titleArr = props['Title'] && props['Title'].title ? props['Title'].title : [];
    const toolArr = props['Tool Mentioned'] && props['Tool Mentioned'].rich_text ? props['Tool Mentioned'].rich_text : [];
    const subArr = props['Subreddit'] && props['Subreddit'].rich_text ? props['Subreddit'].rich_text : [];
    pages.push({
      source: props['Source'] && props['Source'].select ? props['Source'].select.name : 'Unknown',
      intent: props['Intent'] && props['Intent'].select ? props['Intent'].select.name : 'unknown',
      boosted_score: props['Boosted Score'] && props['Boosted Score'].number !== null ? props['Boosted Score'].number : 0,
      tool_mentioned: toolArr[0] ? toolArr[0].plain_text.toLowerCase().trim() : '',
      subreddit: subArr[0] ? subArr[0].plain_text : '',
      title: titleArr[0] ? titleArr[0].plain_text : '',
      url: props['URL'] && props['URL'].url ? props['URL'].url : '',
    });
  }
}

// Count by source
const bySource = {};
pages.forEach(p => { bySource[p.source] = (bySource[p.source] || 0) + 1; });

// Count by intent, pick top
const byIntent = {};
pages.forEach(p => { byIntent[p.intent] = (byIntent[p.intent] || 0) + 1; });
const topIntent = Object.entries(byIntent).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

// Hot leads
const hotCount = pages.filter(p => p.boosted_score >= 8).length;

// Top 5 hottest leads
const top5Leads = [...pages].sort((a, b) => b.boosted_score - a.boosted_score).slice(0, 5);

// Top 3 competitors
const competitors = {};
pages.forEach(p => {
  if (p.tool_mentioned) competitors[p.tool_mentioned] = (competitors[p.tool_mentioned] || 0) + 1;
});
const top3Competitors = Object.entries(competitors).sort((a, b) => b[1] - a[1]).slice(0, 3);

// Most active subreddit
const subreddits = {};
pages.forEach(p => { if (p.subreddit) subreddits[p.subreddit] = (subreddits[p.subreddit] || 0) + 1; });
const topSubreddit = Object.entries(subreddits).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

// Date range
const now = new Date();
const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
const fmt = d => d.toLocaleDateString('en-IN', {timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric'});
const dateRange = `${fmt(weekAgo)} – ${fmt(now)}`;

// Build Gemini prompt
const sourceStr = Object.entries(bySource).map(([k, v]) => `${k}: ${v}`).join(', ') || 'none';
const competitorStr = top3Competitors.map(([name, count], i) => `${i + 1}. ${name} (${count})`).join(', ') || 'none';
const topLeadStr = top5Leads.length > 0 ? `"${top5Leads[0].title}" — Score: ${top5Leads[0].boosted_score}` : 'N/A';

const geminiPrompt = `You are a business analyst for Elvan.ai, a B2B SaaS NPS/CSAT/CES survey platform.

Write a 3-4 sentence narrative summary of this week's signal intelligence. Focus on key patterns, buying intent, and what the team should prioritize. No bullet points. Plain text only.

Weekly data (${dateRange}):
- Total signals: ${pages.length}
- Hot leads (score ≥ 8): ${hotCount}
- By source: ${sourceStr}
- Dominant intent: ${topIntent}
- Top competitors: ${competitorStr}
- Hottest lead: ${topLeadStr}`;

return [{
  json: {
    total: pages.length,
    hot_count: hotCount,
    by_source: bySource,
    top_intent: topIntent,
    top5_leads: top5Leads,
    top3_competitors: top3Competitors,
    top_subreddit: topSubreddit,
    date_range: dateRange,
    gemini_prompt: geminiPrompt,
  }
}];
