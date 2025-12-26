import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const SC = require('@sharecontent/sdk');
const ShareContentClient = SC.ShareContentClient || SC.ShareContent || SC.default || SC;

(async () => {
  try {
    const token = process.env.SHARECONTENT_TOKEN || 'MISSING';
    console.log('Using token:', token ? (token === 'MISSING' ? 'MISSING' : '***REDACTED***') : 'none');
    const client = new ShareContentClient({ token, timeout: 5000 });
    console.log('Client created. keys:', Object.keys(client || {}).slice(0, 40));
    if (client.shortLinks) {
      console.log('shortLinks methods:', Object.keys(client.shortLinks).slice(0,40));
    } else {
      console.log('client.shortLinks is undefined');
    }
  } catch (e) {
    console.error('Error creating client:', e && e.message ? e.message : e);
    console.error(e);
    process.exit(1);
  }
})();
