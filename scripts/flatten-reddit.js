// Runs once for all items. Each item is a Reddit API response (one per subreddit).
// Outputs one item per individual post.
const items = $input.all();
const posts = [];

for (const item of items) {
  const body = item.json;
  const children = body?.data?.children || [];

  for (const child of children) {
    const d = child.data;
    if (!d || d.stickied) continue;

    posts.push({
      json: {
        title: d.title || '',
        body: d.selftext || '',
        url: `https://www.reddit.com${d.permalink}`,
        author: d.author || '',
        subreddit: d.subreddit || '',
        source: 'Reddit',
        created_utc: d.created_utc || 0,
      },
    });
  }
}

return posts;
