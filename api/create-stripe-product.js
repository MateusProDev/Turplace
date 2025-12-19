import Stripe from 'stripe';
import initFirestore from './_lib/firebaseAdmin.js';

export default async (req, res) => {
  console.log('[create-stripe-product] Entrada', { method: req.method, url: req.url, body: req.body });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const db = initFirestore();

  try {
    if (req.method === 'GET') {
      return res.status(200).json({ ok: true, route: '/api/create-stripe-product', method: 'GET', msg: 'Function is deployed' });
    }
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { serviceId, productType, billingType, price, priceMonthly, title, description } = req.body;

    if (!serviceId || !title) {
      return res.status(400).json({ error: 'serviceId and title required' });
    }

    // Criar produto no Stripe
    const product = await stripe.products.create({
      name: title,
      description: description || '',
      metadata: {
        serviceId,
        productType,
        billingType
      }
    });

    let priceData = {};

    if (billingType === 'subscription') {
      // Para assinaturas, criar preço recorrente
      const unitAmount = Math.round(parseFloat(priceMonthly.replace(/[^\d,]/g, '').replace(',', '.')) * 100);
      const priceObj = await stripe.prices.create({
        product: product.id,
        unit_amount: unitAmount,
        currency: 'brl',
        recurring: {
          interval: 'month'
        }
      });
      priceData = { priceId: priceObj.id, priceType: 'recurring' };
    } else {
      // Para pagamento único
      const unitAmount = price ? Math.round(parseFloat(price.replace(/[^\d,]/g, '').replace(',', '.')) * 100) : 0;
      if (unitAmount > 0) {
        const priceObj = await stripe.prices.create({
          product: product.id,
          unit_amount: unitAmount,
          currency: 'brl'
        });
        priceData = { priceId: priceObj.id, priceType: 'one-time' };
      }
    }

    // Atualizar serviço no Firestore com IDs do Stripe
    await db.collection('services').doc(serviceId).update({
      stripeProductId: product.id,
      ...priceData,
      updatedAt: new Date()
    });

    res.status(200).json({
      success: true,
      productId: product.id,
      ...priceData
    });

  } catch (error) {
    console.error('[create-stripe-product] Error:', error);
    res.status(500).json({ error: error.message });
  }
};