import Stripe from 'stripe';
import initFirestore from './_lib/firebaseAdmin.js';

export default async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const db = initFirestore();
  const { userId } = req.body;

  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    console.log('[create-stripe-account] Starting for userId:', userId);
    
    // Check if user already has an account
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.log('[create-stripe-account] User not found:', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    console.log('[create-stripe-account] User data:', { email: userData.email, hasStripeId: !!userData.stripeAccountId });
    
    if (userData.stripeAccountId && userData.stripeAccountId.trim() !== '') {
      console.log('[create-stripe-account] User already has Stripe account, creating link');
      // Already connected, create account link for dashboard
      const accountLink = await stripe.accountLinks.create({
        account: userData.stripeAccountId,
        refresh_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile/settings`,
        return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile/settings`,
        type: 'account_onboarding',
      });
      console.log('[create-stripe-account] Account link created for existing account');
      return res.json({ url: accountLink.url });
    }

    console.log('[create-stripe-account] Creating new Express account for:', userData.email);
    // Create new Express account with minimal configuration
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'BR',
      email: userData.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
    console.log('[create-stripe-account] Account created:', account.id);

    // Store account ID
    await db.collection('users').doc(userId).update({
      stripeAccountId: account.id,
    });
    console.log('[create-stripe-account] Account ID stored in Firestore');

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile/settings`,
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile/settings`,
      type: 'account_onboarding',
    });
    console.log('[create-stripe-account] Account link created for new account');

    res.json({ url: accountLink.url });
  } catch (err) {
    console.error('[create-stripe-account] Error:', err);
    console.error('[create-stripe-account] Error details:', {
      message: err.message,
      type: err.type,
      code: err.code,
      param: err.param,
      stack: err.stack
    });

    // Handle specific Stripe errors
    if (err.type === 'StripeInvalidRequestError') {
      return res.status(400).json({
        error: 'Invalid request to Stripe',
        details: process.env.NODE_ENV === 'development' ? err.message : 'Check your Stripe configuration'
      });
    }

    if (err.type === 'StripeAPIError') {
      return res.status(502).json({
        error: 'Stripe API error',
        details: process.env.NODE_ENV === 'development' ? err.message : 'Stripe service temporarily unavailable'
      });
    }

    if (err.type === 'StripeConnectionError') {
      return res.status(503).json({
        error: 'Connection error with Stripe',
        details: 'Unable to connect to Stripe servers'
      });
    }

    if (err.type === 'StripeAuthenticationError') {
      return res.status(401).json({
        error: 'Stripe authentication failed',
        details: 'Invalid Stripe API key'
      });
    }

    res.status(500).json({
      error: 'Internal error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};