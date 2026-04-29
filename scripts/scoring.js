const intentKeywords = [
  'alternative', 'replace', 'replacement', 'looking for',
  'recommend', 'switch', 'switching', 'what do you use',
  'anyone using', 'anyone tried', 'moved away', 'moved from',
  'migrated', 'shut down', 'shutdown', 'pricing', 'expensive',
  'cost-effective', 'hard to justify', 'room to build',
];

const competitorKeywords = [
  'delighted', 'qualtrics', 'survicate', 'medallia', 'uservoice',
  'getsatisfaction', 'hotjar', 'intercom',
];

const directCategoryKeywords = [
  'nps', 'csat', 'net promoter', 'customer feedback', 'feedback tool',
  'customer feedback tool', 'survey tool', 'customer satisfaction',
  'customer effort', 'voice of customer', 'in-app feedback',
];

const items = $input.all();
const results = [];

for (const item of items) {
  const title = item.json.title || '';
  const body = item.json.body || '';
  const base_score = item.json.base_score || 1;
  const text = (title + ' ' + body).toLowerCase();
  let boost = 0;
  if (intentKeywords.some((kw) => text.includes(kw))) boost += 2;
  if (competitorKeywords.some((kw) => text.includes(kw))) boost += 2;
  if (directCategoryKeywords.some((kw) => text.includes(kw))) boost += 1;

  const boosted_score = Math.max(0, Math.min(10, Number(base_score || 1) + boost));
  const tier = boosted_score >= 8 ? 'hot' : boosted_score >= 5 ? 'medium' : 'low';
  results.push({ json: { ...item.json, boosted_score, tier } });
}

return results;
