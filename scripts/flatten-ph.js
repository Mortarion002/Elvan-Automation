// Parses Product Hunt GraphQL response (data.posts.edges[].node).
// Merges tagline + description + top comments into body.
// Outputs one item per post.
const items = $input.all();
const posts = [];

for (const item of items) {
  const edges = item.json?.data?.posts?.edges || [];

  for (const edge of edges) {
    const node = edge.node;
    if (!node || !node.name) continue;

    const commentBodies = (node.comments?.edges || [])
      .map(e => e.node?.body || '')
      .filter(Boolean)
      .join(' | ');

    posts.push({
      json: {
        title: node.name || '',
        body: [node.tagline, node.description, commentBodies].filter(Boolean).join(' '),
        url: node.url || '',
        author: '',
        subreddit: '',
        source: 'ProductHunt',
        ph_id: node.id || '',
        votes: node.votesCount || 0,
        comments_count: node.commentsCount || 0,
      },
    });
  }
}

return posts;
