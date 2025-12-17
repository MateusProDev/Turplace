require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');
const admin = require('firebase-admin');

const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  console.error('STRIPE_SECRET_KEY not set in .env.local');
  process.exit(1);
}

const stripe = new Stripe(stripeKey);

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
      console.error('Missing Firebase credentials');
      process.exit(1);
    }
  }
  return admin.firestore();
}

async function main() {
  const db = initFirebase();

  const priceId = process.argv[2] || 'price_1Seyf0KlR2RHdJ4ptJNmAuKi'; // default professional

  const orderRef = db.collection('orders').doc();
  const order = {
    type: 'subscription',
    priceId,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  await orderRef.set(order);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/cancel`,
    metadata: { orderId: orderRef.id },
  });

  await orderRef.update({ stripeSessionId: session.id });

  console.log('Created session:', JSON.stringify({ sessionId: session.id, checkoutUrl: session.url, orderId: orderRef.id }, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
