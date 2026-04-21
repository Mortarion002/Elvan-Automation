// Applies boost rules on top of Gemini's base score.
// +25 if post contains "?" AND any intent keyword → buying signal
// +10 if "delighted" mentioned → competitor mention bonus
// Assigns tier: hot (>=8), medium (5-7), low (<5)

const intentKeywords = [
  'alternative', 'replace', 'replacement', 'looking for',
  'recommend', 'switch', 'switching', 'what do you use',
  'anyone using', 'anyone tried', 'moved away', 'moved from',
  'migrated', 'shut down', 'shutdown',
];

const items = $input.all();
const results = [];

for (const item of items) {
  const { title = '', body = '', base_score = 1 } = item.json;
  const text = `${title} ${body}`.toLowerCase();

  let boost = 0;
  if (text.includes('?') && intentKeywords.some((kw) => text.includes(kw))) boost += 25;
  if (text.includes('delighted')) boost += 10;

  const boosted_score = base_score + boost;
  const tier = boosted_score >= 8 ? 'hot' : boosted_score >= 5 ? 'medium' : 'low';

  results.push({
    json: {
      ...item.json,
      boosted_score,
      tier,
    },
  });
}

return results;
