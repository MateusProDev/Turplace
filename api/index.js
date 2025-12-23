// API Router - Centraliza todas as funções serverless em uma única função
// Isso resolve o limite de 12 funções do plano Hobby do Vercel

import createCheckoutSession from './_handlers/create-checkout-session.js';
import createCheckoutSessionGuest from './_handlers/create-checkout-session-guest.js';
import createStripeAccount from './_handlers/create-stripe-account.js';
import createStripeProduct from './_handlers/create-stripe-product.js';
import createSubscriptionSession from './_handlers/create-subscription-session.js';
import getOrderDetails from './_handlers/get-order-details.js';
import payout from './_handlers/payout.js';
import status from './_handlers/status.js';
import stripeWebhookGuest from './_handlers/stripe-webhook-guest.js';
import testEnv from './_handlers/test-env.js';
import wallet from './_handlers/wallet.js';
import webhook from './_handlers/webhook.js';
import mercadopagoCheckout from './mercadopago-checkout.js';

const handlers = {
  'create-checkout-session': createCheckoutSession,
  'create-checkout-session-guest': createCheckoutSessionGuest,
  'create-stripe-account': createStripeAccount,
  'create-stripe-product': createStripeProduct,
  'create-subscription-session': createSubscriptionSession,
  'get-order-details': getOrderDetails,
  'payout': payout,
  'status': status,
  'stripe-webhook-guest': stripeWebhookGuest,
  'test-env': testEnv,
  'wallet': wallet,
  'webhook': webhook,
  'mercadopago-checkout': mercadopagoCheckout
};

export default async (req, res) => {
  try {
    // Extrair o caminho da rota da URL
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathParts = url.pathname.split('/');
    const route = pathParts[pathParts.length - 1]; // Última parte do caminho

    console.log('[api-router] Rota solicitada:', route);
    console.log('[api-router] Método:', req.method);
    console.log('[api-router] Handlers disponíveis:', Object.keys(handlers));

    // Verificar se o handler existe
    if (!handlers[route]) {
      console.warn('[api-router] Handler não encontrado para rota:', route);
      return res.status(404).json({
        error: 'Handler not found',
        route: route,
        availableRoutes: Object.keys(handlers)
      });
    }

    // Executar o handler correspondente
    const handler = handlers[route];
    console.log('[api-router] Executando handler:', route);

    await handler(req, res);

  } catch (error) {
    console.error('[api-router] Erro geral:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};