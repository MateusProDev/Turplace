const path = require('path');
const fs = require('fs');

function loadEnv() {
  // Load envs early so require()d modules that run during module evaluation see them
  try {
    // prefer dotenv if available (dev dependency)
    require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
    require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
  } catch (e) {
    // ignore if dotenv isn't installed/available in production
  }

  console.log('SHARECONTENT_TOKEN loaded:', process.env.SHARECONTENT_TOKEN);

  // Fallback: if FIREBASE_SERVICE_ACCOUNT_JSON isn't set after dotenv, try to read .env.local manually
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const envPath = path.join(__dirname, '..', '.env.local');
      if (fs.existsSync(envPath)) {
        const raw = fs.readFileSync(envPath, 'utf8');
        raw.split(/\r?\n/).forEach(line => {
          const m = line.match(/^([^=]+)=(.*)$/);
          if (m) {
            const key = m[1].trim();
            let val = m[2].trim();
            // remove surrounding quotes
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            if (!process.env[key]) process.env[key] = val;
          }
        });
        console.log('Loaded .env.local fallback into process.env (partial)');
      }
    } catch (e) {
      console.warn('Failed to read .env.local fallback:', e && e.message ? e.message : e);
    }
  }
}

module.exports = loadEnv;