// Parses the raw JSON string returned by the Basic LLM Chain node.
// Merges parsed fields back onto the original post item.
// Falls back to safe defaults if parsing fails.
const items = $input.all();
const results = [];

for (const item of items) {
  const rawText = item.json.text || item.json.output || item.json.response || '';

  let parsed = {};
  try {
    const cleaned = rawText
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();
    parsed = JSON.parse(cleaned);
  } catch (_) {
    parsed = {
      pain_point: 'Unable to parse Gemini response',
      intent: 'learning',
      urgency: 'low',
      tool_mentioned: null,
      elvan_angle: '',
      score: 1,
      draft_reply: '',
    };
  }

  results.push({
    json: {
      ...item.json,
      pain_point: parsed.pain_point || '',
      intent: parsed.intent || 'learning',
      urgency: parsed.urgency || 'low',
      tool_mentioned: parsed.tool_mentioned || null,
      elvan_angle: parsed.elvan_angle || '',
      base_score: Number(parsed.score) || 1,
      draft_reply: parsed.draft_reply || '',
    },
  });
}

return results;
