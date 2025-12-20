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

// Import the handlers from api folder
import createSub from '../api/_handlers/create-subscription-session.js';
import createCheckout from '../api/_handlers/create-checkout-session.js';
import createCheckoutGuest from '../api/_handlers/create-checkout-session-guest.js';
import webhook from '../api/_handlers/webhook.js';

app.post('/api/create-subscription-session', (req, res) => createSub(req, res));
app.post('/api/create-checkout-session', (req, res) => createCheckout(req, res));
app.post('/api/create-checkout-session-guest', (req, res) => createCheckoutGuest(req, res));
app.post('/api/webhook', (req, res) => webhook(req, res));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Local API server listening on http://localhost:${port}`);
});
