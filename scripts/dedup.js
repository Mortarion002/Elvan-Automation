// Checks each post URL against static workflow memory.
// URLs seen in the last 24h are skipped (not sent to Gemini).
// New URLs are added to static memory before being returned.
const staticData = $getWorkflowStaticData('global');

if (!staticData.seenUrls) staticData.seenUrls = {};

const ONE_DAY = 24 * 60 * 60 * 1000;
const now = Date.now();

// Prune expired entries
for (const url in staticData.seenUrls) {
  if (now - staticData.seenUrls[url] > ONE_DAY) {
    delete staticData.seenUrls[url];
  }
}

const items = $input.all();
const fresh = [];

for (const item of items) {
  const url = item.json.url;
  if (!url) continue;

  if (!staticData.seenUrls[url]) {
    staticData.seenUrls[url] = now;
    fresh.push(item);
  }
}

return fresh;
