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

// Remove SDK dependency entirely - use direct API calls only
console.log('[DEBUG] SHARECONTENT_TOKEN from env:', process.env.SHARECONTENT_TOKEN ? '***SET*** (length: ' + process.env.SHARECONTENT_TOKEN.length + ')' : 'undefined');

// Direct API functions
async function createShortLinkDirect(token, url, title, shortCode) {
  console.log('[DEBUG] Creating short link via direct API call');
  const response = await fetch('https://api.sharecontent.io/api/short-links', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      title,
      ...(shortCode && { short_code: shortCode }),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[ERROR] ShareContent API error:', response.status, errorText);
    
    // If slug already in use, try to find and return the existing link
    if (response.status === 400 && errorText.includes('slug já está em uso')) {
      console.log('[DEBUG] Slug already in use, attempting to find existing link');
      try {
        const links = await listShortLinksDirect(token);
        const existingLink = links.find(link => link.short_code === shortCode);
        if (existingLink) {
          console.log('[DEBUG] Found existing link:', existingLink.short_url);
          return existingLink;
        } else {
          console.error('[ERROR] Existing link not found despite slug in use error');
          throw new Error(`ShareContent API error: ${response.status} ${errorText}`);
        }
      } catch (listError) {
        console.error('[ERROR] Failed to list links after slug in use error:', listError.message);
        throw new Error(`ShareContent API error: ${response.status} ${errorText}`);
      }
    }
    
    throw new Error(`ShareContent API error: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  console.log('[DEBUG] Short link created successfully:', result.short_url);
  return result;
}

async function getLinkAnalyticsDirect(token, shortCode) {
  console.log('[DEBUG] Getting analytics via direct API call for shortCode:', shortCode);

  // Primeiro, precisamos encontrar o ID do link pelo short_code
  const listResponse = await fetch('https://api.sharecontent.io/api/short-links', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!listResponse.ok) {
    const errorText = await listResponse.text();
    throw new Error(`ShareContent List API error: ${listResponse.status} ${errorText}`);
  }

  const listData = await listResponse.json();
  const links = listData.data || listData; // Handle both {data: [...]} and [...] formats

  // Encontrar o link pelo short_code
  const link = links.find(l => l.short_code === shortCode);
  if (!link) {
    throw new Error(`Link with short_code '${shortCode}' not found`);
  }

  console.log('[DEBUG] Found link ID:', link.id, 'for short_code:', shortCode);

  // Agora tentar analytics com o short_code
  const analyticsResponse = await fetch(`https://api.sharecontent.io/api/short-links/${link.short_code}/analytics`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!analyticsResponse.ok) {
    const errorText = await analyticsResponse.text();
    console.error('[ERROR] Analytics API error:', analyticsResponse.status, errorText);
    // Se analytics não estiver disponível, retornar dados básicos do link
    return {
      link_id: link.id,
      short_code: link.short_code,
      views: link.views || 0,
      created_at: link.created_at,
      note: 'Analytics may not be available for this link yet'
    };
  }

  const analytics = await analyticsResponse.json();
  console.log('[DEBUG] Analytics retrieved successfully');
  return analytics;
}

async function listShortLinksDirect(token) {
  console.log('[DEBUG] Listing short links via direct API call');
  const response = await fetch('https://api.sharecontent.io/api/short-links', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[ERROR] ShareContent List API error:', response.status, errorText);
    throw new Error(`ShareContent List API error: ${response.status} ${errorText}`);
  }

  const result = await response.json();  const links = result.data || result; // Handle both {data: [...]} and [...] formats  console.log('[DEBUG] Links listed successfully, count:', links.length);
  return links;
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
        if (!process.env.SHARECONTENT_TOKEN) {
          console.error('[ERROR] SHARECONTENT_TOKEN not found');
          return res.status(500).json({ error: 'Internal server error', message: 'Token not configured' });
        }
        const { url, title, shortCode } = params;
        console.log('[DEBUG] createShortLink params - url:', url, 'title:', title, 'shortCode:', shortCode);

        try {
          const shortLink = await createShortLinkDirect(process.env.SHARECONTENT_TOKEN, url, title, shortCode);
          console.log('[DEBUG] createShortLink success, response keys:', Object.keys(shortLink));
          return res.status(200).json(shortLink);
        } catch (error) {
          console.error('[ERROR] createShortLink failed:', error.message);
          return res.status(500).json({
            error: 'Internal server error',
            message: error.message
          });
        }
      }

      case 'getLinkAnalytics': {
        console.log('[DEBUG] Processing getLinkAnalytics');
        if (!process.env.SHARECONTENT_TOKEN) {
          console.error('[ERROR] SHARECONTENT_TOKEN not found');
          return res.status(500).json({ error: 'Internal server error', message: 'Token not configured' });
        }
        const { shortCode } = params;
        console.log('[DEBUG] getLinkAnalytics params - shortCode:', shortCode);

        try {
          const analytics = await getLinkAnalyticsDirect(process.env.SHARECONTENT_TOKEN, shortCode);
          console.log('[DEBUG] getLinkAnalytics success, response keys:', Object.keys(analytics));
          return res.status(200).json(analytics);
        } catch (error) {
          console.error('[ERROR] getLinkAnalytics failed:', error.message);
          return res.status(500).json({
            error: 'Internal server error',
            message: error.message
          });
        }
      }

      case 'listShortLinks': {
        console.log('[DEBUG] Processing listShortLinks');
        if (!process.env.SHARECONTENT_TOKEN) {
          console.error('[ERROR] SHARECONTENT_TOKEN not found');
          return res.status(500).json({ error: 'Internal server error', message: 'Token not configured' });
        }

        try {
          const links = await listShortLinksDirect(process.env.SHARECONTENT_TOKEN);
          console.log('[DEBUG] listShortLinks success, links count:', links.length);
          return res.status(200).json(links);
        } catch (error) {
          console.error('[ERROR] listShortLinks failed:', error.message);
          return res.status(500).json({
            error: 'Internal server error',
            message: error.message
          });
        }
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