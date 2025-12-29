import admin from 'firebase-admin';

function initFirestore() {
  if (!admin.apps.length) {
    console.log('[FIREBASE] Initializing Firebase Admin...');

    // Log available environment variables (without sensitive data)
    const hasServiceAccountJson = !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const hasPrivateKey = !!process.env.FIREBASE_PRIVATE_KEY;
    const hasClientEmail = !!process.env.FIREBASE_CLIENT_EMAIL;
    const hasProjectId = !!process.env.FIREBASE_PROJECT_ID;

    console.log('[FIREBASE] Environment check:', {
      hasServiceAccountJson,
      hasPrivateKey,
      hasClientEmail,
      hasProjectId,
      projectId: process.env.FIREBASE_PROJECT_ID || 'NOT_SET'
    });

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      try {
        console.log('[FIREBASE] Using FIREBASE_SERVICE_ACCOUNT_JSON');
        const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        admin.initializeApp({ credential: admin.credential.cert(sa) });
        console.log('[FIREBASE] ✅ Initialized with service account JSON');
      } catch (err) {
        console.error('[FIREBASE] ❌ FIREBASE_SERVICE_ACCOUNT_JSON is invalid JSON:', err.message);
        throw err;
      }
    } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
      try {
        console.log('[FIREBASE] Using individual environment variables');
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          }),
        });
        console.log('[FIREBASE] ✅ Initialized with individual variables');
      } catch (err) {
        console.error('[FIREBASE] ❌ Failed to initialize with individual variables:', err.message);
        throw err;
      }
    } else {
      const missing = [];
      if (!hasServiceAccountJson) missing.push('FIREBASE_SERVICE_ACCOUNT_JSON');
      if (!hasPrivateKey) missing.push('FIREBASE_PRIVATE_KEY');
      if (!hasClientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
      if (!hasProjectId) missing.push('FIREBASE_PROJECT_ID');

      console.error('[FIREBASE] ❌ Missing Firebase credentials. Required:', missing.join(', '));
      throw new Error(`Missing Firebase credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PRIVATE_KEY + FIREBASE_CLIENT_EMAIL + FIREBASE_PROJECT_ID. Missing: ${missing.join(', ')}`);
    }
  } else {
    console.log('[FIREBASE] Using existing Firebase Admin app');
  }

  return admin.firestore();
}

export default initFirestore;
