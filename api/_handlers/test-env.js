export default async (req, res) => {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

  const envStatus = {
    hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
    hasFirebaseSA: !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
    hasFirebaseKey: !!process.env.FIREBASE_PRIVATE_KEY,
    hasFirebaseEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
    hasFirebaseProject: !!process.env.FIREBASE_PROJECT_ID,
    frontendUrl: process.env.FRONTEND_URL || 'not set',
    nodeEnv: process.env.NODE_ENV || 'not set'
  };

  res.json(envStatus);
};
