import Stripe from 'stripe';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function testStripeAccountCreation() {
  try {
    console.log('Testing Stripe account creation...');
    console.log('Stripe key configured:', !!process.env.STRIPE_SECRET_KEY);

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY not found in environment variables');
      return;
    }

    // First, test basic Stripe connectivity
    console.log('Testing basic Stripe connectivity...');
    const balance = await stripe.balance.retrieve();
    console.log('Stripe balance test successful');

    // Now test account creation
    console.log('Creating Express account...');
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'BR',
      email: 'test@example.com',
      capabilities: {
        transfers: { requested: true },
      },
    });

    console.log('Account created successfully:', account.id);
    console.log('Account details:', {
      id: account.id,
      country: account.country,
      email: account.email,
      capabilities: account.capabilities
    });

    // Clean up - delete the test account
    await stripe.accounts.del(account.id);
    console.log('Test account deleted');

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Error type:', error.type);
    console.error('Error code:', error.code);

    if (error.type === 'StripeAuthenticationError') {
      console.error('Authentication failed - check your Stripe secret key');
    } else if (error.type === 'StripeInvalidRequestError') {
      console.error('Invalid request - check your account permissions for Brazil');
    } else if (error.type === 'StripeAPIError') {
      console.error('API error - Stripe service issue');
    }
  }
}

testStripeAccountCreation();