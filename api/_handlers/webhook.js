import Stripe from 'stripe';
import initFirestore from '../_lib/firebaseAdmin.cjs';

function now() { return new Date().toISOString(); }

function safePrint(obj) { try { return JSON.stringify(obj, null, 2); } catch (e) { return String(obj); } }

export default async (req, res) => {
  console.log('[webhook] Entrada', { method: req.method, url: req.url, headers: req.headers });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const db = initFirestore();
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  console.log('[webhook] Recebido webhook Stripe', { headers: req.headers, body: req.body });
  let event;
  try {
    if (!webhookSecret) {
      console.error('[webhook] STRIPE_WEBHOOK_SECRET não configurado - ERRO DE SEGURANÇA!');
      return res.status(500).send('Webhook secret not configured');
    }
    const buf = await getRawBody(req);
    console.log('[webhook] Payload bruto recebido', { length: buf.length });
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
    console.log('[webhook] Assinatura verificada com sucesso', { eventId: event.id, eventType: event.type });
  } catch (err) {
    console.error('[webhook] Erro ao verificar assinatura/parsear evento', err);
    return res.status(400).send(`Webhook Error: ${err && err.message ? err.message : 'invalid payload'}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const orderId = (session.metadata && (session.metadata.orderId || session.metadata.order_id)) || session.client_reference_id || null;
      console.log('[webhook] checkout.session.completed', { sessionId: session.id, orderId });
      if (!orderId) {
        console.warn('[webhook] Nenhum orderId encontrado na session');
        return res.json({ received: true });
      }

      const orderRef = db.collection('orders').doc(orderId);
      console.log('[webhook] Buscando ordem no Firestore', { orderId });
      const orderSnap = await orderRef.get();
      if (!orderSnap.exists) {
        console.warn('[webhook] Ordem não encontrada', { orderId });
        return res.json({ received: true });
      }
      const order = orderSnap.data();
      console.log('[webhook] Status atual da ordem', { orderId, status: order.status });
      if (order.status === 'paid') {
        console.log('[webhook] Ordem já está paga, saída idempotente', { orderId });
        return res.json({ received: true });
      }

      await orderRef.update({ status: 'paid', paidAt: new Date().toISOString(), stripePaymentIntentId: session.payment_intent });
      console.log('[webhook] Ordem atualizada para paga', { orderId });

      // Enviar email de acesso ao cliente
      try {
        const serviceRef = db.collection('services').doc(order.serviceId);
        const serviceSnap = await serviceRef.get();
        const serviceData = serviceSnap.exists ? serviceSnap.data() : null;

        const providerRef = db.collection('users').doc(order.providerId);
        const providerSnap = await providerRef.get();
        const providerData = providerSnap.exists ? providerSnap.data() : null;

        // Chamar função de envio de email
        const emailResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/send-access-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId: orderId,
            customerEmail: order.customerEmail,
            serviceTitle: serviceData?.title || serviceData?.name || 'Serviço Digital',
            providerName: providerData?.name || 'Prestador',
            amount: `R$ ${(order.amountTotal / 100).toFixed(2).replace('.', ',')}`
          })
        });

        if (emailResponse.ok) {
          console.log('[webhook] Email de acesso enviado com sucesso', { orderId });
        } else {
          console.warn('[webhook] Falha ao enviar email de acesso', { orderId });
        }
      } catch (emailErr) {
        console.error('[webhook] Erro ao enviar email de acesso', emailErr);
        // Não falhar o webhook por erro de email
      }

      // Processar transferência para provedor se for um serviço pago
      if (order.serviceId && order.providerId && order.providerAmount > 0) {
        try {
          // Buscar dados do provedor
          const providerRef = db.collection('users').doc(order.providerId);
          const providerSnap = await providerRef.get();
          if (!providerSnap.exists) {
            console.warn('[webhook] Provider não encontrado para transferência', { providerId: order.providerId });
          } else {
            const provider = providerSnap.data();
            if (provider.stripeAccountId && provider.stripeAccountId !== 'pending') {
              // Criar transferência para a conta Stripe Connect do provedor
              const transfer = await stripe.transfers.create({
                amount: order.providerAmount, // Já está em centavos
                currency: 'brl',
                destination: provider.stripeAccountId,
                transfer_group: `order_${orderId}`,
                metadata: {
                  orderId,
                  serviceId: order.serviceId,
                  providerId: order.providerId
                }
              });
              console.log('[webhook] Transferência criada para provedor', {
                transferId: transfer.id,
                amount: order.providerAmount,
                destination: provider.stripeAccountId
              });

              // Atualizar ordem com ID da transferência
              await orderRef.update({
                transferId: transfer.id,
                transferStatus: 'completed',
                transferredAt: new Date().toISOString()
              });
            } else {
              console.log('[webhook] Provider não tem conta Stripe conectada, fundos permanecem na conta principal', { providerId: order.providerId });
            }
          }
        } catch (transferErr) {
          console.error('[webhook] Erro ao criar transferência', transferErr);
          // Não falhar o webhook por erro de transferência, apenas logar
          await orderRef.update({
            transferStatus: 'failed',
            transferError: transferErr.message
          });
        }
      }

      if (order.type === 'subscription') {
        const plansQuery = await db.collection('plans').where('stripePriceId', '==', order.priceId).limit(1).get();
        let planDoc = !plansQuery.empty ? plansQuery.docs[0] : null;
        if (!planDoc) {
          const alt = await db.collection('plans').where('priceId','==',order.priceId).limit(1).get();
          if (!alt.empty) planDoc = alt.docs[0];
        }
        if (!planDoc) planDoc = (await db.collection('plans').doc('free').get()).exists ? (await db.collection('plans').doc('free').get()) : null;
        if (planDoc) {
          const newPlanId = planDoc.id; let targetUid = order.userId || null;
          if (!targetUid && order.customerEmail) {
            const uq = await db.collection('users').where('email','==',order.customerEmail).limit(1).get(); if (!uq.empty) targetUid = uq.docs[0].id;
          }
          if (targetUid) {
            const userRef = db.collection('users').doc(targetUid);
            const userSnap = await userRef.get(); const userData = userSnap.exists ? userSnap.data() : {};
            const oldPlanId = userData.planId || null;
            const histRef = userRef.collection('planHistory').doc();
            await histRef.set({ oldPlanId, newPlanId, changedAt: new Date().toISOString(), orderId, source: 'stripe', amount: order.amount || null });
            await userRef.set({ planId: newPlanId, planActivatedAt: new Date().toISOString() }, { merge: true });
            await orderRef.update({ subscriptionId: session.subscription || null, planApplied: true });
            console.log('[webhook] Plano aplicado ao usuário', { targetUid, newPlanId });
          } else {
            console.warn('[webhook] Não foi possível resolver usuário para aplicar plano', { orderId });
          }
        } else {
          console.warn('[webhook] Plano não encontrado para assinatura', { priceId: order.priceId });
        }
      }
    } else if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object;
      console.log('[webhook] invoice.payment_succeeded', { invoiceId: invoice.id, subscriptionId: invoice.subscription });
      if (invoice.subscription) {
        // Pagamento recorrente bem-sucedido para assinatura
        const subId = invoice.subscription;
        // Buscar usuário pela subscriptionId no Firestore (assumindo que armazenamos)
        const ordersQuery = await db.collection('orders').where('subscriptionId', '==', subId).limit(1).get();
        if (!ordersQuery.empty) {
          const orderDoc = ordersQuery.docs[0];
          const order = orderDoc.data();
          const userId = order.userId;
          if (userId) {
            // Atualizar último pagamento ou status
            const userRef = db.collection('users').doc(userId);
            await userRef.set({ lastPaymentAt: new Date().toISOString(), subscriptionStatus: 'active' }, { merge: true });
            console.log('[webhook] Pagamento recorrente confirmado', { userId, subId });
          }
        }
      }
    } else if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      console.log('[webhook] invoice.payment_failed', { invoiceId: invoice.id, subscriptionId: invoice.subscription });
      if (invoice.subscription) {
        const subId = invoice.subscription;
        const ordersQuery = await db.collection('orders').where('subscriptionId', '==', subId).limit(1).get();
        if (!ordersQuery.empty) {
          const orderDoc = ordersQuery.docs[0];
          const order = orderDoc.data();
          const userId = order.userId;
          if (userId) {
            // Marcar como falha ou suspenso
            const userRef = db.collection('users').doc(userId);
            await userRef.set({ subscriptionStatus: 'past_due', lastFailedPaymentAt: new Date().toISOString() }, { merge: true });
            console.log('[webhook] Pagamento recorrente falhou', { userId, subId });
          }
        }
      }
    }
    console.log('[webhook] Saída com sucesso', { eventType: event && event.type });
    res.json({ received: true });
  } catch (err) {
    console.error('[webhook] Saída com erro', err);
    res.status(500).send('Internal error');
  }
};

function getRawBody(req) { return new Promise((resolve, reject) => { let data=[]; req.on('data',c=>data.push(c)); req.on('end',()=>resolve(Buffer.concat(data))); req.on('error',e=>reject(e)); }); }

