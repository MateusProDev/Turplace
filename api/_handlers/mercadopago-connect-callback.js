/**
 * Mercado Pago OAuth Callback Handler
 * Recebe o redirecionamento do Mercado Pago após autorização
 */

import initFirestore from '.cjs';
import { setSecurityHeaders, logSecurityEvent } from '../_lib/security.js';

const MP_TOKEN_URL = 'https://api.mercadopago.com/oauth/token';

export default async (req, res) => {
  setSecurityHeaders(res);
  
  console.log('[MP-Connect-Callback] Request:', req.method, req.url);
  console.log('[MP-Connect-Callback] Query:', req.query);

  // Este endpoint recebe GET do Mercado Pago após autorização
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const db = initFirestore();
  
  const { code, state, error: authError, error_description } = req.query;

  // Se houve erro na autorização
  if (authError) {
    console.error('[MP-Connect-Callback] Auth error:', authError, error_description);
    const frontendUrl = process.env.FRONTEND_URL || 'https://lucrazi.com.br';
    return res.redirect(`${frontendUrl}/settings?mp_error=${encodeURIComponent(error_description || authError)}`);
  }

  if (!code || !state) {
    console.error('[MP-Connect-Callback] Missing code or state');
    const frontendUrl = process.env.FRONTEND_URL || 'https://lucrazi.com.br';
    return res.redirect(`${frontendUrl}/settings?mp_error=missing_params`);
  }

  // Decodificar state para pegar userId
  let userId;
  try {
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    userId = stateData.userId;
    
    // Verificar se não expirou (30 minutos)
    if (Date.now() - stateData.timestamp > 30 * 60 * 1000) {
      throw new Error('State expired');
    }
  } catch (e) {
    console.error('[MP-Connect-Callback] Invalid state:', e);
    const frontendUrl = process.env.FRONTEND_URL || 'https://lucrazi.com.br';
    return res.redirect(`${frontendUrl}/settings?mp_error=invalid_state`);
  }

  // Credenciais da aplicação
  const clientId = process.env.MERCADO_PAGO_CLIENT_ID;
  const clientSecret = process.env.MERCADO_PAGO_CLIENT_SECRET;
  const redirectUri = `${process.env.VITE_API_URL || process.env.FRONTEND_URL || 'https://lucrazi.com.br'}/api/mercadopago-connect-callback`;

  if (!clientId || !clientSecret) {
    console.error('[MP-Connect-Callback] Missing OAuth credentials');
    const frontendUrl = process.env.FRONTEND_URL || 'https://lucrazi.com.br';
    return res.redirect(`${frontendUrl}/settings?mp_error=not_configured`);
  }

  try {
    // Trocar código por tokens
    console.log('[MP-Connect-Callback] Exchanging code for tokens...');
    
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
      console.error('[MP-Connect-Callback] Token exchange failed:', tokenData);
      const frontendUrl = process.env.FRONTEND_URL || 'https://lucrazi.com.br';
      return res.redirect(`${frontendUrl}/settings?mp_error=${encodeURIComponent(tokenData.message || 'token_failed')}`);
    }

    console.log('[MP-Connect-Callback] Token received, saving to user:', userId);

    // Salvar dados do prestador
    const userRef = db.collection('users').doc(userId);
    
    const mpData = {
      mpConnected: true,
      mpUserId: tokenData.user_id,
      mpAccessToken: tokenData.access_token,
      mpRefreshToken: tokenData.refresh_token,
      mpPublicKey: tokenData.public_key,
      mpTokenExpiresAt: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
      mpConnectedAt: new Date().toISOString(),
      role: 'prestador',
    };

    await userRef.update(mpData);

    await logSecurityEvent(req, 'info', 'Provider connected MP account via OAuth', {
      userId,
      mpUserId: tokenData.user_id
    }, 'account_connected');

    console.log('[MP-Connect-Callback] User updated successfully');

    // Redirecionar para página de sucesso
    const frontendUrl = process.env.FRONTEND_URL || 'https://lucrazi.com.br';
    return res.redirect(`${frontendUrl}/settings?mp_connected=true`);

  } catch (error) {
    console.error('[MP-Connect-Callback] Error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'https://lucrazi.com.br';
    return res.redirect(`${frontendUrl}/settings?mp_error=${encodeURIComponent(error.message)}`);
  }
};
