const path = require('path');
const loadEnv = require('./load-env.cjs');
loadEnv();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '6mb' }));

// Add logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Require the handlers from api folder (agora .cjs) after envs loaded
const createSub = require(path.join(__dirname, '..', 'api', 'create-subscription-session.cjs'));
const createCheckout = require(path.join(__dirname, '..', 'api', 'create-checkout-session.cjs'));
const webhook = require(path.join(__dirname, '..', 'api', 'webhook.cjs'));

app.post('/api/create-subscription-session', (req, res) => createSub(req, res));
app.post('/api/create-checkout-session', (req, res) => createCheckout(req, res));

// webhook needs raw body for stripe signature verification
app.post('/api/webhook', bodyParser.raw({ type: 'application/json' }), (req, res) => webhook(req, res));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Local API server listening on http://localhost:${port}`);
});
