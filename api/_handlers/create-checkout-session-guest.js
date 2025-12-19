import Stripe from 'stripe';
import initFirestore from '../_lib/firebaseAdmin.js';

export default async (req, res) => {
  console.log('[create-checkout-session-guest] Entrada', { method: req.method, url: req.url, body: req.body });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const db = initFirestore();

  try {
    // Allow GET for healthcheck/debug
    if (req.method === 'GET') {
      return res.status(200).json({
        ok: true,
        route: '/api/create-checkout-session-guest',
        method: 'GET',
        msg: 'Guest checkout function is deployed'
      });
    }

    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    const { serviceId, successUrl, cancelUrl } = req.body;

    if (!serviceId) {
      console.warn('[create-checkout-session-guest] serviceId não informado');
      return res.status(400).json({ error: 'serviceId required' });
    }

    // Busca o serviço
    const serviceSnap = await db.collection('services').doc(serviceId).get();
    if (!serviceSnap.exists) {
      console.warn('[create-checkout-session-guest] Serviço não encontrado', { serviceId });
      return res.status(404).json({ error: 'Service not found' });
    }
    const service = serviceSnap.data();

    // Busca provider
    const providerId = service.providerId || service.ownerId;
    const providerSnap = await db.collection('users').doc(providerId).get();
    if (!providerSnap.exists) {
      console.warn('[create-checkout-session-guest] Provider não encontrado', { providerId });
      return res.status(404).json({ error: 'Provider not found' });
    }
    const provider = providerSnap.data();

    // Recupera plan do provider (padrão free se não existir)
    const planId = provider.planId || 'free';
    const planSnap = await db.collection('plans').doc(planId).get();
    const plan = planSnap.exists ? planSnap.data() : null;
    const commissionPercent = plan ? plan.commissionPercent : 15;
    console.log('[create-checkout-session-guest] Plano e comissão', { planId, commissionPercent });

    // Calcula valores baseado no tipo de cobrança
    const isSubscription = service.billingType === 'subscription' || service.priceType === 'recurring';
    const priceValue = isSubscription ? (service.priceMonthly || service.price || 0) : (service.price || 0);
    const unitAmount = Math.round(priceValue * 100); // em centavos
    const totalAmount = unitAmount;
    const commissionAmount = Math.round(totalAmount * (commissionPercent / 100));
    console.log('[create-checkout-session-guest] Valores calculados', { isSubscription, priceValue, unitAmount, totalAmount, commissionAmount });

    // Cria order no Firestore
    const orderRef = db.collection('orders').doc();
    const order = {
      serviceId,
      providerId,
      totalAmount,
      commissionPercent,
      commissionAmount,
      providerAmount: totalAmount - commissionAmount,
      status: 'pending',
      createdAt: new Date().toISOString(),
      isGuestCheckout: true,
      isSubscription,
      serviceTitle: service.title,
      providerName: provider.name || service.ownerName,
      providerEmail: provider.email || service.ownerEmail
    };
    await orderRef.set(order);
    console.log('[create-checkout-session-guest] Ordem criada', { orderId: orderRef.id, order });

    // Cria Checkout Session com Connect se provider tiver connectedAccountId
    const priceData = {
      currency: 'brl',
      product_data: {
        name: service.title || 'Serviço',
        description: service.description ? service.description.substring(0, 200) : undefined
      },
      unit_amount: unitAmount
    };

    if (isSubscription) {
      priceData.recurring = { interval: 'month' };
    }

    const lineItems = [
      {
        price_data: priceData,
        quantity: 1
      }
    ];

    const sessionCreateParams = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: isSubscription ? 'subscription' : 'payment',
      customer_email: undefined, // Será coletado pelo Stripe Checkout
      success_url: successUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderRef.id}`,
      cancel_url: cancelUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/cancel`,
      metadata: {
        orderId: orderRef.id,
        serviceId: serviceId,
        isGuestCheckout: 'true',
        isSubscription: isSubscription ? 'true' : 'false'
      },
      billing_address_collection: 'required',
      customer_creation: 'always' // Criar cliente automaticamente
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
      console.log('[create-checkout-session-guest] Sessão Stripe criada', { sessionId: session.id });
    } catch (err) {
      console.error('[create-checkout-session-guest] Erro ao criar sessão Stripe', err);
      throw err;
    }

    // Salva sessionId na ordem
    await orderRef.update({
      stripeSessionId: session.id,
      checkoutUrl: session.url
    });

    console.log('[create-checkout-session-guest] Ordem atualizada com sessionId', { orderId: orderRef.id, sessionId: session.id });

    console.log('[create-checkout-session-guest] Saída com sucesso', { sessionId: session.id, url: session.url });
    return res.status(200).json({
      sessionId: session.id,
      url: session.url
    });

  } catch (err) {
    console.error('[create-checkout-session-guest] Saída com erro', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
};