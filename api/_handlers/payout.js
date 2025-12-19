import Stripe from 'stripe';
import initFirestore from './_lib/firebaseAdmin.js';

export default async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const db = initFirestore();
  const { userId, amount, method } = req.body;

  if (!userId || !amount || !method) return res.status(400).json({ error: 'userId, amount and method required' });

  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });

    const userData = userDoc.data();

    if (method === 'stripe') {
      if (!userData.stripeAccountId) return res.status(400).json({ error: 'Stripe account not connected' });

      // Create payout via Stripe
      const payout = await stripe.payouts.create({
        amount: Math.round(amount * 100), // in cents
        currency: 'brl',
        destination: userData.stripeAccountId,
      });

      await db.collection('payouts').add({
        userId,
        amount,
        method: 'stripe',
        stripePayoutId: payout.id,
        status: 'pending',
        createdAt: new Date(),
      });

      res.json({ success: true, payoutId: payout.id, delayHours: 0 }); // Stripe is instant
    } else if (method === 'pix') {
      if (!userData.chavePix) return res.status(400).json({ error: 'Chave PIX não cadastrada' });

      // Verificar plano e delay
      const plan = userData.plan || 'free';
      const delays = {
        free: 12 * 60 * 60 * 1000, // 12 horas
        professional: 2 * 60 * 60 * 1000, // 2 horas
        premium: 30 * 60 * 1000, // 30 minutos
      };
      const delay = delays[plan] || delays.free;

      // Simular processamento PIX
      const payoutData = {
        userId,
        amount,
        method: 'pix',
        chavePix: userData.chavePix,
        status: delay === 0 ? 'completed' : 'pending',
        createdAt: new Date(),
        processedAt: delay === 0 ? new Date() : new Date(Date.now() + delay),
      };

      const payoutRef = await db.collection('payouts').add(payoutData);

      res.json({ success: true, payoutId: payoutRef.id, delayHours: delay / (60 * 60 * 1000) });
    } else {
      return res.status(400).json({ error: 'Invalid method' });
    }
  } catch (err) {
    console.error('[payout] Error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};