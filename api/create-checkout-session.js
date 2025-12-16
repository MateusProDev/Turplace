const Stripe = require('stripe');
const initFirestore = require('./_lib/firebaseAdmin');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const db = initFirestore();

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { serviceId, agencyId, quantity = 1 } = req.body;
    if (!serviceId) return res.status(400).json({ error: 'serviceId required' });

    // Busca o serviço
    const serviceSnap = await db.collection('services').doc(serviceId).get();
    if (!serviceSnap.exists) return res.status(404).json({ error: 'Service not found' });
    const service = serviceSnap.data();

    // Busca provider
    const providerId = service.providerId;
    const providerSnap = await db.collection('providers').doc(providerId).get();
    if (!providerSnap.exists) return res.status(404).json({ error: 'Provider not found' });
    const provider = providerSnap.data();

    // Recupera plan do provider (padrão free se não existir)
    const planId = provider.planId || 'free';
    const planSnap = await db.collection('plans').doc(planId).get();
    const plan = planSnap.exists ? planSnap.data() : null;
    const commissionPercent = plan ? plan.commissionPercent : 15;

    // Calcula valores
    const unitAmount = Math.round((service.price || 0) * 100); // em centavos
    const totalAmount = unitAmount * quantity;
    const commissionAmount = Math.round(totalAmount * (commissionPercent / 100));

    // Cria order no Firestore
    const orderRef = db.collection('orders').doc();
    const order = {
      serviceId,
      providerId,
      agencyId: agencyId || null,
      totalAmount,
      commissionPercent,
      commissionAmount,
      providerAmount: totalAmount - commissionAmount,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    await orderRef.set(order);

    // Cria Checkout Session com Connect se provider tiver connectedAccountId
    const lineItems = [
      { price_data: { currency: 'brl', product_data: { name: service.title || 'Serviço' }, unit_amount: unitAmount }, quantity }
    ];

    const sessionCreateParams = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/cancel`,
      metadata: { orderId: orderRef.id }
    };

    if (provider.connectedAccountId) {
      // application_fee_amount em centavos
      sessionCreateParams.payment_intent_data = {
        application_fee_amount: commissionAmount,
        transfer_data: { destination: provider.connectedAccountId }
      };
    }

    const session = await stripe.checkout.sessions.create(sessionCreateParams);

    // Salva sessionId na ordem
    await orderRef.update({ stripeSessionId: session.id });

    return res.status(200).json({ sessionId: session.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
};
