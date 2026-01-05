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
const createSub = require(path.join(__dirname, '..', 'api', '_handlers', 'create-subscription-session.js')).default;
const createCheckout = require(path.join(__dirname, '..', 'api', '_handlers', 'create-checkout-session.js')).default;
const createCheckoutGuest = require(path.join(__dirname, '..', 'api', '_handlers', 'create-checkout-session-guest.js')).default;
const webhook = require(path.join(__dirname, '..', 'api', '_handlers', 'webhook.js')).default;
const userOrders = require(path.join(__dirname, '..', 'api', '_handlers', 'user-orders.js')).default;
const deleteOrder = require(path.join(__dirname, '..', 'api', '_handlers', 'delete-order.js')).default;
// mount dev-only endpoint if present
let devApply = null;
try {
  devApply = require(path.join(__dirname, '..', 'api', 'dev', 'apply-plan.cjs'));
} catch (e) {
  // ignore if not present
}

app.post('/api/create-subscription-session', (req, res) => createSub(req, res));
app.post('/api/create-checkout-session', (req, res) => createCheckout(req, res));
app.post('/api/create-checkout-session-guest', (req, res) => createCheckoutGuest(req, res));

// webhook needs raw body for stripe signature verification
app.post('/api/webhook', bodyParser.raw({ type: 'application/json' }), (req, res) => webhook(req, res));

// Add user-orders and delete-order endpoints
app.get('/api/user-orders', (req, res) => userOrders(req, res));
app.delete('/api/delete-order', (req, res) => deleteOrder(req, res));

if (devApply) {
  app.all('/api/dev/apply-plan', (req, res) => devApply(req, res));
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Local API server listening on http://localhost:${port}`);
});
