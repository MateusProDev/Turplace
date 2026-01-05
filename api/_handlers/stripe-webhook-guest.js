import Stripe from 'stripe';
import initFirestore from '.cjs';
import { getPlanLimits } from '../../src/utils/planUtils.js';

export default async (req, res) => {
  console.log('[stripe-webhook] Entrada', { method: req.method, headers: Object.keys(req.headers || {}) });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const db = initFirestore();
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error('[stripe-webhook] Webhook signature verification failed', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('[stripe-webhook] Evento recebido', { type: event.type, id: event.id });

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log('[stripe-webhook] Checkout session completed', { sessionId: session.id, mode: session.mode });

        // Buscar ordem pelo metadata
        if (session.metadata && session.metadata.orderId) {
          const orderId = session.metadata.orderId;
          const isGuestCheckout = session.metadata.isGuestCheckout === 'true';
          const isSubscription = session.metadata.isSubscription === 'true';

          try {
            const updateData = {
              status: session.mode === 'subscription' ? 'active' : 'completed',
              paymentStatus: 'paid',
              customerEmail: session.customer_details?.email,
              customerName: session.customer_details?.name,
              paymentCompletedAt: new Date().toISOString(),
              stripeCustomerId: session.customer,
              isGuestCheckout,
              stripeSessionId: session.id
            };

            if (session.mode === 'subscription') {
              updateData.stripeSubscriptionId = session.subscription;

              // Atualizar plano do usuário se for uma assinatura
              if (session.metadata && session.metadata.userId) {
                const userId = session.metadata.userId;
                const priceId = session.line_items?.data?.[0]?.price?.id;

                if (priceId) {
                  // Mapear priceId para planId
                  const planMapping = {
                    'price_1SeyezKlR2RHdJ4pFFVMA5fb': 'free', // Este é o plano free, mas não deveria ser usado para subscriptions
                    'price_1Seyf0KlR2RHdJ4ptJNmAuKi': 'professional',
                    'price_1Seyf1KlR2RHdJ4psFoH3WrA': 'premium'
                  };

                  const planId = planMapping[priceId];
                  if (planId && planId !== 'free') {
                    try {
                      const planLimits = getPlanLimits(planId);
                      await db.collection('users').doc(userId).update({
                        planId: planId,
                        planActivatedAt: new Date().toISOString(),
                        planExpiresAt: null, // Subscriptions don't expire until canceled
                        stripeSubscriptionId: session.subscription,
                        stripeCustomerId: session.customer,
                        planFeatures: planLimits.features,
                        updatedAt: new Date().toISOString()
                      });
                      console.log('[stripe-webhook] Plano do usuário atualizado', { userId, planId, subscriptionId: session.subscription });
                    } catch (planErr) {
                      console.error('[stripe-webhook] Erro ao atualizar plano do usuário', { userId, planId, error: planErr });
                    }
                  }
                }
              }
            }

            // Atualizar status da ordem
            await db.collection('orders').doc(orderId).update(updateData);

            console.log('[stripe-webhook] Ordem atualizada', { orderId, status: 'completed' });

            // Se for checkout de convidado, preparar para envio de email
            if (isGuestCheckout) {
              // TODO: Integrar com Brevo para envio automático de email
              console.log('[stripe-webhook] Checkout de convidado - preparar envio de email', {
                customerEmail: session.customer_details?.email,
                orderId
              });
            }

          } catch (err) {
            console.error('[stripe-webhook] Erro ao atualizar ordem', { orderId, error: err });
          }
        }
        break;

      case 'invoice.payment_succeeded':
        const invoice = event.data.object;
        console.log('[stripe-webhook] Invoice payment succeeded', { invoiceId: invoice.id, subscriptionId: invoice.subscription });

        // Para pagamentos recorrentes de subscriptions
        if (invoice.subscription) {
          // Buscar ordem pela subscription ID
          const ordersSnap = await db.collection('orders')
            .where('stripeSubscriptionId', '==', invoice.subscription)
            .limit(1)
            .get();

          if (!ordersSnap.empty) {
            const orderDoc = ordersSnap.docs[0];
            const orderData = orderDoc.data();

            // Atualizar status do pagamento recorrente
            await orderDoc.ref.update({
              lastPaymentDate: new Date().toISOString(),
              paymentStatus: 'paid',
              // Manter status 'active' para subscriptions ativas
            });

            console.log('[stripe-webhook] Subscription payment processed', { orderId: orderDoc.id, invoiceId: invoice.id });
          }
        }
        break;

      case 'customer.subscription.deleted':
        const canceledSubscription = event.data.object;
        console.log('[stripe-webhook] Subscription canceled', { subscriptionId: canceledSubscription.id });

        // Buscar e atualizar ordem quando subscription é cancelada
        const canceledOrdersSnap = await db.collection('orders')
          .where('stripeSubscriptionId', '==', canceledSubscription.id)
          .limit(1)
          .get();

        if (!canceledOrdersSnap.empty) {
          const orderDoc = canceledOrdersSnap.docs[0];
          const orderData = orderDoc.data();

          // Reverter usuário para plano free
          if (orderData.userId) {
            try {
              const freePlanLimits = getPlanLimits('free');
              await db.collection('users').doc(orderData.userId).update({
                planId: 'free',
                planActivatedAt: new Date().toISOString(),
                planExpiresAt: null,
                stripeSubscriptionId: null, // Remove subscription reference
                planFeatures: freePlanLimits.features,
                updatedAt: new Date().toISOString()
              });
              console.log('[stripe-webhook] Usuário revertido para plano free', { userId: orderData.userId });
            } catch (planErr) {
              console.error('[stripe-webhook] Erro ao reverter plano do usuário', { userId: orderData.userId, error: planErr });
            }
          }

          await orderDoc.ref.update({
            status: 'canceled',
            canceledAt: new Date().toISOString()
          });

          console.log('[stripe-webhook] Subscription canceled', { orderId: orderDoc.id });
        }
        break;

      case 'payment_intent.payment_failed':
        const paymentIntent = event.data.object;
        console.log('[stripe-webhook] Payment failed', { paymentIntentId: paymentIntent.id });

        // TODO: Lidar com pagamentos falhados
        break;

      default:
        console.log('[stripe-webhook] Evento não tratado', { type: event.type });
    }

    return res.status(200).json({ received: true });

  } catch (err) {
    console.error('[stripe-webhook] Erro geral', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
};
