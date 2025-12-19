import Stripe from 'stripe';
import initFirestore from './_lib/firebaseAdmin.js';

export default async (req, res) => {
  console.log('[create-checkout-session] Entrada', { method: req.method, url: req.url, body: req.body });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const db = initFirestore();
  console.log('[debug] create-checkout-session invoked', { method: req.method, headers: Object.keys(req.headers || {}), body: req.body });
  try {
    // Allow GET for healthcheck/debug
    if (req.method === 'GET') {
      return res.status(200).json({ ok: true, route: '/api/create-checkout-session', method: 'GET', msg: 'Function is deployed' });
    }
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { serviceId, agencyId, quantity = 1 } = req.body;
    if (!serviceId) {
      console.warn('[create-checkout-session] serviceId não informado');
      return res.status(400).json({ error: 'serviceId required' });
    }

    // Busca o serviço
    const serviceSnap = await db.collection('services').doc(serviceId).get();
    if (!serviceSnap.exists) {
      console.warn('[create-checkout-session] Serviço não encontrado', { serviceId });
      return res.status(404).json({ error: 'Service not found' });
    }
    const service = serviceSnap.data();

    // Busca provider
    const providerId = service.providerId || service.ownerId;
    const providerSnap = await db.collection('providers').doc(providerId).get();
    if (!providerSnap.exists) {
      console.warn('[create-checkout-session] Provider não encontrado', { providerId });
      return res.status(404).json({ error: 'Provider not found' });
    }
    const provider = providerSnap.data();

    // Recupera plan do provider (padrão free se não existir)
    const planId = provider.planId || 'free';
    const planSnap = await db.collection('plans').doc(planId).get();
    const plan = planSnap.exists ? planSnap.data() : null;
    const commissionPercent = plan ? plan.commissionPercent : 15;
    console.log('[create-checkout-session] Plano e comissão', { planId, commissionPercent });

    // Calcula valores
    const unitAmount = Math.round((service.price || 0) * 100); // em centavos
    const totalAmount = unitAmount * quantity;
    const commissionAmount = Math.round(totalAmount * (commissionPercent / 100));
    console.log('[create-checkout-session] Valores calculados', { unitAmount, totalAmount, commissionAmount });

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
    console.log('[create-checkout-session] Ordem criada', { orderId: orderRef.id, order });

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

    let session;
    try {
      session = await stripe.checkout.sessions.create(sessionCreateParams);
      console.log('[create-checkout-session] Sessão Stripe criada', { sessionId: session.id });
    } catch (err) {
      console.error('[create-checkout-session] Erro ao criar sessão Stripe', err);
      throw err;
    }

    // Salva sessionId na ordem
    await orderRef.update({ stripeSessionId: session.id });
    console.log('[create-checkout-session] Ordem atualizada com sessionId', { orderId: orderRef.id, sessionId: session.id });

    console.log('[create-checkout-session] Saída com sucesso', { sessionId: session.id });
    return res.status(200).json({ sessionId: session.id });
  } catch (err) {
    console.error('[create-checkout-session] Saída com erro', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
};
