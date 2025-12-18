const Stripe = require('stripe');
const initFirestore = require('./_lib/firebaseAdmin.cjs');

module.exports = async (req, res) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const db = initFirestore();
  console.log('[debug] create-subscription-session invoked', { method: req.method, headers: Object.keys(req.headers || {}), body: req.body });
  try {
    // Allow simple GET for healthcheck/debug in prod (helps detect 404 routing issues)
    if (req.method === 'GET') {
      return res.status(200).json({ ok: true, route: '/api/create-subscription-session', method: 'GET', msg: 'Function is deployed' });
    }
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { priceId, customerEmail, userId } = req.body;
    if (!priceId) {
      console.warn('[create-subscription-session] priceId não informado');
      return res.status(400).json({ error: 'priceId required' });
    }

    // Create a lightweight subscription order record (optional)
    const orderRef = db.collection('orders').doc();
    // Try to enrich order with plan price from Firestore (if available)
    let amount = null;
    try {
      const planSnap = await db.collection('plans').where('stripePriceId', '==', priceId).limit(1).get();
      if (!planSnap.empty) {
        const pd = planSnap.docs[0].data();
        amount = pd.price_cents || null;
      } else {
        const planDoc = await db.collection('plans').doc(priceId).get();
        if (planDoc.exists) amount = planDoc.data().price_cents || null;
      }
      console.log('[create-subscription-session] Valor do plano resolvido', { priceId, amount });
    } catch (e) {
      console.warn('[create-subscription-session] Falha ao resolver valor do plano:', e && e.message ? e.message : e);
    }

    const order = {
      type: 'subscription',
      priceId,
      stripePriceId: priceId,
      customerEmail: customerEmail || null,
      userId: userId || null,
      amount: amount,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    await orderRef.set(order);
    console.log('[create-subscription-session] Ordem de assinatura criada', { orderId: orderRef.id, order });

    const sessionParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/cancel`,
      metadata: { orderId: orderRef.id, userId: userId || '', customerEmail: customerEmail || '' },
    };

    let session;
    try {
      session = await stripe.checkout.sessions.create(sessionParams);
      console.log('[create-subscription-session] Sessão Stripe criada', { sessionId: session.id, url: session.url });
    } catch (err) {
      console.error('[create-subscription-session] Erro ao criar sessão Stripe', err);
      throw err;
    }

    await orderRef.update({ stripeSessionId: session.id });
    console.log('[create-subscription-session] Ordem atualizada com sessionId', { orderId: orderRef.id, sessionId: session.id });

    return res.status(200).json({ sessionId: session.id, checkoutUrl: session.url, orderId: orderRef.id });
  } catch (err) {
    console.error('[create-subscription-session] Erro geral', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
};
