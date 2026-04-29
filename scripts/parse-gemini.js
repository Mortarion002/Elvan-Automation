// Parses the raw JSON string returned by the Basic LLM Chain node.
// Merges parsed fields back onto the original post item and drops bad parses.
const llmItems = $input.all();
const sourceItems = $('Dedup Static Memory').all();
const results = [];

function safeJsonParse(rawText) {
  const cleaned = String(rawText || '')
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return JSON.parse(cleaned.slice(start, end + 1));
}

for (let i = 0; i < llmItems.length; i++) {
  const item = llmItems[i];
  const source = sourceItems[i] ? sourceItems[i].json : {};
  const rawText = item.json.text || item.json.output || item.json.response || item.json.content || '';
  let parsed;

  try {
    parsed = safeJsonParse(rawText);
  } catch (_) {
    parsed = null;
  }

  if (!parsed || typeof parsed !== 'object') continue;

  results.push({
    json: {
      ...source,
      pain_point: String(parsed.pain_point || '').trim(),
      intent: String(parsed.intent || 'learning').trim().toLowerCase(),
      urgency: String(parsed.urgency || 'low').trim().toLowerCase(),
      tool_mentioned: parsed.tool_mentioned ? String(parsed.tool_mentioned).trim() : null,
      elvan_angle: String(parsed.elvan_angle || '').trim(),
      base_score: Number(parsed.score) || 1,
      draft_reply: String(parsed.draft_reply || '').trim(),
      llm_raw_output: String(rawText || ''),
    },
  });
}

return results;
