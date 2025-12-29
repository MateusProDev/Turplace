const express = require('express');
const bodyParser = require('body-parser');
const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function initFirebase() {
  if (!admin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      admin.initializeApp({ credential: admin.credential.cert(sa) });
    } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      throw new Error('Missing Firebase credentials');
    }
  }
  return admin.firestore();
}

const db = initFirebase();

const app = express();
app.use(require('cors')());

// We need the raw body for stripe signature verification
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    if (!webhookSecret) {
      event = JSON.parse(req.body.toString());
    } else {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    }
  } catch (err) {
    console.error('Webhook signature/parse error:', err && err.message ? err.message : err);
    return res.status(400).send(`Webhook Error: ${err && err.message ? err.message : 'invalid payload'}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const orderId = (session.metadata && (session.metadata.orderId || session.metadata.order_id)) || session.client_reference_id || null;
      console.log('Received checkout.session.completed for orderId=', orderId);
      if (orderId) {
        const orderRef = db.collection('orders').doc(orderId);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) {
          console.warn('Order not found', orderId);
        } else {
          const order = orderSnap.data();
          if (order.status !== 'paid') {
            await orderRef.update({ status: 'paid', paidAt: new Date().toISOString(), stripePaymentIntentId: session.payment_intent });
            console.log('Order updated to paid:', orderId);
          } else {
            console.log('Order already paid:', orderId);
          }
        }
      } else {
        console.warn('No orderId in session metadata');
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Processing webhook failed:', err);
    res.status(500).send('Internal error');
  }
});

// Webhook para AbacatePay
app.post('/api/abacatepay-webhook', express.json(), async (req, res) => {
  console.log('[Local Webhook Server] AbacatePay webhook received:', req.body);

  try {
    const event = req.body;

    if (event.event === 'billing.paid') {
      console.log('[Local Webhook Server] Processing billing.paid event');

      const metadata = event.data.billing?.metadata || {};
      const orderId = metadata.orderId;

      if (orderId) {
        const orderRef = db.collection('orders').doc(orderId);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) {
          console.warn('[Local Webhook Server] Order not found:', orderId);
        } else {
          const order = orderSnap.data();
          if (order.status !== 'paid') {
            await orderRef.update({
              status: 'paid',
              paidAt: new Date().toISOString(),
              abacatepayEventData: event
            });
            console.log('[Local Webhook Server] Order updated to paid:', orderId);
          } else {
            console.log('[Local Webhook Server] Order already paid:', orderId);
          }
        }
      } else {
        console.warn('[Local Webhook Server] No orderId in metadata');
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[Local Webhook Server] Processing AbacatePay webhook failed:', err);
    res.status(500).send('Internal error');
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Local webhook server running at http://localhost:${port}/api/webhook`));
