/**
 * Mercado Pago Subscription Handler
 * Cria assinaturas recorrentes via API de Preapproval do Mercado Pago
 * Suporta checkout transparente (com card_token) e redirect
 * 
 * Documentação: https://www.mercadopago.com.br/developers/pt/docs/subscriptions/integration-configuration/create-preapproval
 */

import initFirestore from '.cjs';
import { applySecurityMiddleware, logSecurityEvent, setSecurityHeaders } from '../_lib/security.js';

export default async (req, res) => {
  // Aplicar segurança
  setSecurityHeaders(res);
  const securityResult = await applySecurityMiddleware(req, res, 'checkout');
  if (!securityResult.allowed) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  console.log('[MP-Subscription] Request received:', req.method);

  // Health check
  if (req.method === 'GET') {
    return res.status(200).json({ 
      ok: true, 
      route: '/api/mercadopago-subscription',
      provider: 'mercadopago'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const db = initFirestore();
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (!accessToken) {
      console.error('[MP-Subscription] MERCADO_PAGO_ACCESS_TOKEN não configurado');
      return res.status(500).json({ error: 'Payment provider not configured' });
    }

    const {
      planId,           
      customerEmail,
      customerName,
      customerId,       
      providerId,       
      serviceId,        
      serviceTitle,
      priceMonthly,     
      reason,
      // Dados para checkout transparente
      cardToken,
      paymentMethodId,
      issuerId,
      identificationNumber,
      identificationType,
    } = req.body;

    // Validações
    if (!customerEmail || !priceMonthly) {
      return res.status(400).json({ 
        error: 'Dados obrigatórios: customerEmail, priceMonthly' 
      });
    }

    // Converter preço para número
    const priceValue = parseFloat(String(priceMonthly).replace(',', '.'));
    if (isNaN(priceValue) || priceValue <= 0) {
      return res.status(400).json({ error: 'Preço inválido' });
    }

    // Criar registro de assinatura no Firestore
    const subscriptionRef = db.collection('subscriptions').doc();
    const subscriptionData = {
      planId: planId || null,
      serviceId: serviceId || null,
      serviceTitle: serviceTitle || reason || 'Assinatura',
      providerId: providerId || null,
      customerId: customerId || null,
      customerEmail,
      customerName: customerName || null,
      priceMonthly: priceValue,
      status: 'pending',
      provider: 'mercadopago',
      isTransparent: !!cardToken,
      createdAt: new Date().toISOString(),
    };

    await subscriptionRef.set(subscriptionData);
    console.log('[MP-Subscription] Subscription record created:', subscriptionRef.id);

    // Se temos card_token, usar checkout transparente
    if (cardToken) {
      console.log('[MP-Subscription] Using transparent checkout with card token');
      
      // Primeiro, criar o plano (preapproval_plan) se não existir
      // Ou usar endpoint de preapproval com card_token_id
      // Ref: https://www.mercadopago.com.br/developers/pt/docs/subscriptions/integration-configuration/create-preapproval#editor_5

      const preapprovalPayload = {
        preapproval_plan_id: null, // Sem plano pré-criado, usa auto_recurring
        reason: serviceTitle || reason || 'Assinatura Mensal',
        external_reference: subscriptionRef.id,
        payer_email: customerEmail,
        card_token_id: cardToken,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: priceValue,
          currency_id: 'BRL',
        },
        back_url: `${process.env.FRONTEND_URL || 'https://lucrazi.com.br'}/success?subscriptionId=${subscriptionRef.id}&method=subscription`,
        status: 'authorized', // Ativar imediatamente com o cartão
      };

      console.log('[MP-Subscription] Creating preapproval with card_token:', JSON.stringify(preapprovalPayload, null, 2));

      const response = await fetch('https://api.mercadopago.com/preapproval', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preapprovalPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[MP-Subscription] API Error (transparent):', data);
        await logSecurityEvent(req, 'warn', 'Subscription creation failed (transparent)', {
          error: data,
          subscriptionId: subscriptionRef.id
        }, 'payment_error');
        
        await subscriptionRef.update({ 
          status: 'failed',
          error: JSON.stringify(data)
        });

        return res.status(response.status).json({ 
          error: data.message || 'Erro ao criar assinatura',
          details: data
        });
      }

      console.log('[MP-Subscription] Preapproval created (transparent):', data.id, data.status);

      // Atualizar registro
      await subscriptionRef.update({
        mpPreapprovalId: data.id,
        mpStatus: data.status,
        status: data.status === 'authorized' ? 'active' : 'pending',
        activatedAt: data.status === 'authorized' ? new Date().toISOString() : null,
      });

      // Se tem customerId, atualizar o plano do usuário
      if (customerId && data.status === 'authorized') {
        try {
          const userRef = db.collection('users').doc(customerId);
          await userRef.update({
            plan: planId || 'premium',
            subscriptionId: subscriptionRef.id,
            subscriptionStatus: 'active',
            planActivatedAt: new Date().toISOString(),
          });
          console.log('[MP-Subscription] User plan updated:', customerId);
        } catch (userError) {
          console.warn('[MP-Subscription] Could not update user plan:', userError);
        }
      }

      return res.status(200).json({
        success: true,
        subscriptionId: subscriptionRef.id,
        mpPreapprovalId: data.id,
        status: data.status,
        message: 'Assinatura criada com sucesso!'
      });
    }

    // Sem card_token, usar redirect (checkout do Mercado Pago)
    console.log('[MP-Subscription] Using redirect checkout');
    
    const preapprovalPayload = {
      reason: serviceTitle || reason || 'Assinatura Mensal',
      external_reference: subscriptionRef.id,
      payer_email: customerEmail,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: priceValue,
        currency_id: 'BRL',
      },
      back_url: `${process.env.FRONTEND_URL || 'https://lucrazi.com.br'}/success?subscriptionId=${subscriptionRef.id}&method=subscription`,
      notification_url: `${process.env.VITE_API_URL || process.env.FRONTEND_URL || 'https://lucrazi.com.br'}/api/mercadopago-subscription-webhook`,
    };

    console.log('[MP-Subscription] Creating preapproval (redirect):', JSON.stringify(preapprovalPayload, null, 2));

    const response = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preapprovalPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[MP-Subscription] API Error:', data);
      await logSecurityEvent(req, 'warn', 'Subscription creation failed', {
        error: data,
        subscriptionId: subscriptionRef.id
      }, 'payment_error');
      
      await subscriptionRef.update({ 
        status: 'failed',
        error: JSON.stringify(data)
      });

      return res.status(response.status).json({ 
        error: data.message || 'Erro ao criar assinatura',
        details: data
      });
    }

    console.log('[MP-Subscription] Preapproval created:', data.id);

    await subscriptionRef.update({
      mpPreapprovalId: data.id,
      mpStatus: data.status,
      initPoint: data.init_point,
      sandboxInitPoint: data.sandbox_init_point,
    });

    const checkoutUrl = process.env.NODE_ENV === 'production' 
      ? data.init_point 
      : (data.sandbox_init_point || data.init_point);

    return res.status(200).json({
      success: true,
      subscriptionId: subscriptionRef.id,
      mpPreapprovalId: data.id,
      checkoutUrl,
      status: data.status
    });

  } catch (error) {
    console.error('[MP-Subscription] Error:', error);
    await logSecurityEvent(req, 'error', 'Subscription handler error', {
      error: error.message
    }, 'system_error');

    return res.status(500).json({ 
      error: 'Erro interno ao processar assinatura',
      details: error.message
    });
  }
};
