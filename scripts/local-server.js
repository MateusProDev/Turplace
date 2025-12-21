import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import loadEnv from './load-env.cjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

loadEnv();

const app = express();
app.use(bodyParser.json({ limit: '6mb' }));
app.use(bodyParser.raw({ type: 'application/json' }));

// Add logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Import the handlers from api folder
// import createSub from '../api/_handlers/create-subscription-session.js';
// import createCheckout from '../api/_handlers/create-checkout-session.js';
// import createCheckoutGuest from '../api/_handlers/create-checkout-session-guest.js';
// import createStripeAccount from '../api/_handlers/create-stripe-account.js';
// import wallet from '../api/_handlers/wallet.js';
// import webhook from '../api/_handlers/webhook.js';

// Simple test handler
const testHandler = (req, res) => {
  res.json({ message: 'Test endpoint working', userId: req.body.userId });
};

app.post('/api/create-subscription-session', testHandler);
app.post('/api/create-checkout-session', testHandler);
app.post('/api/create-checkout-session-guest', testHandler);
app.post('/api/create-stripe-account', testHandler);
app.get('/api/wallet', (req, res) => res.json({ totalSales: 0, totalCommissions: 0, totalReceived: 0, availableBalance: 0, pendingAmount: 0, sales: [], pendingSales: [], stripeAccountId: null, chavePix: '' }));
app.post('/api/webhook', testHandler);

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Local API server listening on http://localhost:${port}`);
}).on('error', (err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
