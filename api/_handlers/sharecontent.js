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
  console.log('[DEBUG] dotenv config attempted');
} catch (e) {
  console.warn('[WARN] Could not load dotenv:', e.message);
}

const SC = require('@sharecontent/sdk');
const ShareContent = SC.ShareContent || SC.default || SC;
console.log('[DEBUG] ShareContent SDK loaded:', typeof ShareContent);

console.log('[DEBUG] SHARECONTENT_TOKEN from env:', process.env.SHARECONTENT_TOKEN ? '***SET*** (length: ' + process.env.SHARECONTENT_TOKEN.length + ')' : 'undefined');

let client;
try {
  if (!process.env.SHARECONTENT_TOKEN) {
    throw new Error('SHARECONTENT_TOKEN is not defined');
  }
  client = new ShareContent({
    token: process.env.SHARECONTENT_TOKEN,
    timeout: 30000,
  });
  console.log('[DEBUG] ShareContent client initialized successfully');
} catch (error) {
  console.error('[ERROR] Failed to initialize ShareContent client:', error && error.message ? error.message : error);
  client = null; // Ensure client is null on failure
}

// Fallback function using fetch directly
async function createShortLinkDirect(token, url, title, shortCode) {
  console.log('[DEBUG] Using direct fetch fallback for createShortLink');
  const response = await fetch('https://api.sharecontent.io/short-links', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      title,
      short_code: shortCode,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ShareContent API error: ${response.status} ${errorText}`);
  }

  return await response.json();
}

export default async (req, res) => {
  console.log('[DEBUG] ShareContent handler called with method:', req.method);
  console.log('[DEBUG] Request headers:', JSON.stringify(req.headers, null, 2));

  if (req.method !== 'POST') {
    console.log('[DEBUG] Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, ...params } = req.body;
    console.log('[DEBUG] Action:', action);
    console.log('[DEBUG] Params keys:', Object.keys(params));

    switch (action) {
      case 'createShortLink': {
        console.log('[DEBUG] Processing createShortLink');
        const { url, title, shortCode } = params;
        console.log('[DEBUG] createShortLink params - url:', url, 'title:', title, 'shortCode:', shortCode);

        let shortLink;
        try {
          if (client && client.shortLinks) {
            console.log('[DEBUG] Trying SDK method...');
            shortLink = await client.shortLinks.create({
              url,
              title,
              short_code: shortCode,
            });
            console.log('[DEBUG] SDK method successful');
          } else {
            console.log('[DEBUG] SDK not available, using direct fetch...');
            shortLink = await createShortLinkDirect(process.env.SHARECONTENT_TOKEN, url, title, shortCode);
          }
        } catch (sdkError) {
          console.log('[WARN] SDK method failed, trying direct fetch:', sdkError.message);
          try {
            shortLink = await createShortLinkDirect(process.env.SHARECONTENT_TOKEN, url, title, shortCode);
            console.log('[DEBUG] Direct fetch successful');
          } catch (fetchError) {
            console.error('[ERROR] Both SDK and direct fetch failed');
            throw fetchError;
          }
        }

        console.log('[DEBUG] createShortLink success, response keys:', Object.keys(shortLink));
        return res.status(200).json(shortLink);
      }

      case 'getLinkAnalytics': {
        console.log('[DEBUG] Processing getLinkAnalytics');
        if (!client || !client.analytics) {
          console.error('[ERROR] ShareContent client not initialized or missing analytics');
          return res.status(500).json({ error: 'Internal server error', message: 'ShareContent client not initialized' });
        }
        const { shortCode } = params;
        console.log('[DEBUG] getLinkAnalytics params - shortCode:', shortCode);
        console.log('[DEBUG] Calling client.analytics.getByLink...');
        const analytics = await client.analytics.getByLink(shortCode);
        console.log('[DEBUG] getLinkAnalytics success, response keys:', Object.keys(analytics));
        return res.status(200).json(analytics);
      }

      case 'listShortLinks': {
        console.log('[DEBUG] Processing listShortLinks');
        if (!client || !client.shortLinks) {
          console.error('[ERROR] ShareContent client not initialized or missing shortLinks');
          return res.status(500).json({ error: 'Internal server error', message: 'ShareContent client not initialized' });
        }
        console.log('[DEBUG] Calling client.shortLinks.list...');
        const links = await client.shortLinks.list();
        console.log('[DEBUG] listShortLinks success, links count:', links.length);
        return res.status(200).json(links);
      }

      default:
        console.log('[DEBUG] Invalid action:', action);
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('[ERROR] ShareContent API error:', error);
    console.error('[ERROR] Error stack:', error.stack);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};