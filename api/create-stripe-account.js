import Stripe from 'stripe';
import initFirestore from './_lib/firebaseAdmin.js';

export default async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const db = initFirestore();
  const { userId } = req.body;

  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    // Check if user already has an account
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });

    const userData = userDoc.data();
    if (userData.stripeAccountId) {
      // Already connected, create account link for dashboard
      const accountLink = await stripe.accountLinks.create({
        account: userData.stripeAccountId,
        refresh_url: `${process.env.FRONTEND_URL}/profile`,
        return_url: `${process.env.FRONTEND_URL}/profile`,
        type: 'account_onboarding',
      });
      return res.json({ url: accountLink.url });
    }

    // Create new Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'BR', // Assuming Brazil
      email: userData.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    // Store account ID
    await db.collection('users').doc(userId).update({
      stripeAccountId: account.id,
    });

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.FRONTEND_URL}/profile`,
      return_url: `${process.env.FRONTEND_URL}/profile`,
      type: 'account_onboarding',
    });

    res.json({ url: accountLink.url });
  } catch (err) {
    console.error('[create-stripe-account] Error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};