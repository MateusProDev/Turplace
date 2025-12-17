const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(bodyParser.json({ limit: '6mb' }));
app.use(bodyParser.raw({ type: 'application/json' }));

// Require the handlers from api folder
const createSub = require(path.join(__dirname, '..', 'api', 'create-subscription-session.js'));
const createCheckout = require(path.join(__dirname, '..', 'api', 'create-checkout-session.js'));
const webhook = require(path.join(__dirname, '..', 'api', 'webhook.js'));

app.post('/api/create-subscription-session', (req, res) => createSub(req, res));
app.post('/api/create-checkout-session', (req, res) => createCheckout(req, res));
app.post('/api/webhook', (req, res) => webhook(req, res));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Local API server listening on http://localhost:${port}`);
});
