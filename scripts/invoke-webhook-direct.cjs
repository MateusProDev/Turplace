require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');
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

async function main() {
  const sessionId = process.argv[2];
  const orderId = process.argv[3];
  if (!sessionId || !orderId) {
    console.error('Usage: node invoke-webhook-direct.cjs <sessionId> <orderId>');
    process.exit(1);
  }

  const db = initFirebase();

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

  try {
    console.log('Processing event locally:', event.id);
    // replicate webhook processing logic
    const session = event.data.object;
    const resolvedOrderId = (session.metadata && (session.metadata.orderId || session.metadata.order_id)) || session.client_reference_id || null;
    console.log('Resolved orderId:', resolvedOrderId);
    if (!resolvedOrderId) {
      console.warn('No orderId found, aborting.');
      return;
    }

    const orderRef = db.collection('orders').doc(resolvedOrderId);
    console.log('Fetching order', resolvedOrderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
      console.warn('Order not found in Firestore', resolvedOrderId);
      return;
    }
    const order = orderSnap.data();
    console.log('Order current status:', order.status);
    if (order.status === 'paid') {
      console.log('Order already paid - idempotent exit');
      return;
    }

    const update = { status: 'paid', paidAt: new Date().toISOString(), stripePaymentIntentId: session.payment_intent };
    console.log('Updating order with', update);
    await orderRef.update(update);
    console.log('Order updated successfully');
  } catch (err) {
    console.error('Error processing webhook locally:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
}

main();
