// Filters posts to only those containing at least one keyword in title or body.
const keywords = [
  'nps', 'csat', 'ces', 'net promoter', 'customer feedback',
  'customer satisfaction', 'feedback tool', 'survey tool', 'churn',
  'customer effort', 'typeform', 'delighted', 'survicate',
  'medallia', 'customer success', 'onboarding survey',
  'qualtrics', 'hotjar', 'intercom survey', 'feedback loop',
];

const items = $input.all();
const filtered = [];

for (const item of items) {
  const text = `${item.json.title} ${item.json.body}`.toLowerCase();
  if (keywords.some((kw) => text.includes(kw))) {
    filtered.push(item);
  }
}

return filtered;
