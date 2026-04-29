const productTerms = [
  'nps', 'csat', 'ces', 'net promoter', 'customer satisfaction',
  'customer effort', 'survey tool', 'feedback tool', 'customer feedback tool',
  'in-app feedback', 'user feedback tool', 'voice of customer', 'voc',
  'churn survey', 'customer feedback', 'user feedback', 'collect feedback',
  'gather feedback', 'feedback from customers', 'feedback from users',
];

const competitorTerms = [
  'qualtrics', 'delighted', 'survicate', 'medallia', 'uservoice',
  'getsatisfaction', 'hotjar', 'intercom survey',
];

const broadFormTerms = ['typeform', 'form builder', 'forms'];

const painTerms = [
  'alternative', 'replace', 'replacement', 'switch', 'switching',
  'migrate', 'migration', 'pricing', 'expensive', 'cost', 'too complex',
  'hard to justify', 'recommend', 'what do you use', 'looking for',
  'anyone found', 'room to build', 'frustration', 'shut down', 'shutdown',
  'monetize', 'monetization',
];

const acronymTerms = ['nps', 'csat', 'ces', 'voc'];

function hasTerm(text, term) {
  if (acronymTerms.includes(term)) {
    return new RegExp('(^|[^a-z0-9])' + term + '([^a-z0-9]|$)', 'i').test(text);
  }
  return text.includes(term);
}

const items = $input.all();
const filtered = [];

for (const item of items) {
  const title = String(item.json.title || '').toLowerCase();
  const body = String(item.json.body || '').toLowerCase();
  const text = title + ' ' + body;

  const hasProduct = productTerms.some((term) => hasTerm(text, term));
  const hasCompetitor = competitorTerms.some((term) => hasTerm(text, term));
  const hasBroadForm = broadFormTerms.some((term) => hasTerm(text, term));
  const hasPain = painTerms.some((term) => hasTerm(text, term));

  if (hasProduct || hasCompetitor || (hasBroadForm && hasPain && hasProduct)) filtered.push(item);
}

return filtered;
