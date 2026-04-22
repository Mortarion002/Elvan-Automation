// Runs once for all items. Each item is an HN Algolia API response (one per query).
// Outputs one item per individual hit.
const items = $input.all();
const posts = [];

for (const item of items) {
  const hits = item.json?.hits || [];

  for (const hit of hits) {
    if (!hit.title) continue;

    posts.push({
      json: {
        title: hit.title || '',
        body: hit.story_text || hit.comment_text || '',
        url: 'https://news.ycombinator.com/item?id=' + hit.objectID,
        author: hit.author || '',
        subreddit: '',
        source: 'HackerNews',
        objectID: hit.objectID || '',
        points: hit.points || 0,
        num_comments: hit.num_comments || 0,
      },
    });
  }
}

return posts;
