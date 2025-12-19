import Stripe from 'stripe';
import initFirestore from './_lib/firebaseAdmin.js';

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
        console.log('[stripe-webhook] Checkout session completed', { sessionId: session.id });

        // Buscar ordem pelo metadata
        if (session.metadata && session.metadata.orderId) {
          const orderId = session.metadata.orderId;
          const isGuestCheckout = session.metadata.isGuestCheckout === 'true';

          try {
            // Atualizar status da ordem
            await db.collection('orders').doc(orderId).update({
              status: 'completed',
              paymentStatus: 'paid',
              customerEmail: session.customer_details?.email,
              customerName: session.customer_details?.name,
              paymentCompletedAt: new Date().toISOString(),
              stripeCustomerId: session.customer,
              isGuestCheckout
            });

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