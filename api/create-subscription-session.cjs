const Stripe = require('stripe');
const initFirestore = require('./_lib/firebaseAdmin.cjs');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const db = initFirestore();

module.exports = async (req, res) => {
  console.log('[debug] create-subscription-session invoked', { method: req.method, headers: Object.keys(req.headers || {}) });
  try {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { priceId, customerEmail } = req.body;
    if (!priceId) return res.status(400).json({ error: 'priceId required' });

    // Create a lightweight subscription order record (optional)
    const orderRef = db.collection('orders').doc();
    const order = {
      type: 'subscription',
      priceId,
      customerEmail: customerEmail || null,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    await orderRef.set(order);

    const sessionParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/cancel`,
      metadata: { orderId: orderRef.id },
    };

  const session = await stripe.checkout.sessions.create(sessionParams);

  await orderRef.update({ stripeSessionId: session.id });

  return res.status(200).json({ sessionId: session.id, checkoutUrl: session.url, orderId: orderRef.id });
  } catch (err) {
    console.error('create-subscription-session error', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
};
