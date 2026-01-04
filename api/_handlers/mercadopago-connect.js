/**
 * Mercado Pago Connect Handler
 * Permite que prestadores conectem suas contas do Mercado Pago
 * para receber pagamentos diretamente (Marketplace/Split)
 * 
 * Fluxo OAuth:
 * 1. Prestador clica em "Conectar Mercado Pago"
 * 2. É redirecionado para MP para autorizar
 * 3. MP redireciona de volta com código de autorização
 * 4. Trocamos o código por access_token do prestador
 * 
 * Documentação: https://www.mercadopago.com.br/developers/pt/docs/checkout-api/additional-content/credentials
 */

import initFirestore from '../_lib/firebaseAdmin.js';
import { setSecurityHeaders, logSecurityEvent } from '../_lib/security.js';

// URL de autorização do Mercado Pago
const MP_AUTH_URL = 'https://auth.mercadopago.com/authorization';
const MP_TOKEN_URL = 'https://api.mercadopago.com/oauth/token';

export default async (req, res) => {
  setSecurityHeaders(res);
  
  console.log('[MP-Connect] Request:', req.method, req.url);

  const db = initFirestore();

  // Credenciais da aplicação MP (não do vendedor)
  const clientId = process.env.MERCADO_PAGO_CLIENT_ID;
  const clientSecret = process.env.MERCADO_PAGO_CLIENT_SECRET;
  const redirectUri = `${process.env.VITE_API_URL || process.env.FRONTEND_URL || 'https://lucrazi.com.br'}/api/mercadopago-connect-callback`;

  if (!clientId || !clientSecret) {
    console.error('[MP-Connect] Missing MP OAuth credentials');
    return res.status(500).json({ 
      error: 'Mercado Pago OAuth not configured',
      details: 'MERCADO_PAGO_CLIENT_ID e MERCADO_PAGO_CLIENT_SECRET necessários'
    });
  }

  // GET /api/mercadopago-connect?userId=xxx - Inicia fluxo OAuth
  if (req.method === 'GET') {
    const { userId, action } = req.query;

    // Health check
    if (!userId && !action) {
      return res.status(200).json({ 
        ok: true, 
        route: '/api/mercadopago-connect',
        description: 'Conectar conta do prestador ao Mercado Pago'
      });
    }

    // Ação: gerar URL de autorização
    if (action === 'auth' || userId) {
      if (!userId) {
        return res.status(400).json({ error: 'userId obrigatório' });
      }

      // Criar state com userId para recuperar depois
      const state = Buffer.from(JSON.stringify({ 
        userId, 
        timestamp: Date.now() 
      })).toString('base64');

      // URL de autorização OAuth do Mercado Pago
      const authUrl = new URL(MP_AUTH_URL);
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('platform_id', 'mp');
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('redirect_uri', redirectUri);

      console.log('[MP-Connect] Redirecting to MP OAuth:', authUrl.toString());

      // Redirecionar ou retornar URL
      if (req.query.redirect === 'true') {
        return res.redirect(authUrl.toString());
      }

      return res.status(200).json({
        authUrl: authUrl.toString(),
        message: 'Redirecione o usuário para authUrl'
      });
    }
  }

  // POST /api/mercadopago-connect - Receber callback com código
  if (req.method === 'POST') {
    const { code, state, userId: directUserId } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Código de autorização obrigatório' });
    }

    // Decodificar state para pegar userId
    let userId = directUserId;
    if (state && !userId) {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        userId = stateData.userId;
      } catch (e) {
        console.warn('[MP-Connect] Failed to decode state:', e);
      }
    }

    if (!userId) {
      return res.status(400).json({ error: 'userId não encontrado' });
    }

    try {
      // Trocar código por tokens
      const tokenResponse = await fetch(MP_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }).toString(),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        console.error('[MP-Connect] Token exchange failed:', tokenData);
        return res.status(400).json({ 
          error: 'Falha ao conectar conta',
          details: tokenData
        });
      }

      console.log('[MP-Connect] Token received for user:', userId);

      // Salvar dados do prestador
      const userRef = db.collection('users').doc(userId);
      
      // Dados do marketplace que precisamos
      const mpData = {
        mpConnected: true,
        mpUserId: tokenData.user_id,
        mpAccessToken: tokenData.access_token,      // Token para receber pagamentos
        mpRefreshToken: tokenData.refresh_token,    // Para renovar o token
        mpPublicKey: tokenData.public_key,
        mpTokenExpiresAt: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
        mpConnectedAt: new Date().toISOString(),
        role: 'prestador',
      };

      await userRef.update(mpData);

      await logSecurityEvent(req, 'info', 'Provider connected MP account', {
        userId,
        mpUserId: tokenData.user_id
      }, 'account_connected');

      return res.status(200).json({
        success: true,
        message: 'Conta do Mercado Pago conectada com sucesso!',
        mpUserId: tokenData.user_id,
      });

    } catch (error) {
      console.error('[MP-Connect] Error:', error);
      return res.status(500).json({ 
        error: 'Erro ao processar conexão',
        details: error.message
      });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};
