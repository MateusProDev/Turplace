import Stripe from 'stripe';
import initFirestore from './_lib/firebaseAdmin.js';

export default async (req, res) => {
  console.log('[get-order-details] Entrada', { method: req.method, url: req.url, query: req.query });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const db = initFirestore();

  try {
    if (req.method === 'GET') {
      const { session_id, order_id } = req.query;

      if (!session_id && !order_id) {
        return res.status(400).json({ error: 'session_id or order_id required' });
      }

      let orderData = null;
      let sessionData = null;

      // Buscar por session_id do Stripe
      if (session_id) {
        try {
          sessionData = await stripe.checkout.sessions.retrieve(session_id);
          console.log('[get-order-details] Sessão Stripe encontrada', { sessionId: session_id });

          // Buscar ordem pelo metadata
          if (sessionData.metadata && sessionData.metadata.orderId) {
            const orderSnap = await db.collection('orders').doc(sessionData.metadata.orderId).get();
            if (orderSnap.exists) {
              orderData = { id: orderSnap.id, ...orderSnap.data() };
            }
          }
        } catch (err) {
          console.warn('[get-order-details] Erro ao buscar sessão Stripe', err);
        }
      }

      // Buscar diretamente por order_id se não encontrou pela sessão
      if (!orderData && order_id) {
        const orderSnap = await db.collection('orders').doc(order_id).get();
        if (orderSnap.exists) {
          orderData = { id: orderSnap.id, ...orderSnap.data() };
        }
      }

      if (!orderData) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Buscar dados do serviço
      let serviceData = null;
      if (orderData.serviceId) {
        const serviceSnap = await db.collection('services').doc(orderData.serviceId).get();
        if (serviceSnap.exists) {
          serviceData = { id: serviceSnap.id, ...serviceSnap.data() };
        }
      }

      // Buscar dados do provider
      let providerData = null;
      if (orderData.providerId) {
        const providerSnap = await db.collection('providers').doc(orderData.providerId).get();
        if (providerSnap.exists) {
          providerData = { id: providerSnap.id, ...providerSnap.data() };
        }
      }

      // Formatar resposta
      const response = {
        order: {
          id: orderData.id,
          status: orderData.status,
          totalAmount: orderData.totalAmount,
          createdAt: orderData.createdAt,
          isGuestCheckout: orderData.isGuestCheckout || false
        },
        service: serviceData ? {
          id: serviceData.id,
          title: serviceData.title,
          description: serviceData.description,
          price: serviceData.price
        } : null,
        provider: providerData ? {
          id: providerData.id,
          name: providerData.name || orderData.providerName,
          email: providerData.email || orderData.providerEmail
        } : null,
        payment: sessionData ? {
          id: sessionData.id,
          amountTotal: sessionData.amount_total,
          currency: sessionData.currency,
          customerEmail: sessionData.customer_details?.email,
          paymentStatus: sessionData.payment_status
        } : null
      };

      console.log('[get-order-details] Resposta preparada', { orderId: orderData.id });
      return res.status(200).json(response);

    } else {
      return res.status(405).send('Method Not Allowed');
    }

  } catch (err) {
    console.error('[get-order-details] Erro', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
};