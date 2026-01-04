/**
 * Mercado Pago Subscription Webhook Handler
 * Processa notificações de status de assinaturas
 * 
 * Documentação: https://www.mercadopago.com.br/developers/pt/docs/subscriptions/additional-content/webhooks
 */

import initFirestore from '../_lib/firebaseAdmin.js';
import { logSecurityEvent, setSecurityHeaders } from '../_lib/security.js';
import { sendFirstAccessEmail, generateResetToken } from '../_lib/brevoEmail.js';

export default async (req, res) => {
  setSecurityHeaders(res);
  
  console.log('[MP-Sub-Webhook] Request:', req.method, req.url);

  // Health check
  if (req.method === 'GET') {
    return res.status(200).json({ 
      ok: true, 
      route: '/api/mercadopago-subscription-webhook'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const db = initFirestore();
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    const body = req.body;
    console.log('[MP-Sub-Webhook] Body:', JSON.stringify(body, null, 2));

    // Mercado Pago envia diferentes tipos de notificação
    const { type, data, action } = body;

    // IPN antiga ou novo formato
    const topicOrType = body.topic || type;
    const resourceId = data?.id || body.id;

    if (!resourceId) {
      console.log('[MP-Sub-Webhook] No resource ID, ignoring');
      return res.status(200).json({ received: true, ignored: true });
    }

    // Tipos relevantes para assinaturas
    // - preapproval: criação/atualização de assinatura
    // - authorized_payment: pagamento autorizado de uma assinatura
    // - subscription_preapproval: eventos de assinatura
    
    if (topicOrType === 'preapproval' || topicOrType === 'subscription_preapproval') {
      // Buscar detalhes da assinatura no Mercado Pago
      const preapprovalResponse = await fetch(`https://api.mercadopago.com/preapproval/${resourceId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      });

      if (!preapprovalResponse.ok) {
        console.error('[MP-Sub-Webhook] Failed to fetch preapproval:', preapprovalResponse.status);
        return res.status(200).json({ received: true, error: 'Failed to fetch preapproval' });
      }

      const preapproval = await preapprovalResponse.json();
      console.log('[MP-Sub-Webhook] Preapproval data:', JSON.stringify(preapproval, null, 2));

      const { external_reference, status, payer_email } = preapproval;

      if (external_reference) {
        // Buscar assinatura no Firestore
        const subscriptionRef = db.collection('subscriptions').doc(external_reference);
        const subscriptionSnap = await subscriptionRef.get();

        if (subscriptionSnap.exists) {
          const updateData = {
            mpStatus: status,
            mpPreapprovalId: resourceId,
            lastWebhookAt: new Date().toISOString(),
            payerEmail: payer_email || null,
          };

          // Mapear status do MP para status interno
          // pending, authorized, paused, cancelled
          if (status === 'authorized') {
            updateData.status = 'active';
            updateData.activatedAt = new Date().toISOString();

            // Se tem customerId, atualizar o plano do usuário
            const subData = subscriptionSnap.data();
            if (subData.customerId) {
              const userRef = db.collection('users').doc(subData.customerId);
              await userRef.update({
                plan: subData.planId || 'premium',
                subscriptionId: external_reference,
                subscriptionStatus: 'active',
                planActivatedAt: new Date().toISOString(),
              });
              console.log('[MP-Sub-Webhook] User plan updated:', subData.customerId);
            }

            // Enviar email de primeiro acesso se ainda não enviado
            if (subData.customerEmail && !subData.accessEmailSent) {
              try {
                const resetToken = generateResetToken();
                updateData.resetToken = resetToken;
                updateData.resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
                updateData.accessEmailSent = true;

                await sendFirstAccessEmail({
                  customerEmail: subData.customerEmail,
                  customerName: subData.customerName || 'Cliente',
                  serviceTitle: subData.serviceTitle || 'Assinatura',
                  providerName: subData.providerName,
                  amount: subData.amount || preapproval.auto_recurring?.transaction_amount || 0,
                  orderId: external_reference,
                  resetToken: resetToken
                });

                console.log('[MP-Sub-Webhook] Email de primeiro acesso enviado para:', subData.customerEmail);
              } catch (emailError) {
                console.error('[MP-Sub-Webhook] Erro ao enviar email:', emailError);
                // Não falhar o webhook por causa do email
              }
            }

          } else if (status === 'paused') {
            updateData.status = 'paused';
          } else if (status === 'cancelled') {
            updateData.status = 'cancelled';
            updateData.cancelledAt = new Date().toISOString();
          } else if (status === 'pending') {
            updateData.status = 'pending';
          }

          await subscriptionRef.update(updateData);
          console.log('[MP-Sub-Webhook] Subscription updated:', external_reference, status);

          await logSecurityEvent(req, 'info', `Subscription ${action || 'updated'}: ${status}`, {
            subscriptionId: external_reference,
            mpPreapprovalId: resourceId,
            status
          }, 'webhook_event');
        }
      }

    } else if (topicOrType === 'authorized_payment' || topicOrType === 'payment') {
      // Pagamento de assinatura recorrente
      console.log('[MP-Sub-Webhook] Payment notification:', resourceId);
      
      // Buscar detalhes do pagamento
      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      });

      if (paymentResponse.ok) {
        const payment = await paymentResponse.json();
        console.log('[MP-Sub-Webhook] Payment data:', JSON.stringify(payment, null, 2));

        // Registrar pagamento
        if (payment.external_reference) {
          const paymentRecord = {
            subscriptionId: payment.external_reference,
            mpPaymentId: payment.id,
            amount: payment.transaction_amount,
            status: payment.status,
            payerEmail: payment.payer?.email,
            paidAt: payment.date_approved || new Date().toISOString(),
            createdAt: new Date().toISOString(),
          };

          await db.collection('subscription_payments').add(paymentRecord);
          console.log('[MP-Sub-Webhook] Payment recorded for subscription:', payment.external_reference);
        }
      }
    }

    return res.status(200).json({ received: true, processed: true });

  } catch (error) {
    console.error('[MP-Sub-Webhook] Error:', error);
    await logSecurityEvent(req, 'error', 'Subscription webhook error', {
      error: error.message
    }, 'webhook_error');

    // Retornar 200 para não reprocessar
    return res.status(200).json({ received: true, error: error.message });
  }
};
