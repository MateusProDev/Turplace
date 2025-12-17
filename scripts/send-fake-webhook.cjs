require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');
const fetch = require('node-fetch');

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (!webhookSecret) {
  console.error('STRIPE_WEBHOOK_SECRET not set in .env.local');
  process.exit(1);
}

const sessionId = process.argv[2];
const orderId = process.argv[3];
if (!sessionId || !orderId) {
  console.error('Usage: node send-fake-webhook.cjs <sessionId> <orderId>');
  process.exit(1);
}

const event = {
  id: 'evt_local_' + Date.now(),
  object: 'event',
  api_version: '2023-08-16',
  type: 'checkout.session.completed',
  data: {
    object: {
      id: sessionId,
      object: 'checkout.session',
      metadata: { orderId },
      payment_intent: 'pi_local_' + Math.random().toString(36).slice(2),
    }
  }
};

const payload = JSON.stringify(event);
const t = Math.floor(Date.now() / 1000);
const signedPayload = `${t}.${payload}`;
const signature = crypto.createHmac('sha256', webhookSecret).update(signedPayload).digest('hex');
const header = `t=${t},v1=${signature}`;

(async () => {
  const res = await fetch('http://localhost:3000/api/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': header,
    },
    body: payload,
  });
  console.log('Webhook response status:', res.status);
  const text = await res.text();
  console.log('Webhook response body:', text);
})();
