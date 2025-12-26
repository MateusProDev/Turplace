import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const require = createRequire(import.meta.url);

// Load env for this module
try {
  require('dotenv').config({ path: join(__dirname, '../../.env.local') });
  require('dotenv').config({ path: join(__dirname, '../../.env') });
} catch (e) {
  console.warn('Could not load dotenv:', e.message);
}

const SC = require('@sharecontent/sdk');
const ShareContent = SC.ShareContent || SC.default || SC;

console.log('SHARECONTENT_TOKEN from env:', process.env.SHARECONTENT_TOKEN ? '***SET***' : 'undefined');

let client;
try {
  client = new ShareContent({
    token: process.env.SHARECONTENT_TOKEN,
    timeout: 30000,
  });
  console.log('ShareContent client initialized successfully');
} catch (error) {
  console.error('Failed to initialize ShareContent client:', error && error.message ? error.message : error);
}

export default async (req, res) => {
  console.log('ShareContent handler called with method:', req.method);
  console.log('Request body:', req.body);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, ...params } = req.body;
    console.log('Action:', action, 'Params:', params);

    switch (action) {
      case 'createShortLink': {
        if (!client || !client.shortLinks) {
          console.error('ShareContent client not initialized');
          return res.status(500).json({ error: 'Internal server error', message: 'ShareContent client not initialized' });
        }
        const { url, title, shortCode } = params;
        const shortLink = await client.shortLinks.create({
          url,
          title,
          short_code: shortCode,
        });
        return res.status(200).json(shortLink);
      }

      case 'getLinkAnalytics': {
        if (!client || !client.analytics) {
          console.error('ShareContent client not initialized');
          return res.status(500).json({ error: 'Internal server error', message: 'ShareContent client not initialized' });
        }
        const { shortCode } = params;
        const analytics = await client.analytics.getByLink(shortCode);
        return res.status(200).json(analytics);
      }

      case 'listShortLinks': {
        if (!client || !client.shortLinks) {
          console.error('ShareContent client not initialized');
          return res.status(500).json({ error: 'Internal server error', message: 'ShareContent client not initialized' });
        }
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