// API Router - Centraliza todas as funções serverless em uma única função
// Isso resolve o limite de 12 funções do plano Hobby do Vercel

import createCheckoutSession from './_handlers/create-checkout-session.js';
import createCheckoutSessionGuest from './_handlers/create-checkout-session-guest.js';
import createSubscriptionSession from './_handlers/create-subscription-session.js';
import getOrderDetails from './_handlers/get-order-details.js';
import payout from './_handlers/payout.js';
import status from './_handlers/status.js';
import testEnv from './_handlers/test-env.js';
import wallet from './_handlers/wallet.js';
import webhook from './_handlers/webhook.js';
import sharecontent from './_handlers/sharecontent.js';
import userOrders from './_handlers/user-orders.js';
import sendAccessEmail from './_handlers/send-access-email.js';
import mercadopagoCheckout from './_handlers/mercadopago-checkout.js';
import abacatepayPixCheckout from './_handlers/abacatepay-pix-checkout.js';
import abacatepayWebhook from './_handlers/abacatepay-webhook.js';
import orderStatus from './_handlers/order-status.js';
import mercadopagoWebhook from './_handlers/mercadopago-webhook.js';
import mercadopagoSubscription from './_handlers/mercadopago-subscription.js';
import mercadopagoSubscriptionWebhook from './_handlers/mercadopago-subscription-webhook.js';
import mercadopagoConnect from './_handlers/mercadopago-connect.js';
import mercadopagoConnectCallback from './_handlers/mercadopago-connect-callback.js';
import firstAccess from './_handlers/first-access.js';
import cancelSubscription from './_handlers/cancel-subscription.js';

const handlers = {
  'create-checkout-session': createCheckoutSession,
  'create-checkout-session-guest': createCheckoutSessionGuest,
  'create-subscription-session': mercadopagoSubscription, // Agora usa MP
  'get-order-details': getOrderDetails,
  'payout': payout,
  'status': status,
  'test-env': testEnv,
  'wallet': wallet,
  'webhook': webhook,
  'sharecontent': sharecontent,
  'user-orders': userOrders,
  'send-access-email': sendAccessEmail,
  'mercadopago-checkout': mercadopagoCheckout,
  'abacatepay-pix-checkout': abacatepayPixCheckout,
  'abacatepay-webhook': abacatepayWebhook,
  'order-status': orderStatus,
  'mercadopago-webhook': mercadopagoWebhook,
  // Novos handlers Mercado Pago
  'mercadopago-subscription': mercadopagoSubscription,
  'mercadopago-subscription-webhook': mercadopagoSubscriptionWebhook,
  'mercadopago-connect': mercadopagoConnect,
  'mercadopago-connect-callback': mercadopagoConnectCallback,
  // Handler de primeiro acesso
  'first-access': firstAccess,
  // Handler de cancelar assinatura
  'cancel-subscription': cancelSubscription
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
