const ShareContent = require('@sharecontent/sdk');

const client = new ShareContent({
  token: process.env.SHARECONTENT_TOKEN,
  timeout: 30000,
});

export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, ...params } = req.body;

    switch (action) {
      case 'createShortLink': {
        const { url, title, shortCode } = params;
        const shortLink = await client.shortLinks.create({
          url,
          title,
          short_code: shortCode,
        });
        return res.status(200).json(shortLink);
      }

      case 'getLinkAnalytics': {
        const { shortCode } = params;
        const analytics = await client.analytics.getByLink(shortCode);
        return res.status(200).json(analytics);
      }

      case 'listShortLinks': {
        const links = await client.shortLinks.list();
        return res.status(200).json(links);
      }

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('ShareContent API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};