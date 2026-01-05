// Webhook para Mercado Pago - atualiza status do pedido
// Caminho sugerido: api/mercadopago-webhook.js

import { MercadoPagoConfig, Payment } from 'mercadopago';
import crypto from 'crypto';
import initFirestore from '.cjs';
import { sendFirstAccessEmail, generateResetToken } from '../_lib/brevoEmail.js';

const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.REACT_APP_MERCADO_PAGO_ACCESS_TOKEN;
const client = new MercadoPagoConfig({ accessToken });
const payment = new Payment(client);

// Assinatura secreta do webhook (opcional - para validação extra)
const WEBHOOK_SECRET = process.env.MERCADO_PAGO_WEBHOOK_SECRET;

// Função para validar assinatura do Mercado Pago (formato correto)
function validateSignature(req) {
  const xSignature = req.headers['x-signature'];
  const xRequestId = req.headers['x-request-id'];
  
  if (!xSignature || !WEBHOOK_SECRET) {
    // Se não tem secret configurado, aceita a requisição (desenvolvimento)
    return true;
  }

  // Extrair ts e v1 da assinatura
  const parts = xSignature.split(',');
  let ts = '';
  let v1 = '';
  
  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 'ts') ts = value;
    if (key === 'v1') v1 = value;
  }

  if (!ts || !v1) {
    console.warn('[MP Webhook] Formato de assinatura inválido');
    return false;
  }

  // Montar o template para validação
  // Template: id:[data.id];request-id:[x-request-id];ts:[ts];
  const dataId = req.body?.data?.id || req.query?.['data.id'];
  const template = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  
  // Calcular HMAC SHA256
  const hmac = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(template)
    .digest('hex');

  return hmac === v1;
}

export default async function handler(req, res) {
  console.log('[MP Webhook] Requisição recebida:', {
    method: req.method,
    headers: {
      'x-signature': req.headers['x-signature'] ? 'presente' : 'ausente',
      'x-request-id': req.headers['x-request-id']
    },
    query: req.query,
    body: req.body
  });

  // Health check GET
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ok', message: 'Webhook Mercado Pago ativo' });
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Validar assinatura (opcional mas recomendado)
    if (WEBHOOK_SECRET && !validateSignature(req)) {
      console.warn('[MP Webhook] Assinatura inválida');
      // Aceitar mesmo assim para não bloquear notificações legítimas
      // Em produção, você pode retornar 401 aqui
    }

    // Mercado Pago pode enviar dados via body ou query params
    const type = req.body?.type || req.query?.type || req.body?.action;
    const dataId = req.body?.data?.id || req.query?.['data.id'] || req.body?.id;
    
    console.log('[MP Webhook] Tipo:', type, 'Data ID:', dataId);

    // Processar notificação de pagamento
    if (type === 'payment' || type === 'payment.created' || type === 'payment.updated') {
      const paymentId = dataId;
      
      if (!paymentId) {
        console.warn('[MP Webhook] Payment ID não encontrado');
        return res.status(200).json({ received: true, warning: 'no_payment_id' });
      }

      try {
        console.log('[MP Webhook] Buscando detalhes do pagamento:', paymentId);
        const paymentInfo = await payment.get({ id: paymentId });
        console.log('[MP Webhook] Status do pagamento:', paymentInfo.status);

        const db = initFirestore();
        
        // Procurar pedido pelo paymentId OU external_reference
        let orderDoc = null;
        let orderRef = null;

        // Primeiro tenta por mercadopagoPaymentId
        const ordersQuery = await db.collection('orders')
          .where('mercadopagoPaymentId', '==', parseInt(paymentId))
          .limit(1)
          .get();

        if (!ordersQuery.empty) {
          orderDoc = ordersQuery.docs[0];
          orderRef = orderDoc.ref;
        } else if (paymentInfo.external_reference) {
          // Tenta pelo external_reference (que é o orderId)
          const orderByRef = await db.collection('orders').doc(paymentInfo.external_reference).get();
          if (orderByRef.exists) {
            orderDoc = orderByRef;
            orderRef = orderByRef.ref;
          }
        }

        if (orderRef) {
          console.log('[MP Webhook] Atualizando pedido:', orderRef.id);
          
          // Mapear status do Mercado Pago para status interno
          const statusMap = {
            'approved': 'paid',
            'pending': 'pending',
            'authorized': 'authorized',
            'in_process': 'processing',
            'in_mediation': 'dispute',
            'rejected': 'failed',
            'cancelled': 'cancelled',
            'refunded': 'refunded',
            'charged_back': 'chargeback'
          };

          const internalStatus = statusMap[paymentInfo.status] || paymentInfo.status;

          const updateData = {
            status: internalStatus,
            mercadopagoPaymentId: parseInt(paymentId),
            mercadopagoStatus: paymentInfo.status,
            mercadopagoStatusDetail: paymentInfo.status_detail,
            updatedAt: new Date().toISOString()
          };

          // Adicionar data de pagamento se aprovado
          if (paymentInfo.status === 'approved') {
            updateData.paidAt = new Date().toISOString();
            updateData.paymentDetails = {
              payment_method_id: paymentInfo.payment_method_id,
              payment_type_id: paymentInfo.payment_type_id,
              installments: paymentInfo.installments,
              transaction_amount: paymentInfo.transaction_amount,
              net_received_amount: paymentInfo.transaction_details?.net_received_amount
            };
            
            // ✅ Enviar email de primeiro acesso
            if (orderData.customerEmail && !orderData.accessEmailSent) {
              try {
                const resetToken = generateResetToken();
                
                // Salvar token no pedido para validação posterior
                updateData.resetToken = resetToken;
                updateData.resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h
                updateData.accessEmailSent = true;
                
                await sendFirstAccessEmail({
                  customerEmail: orderData.customerEmail,
                  customerName: orderData.customerName,
                  serviceTitle: orderData.serviceTitle || orderData.title || 'Seu produto',
                  providerName: orderData.providerName || orderData.ownerName || 'Lucrazi',
                  amount: (paymentInfo.transaction_amount || orderData.totalAmount || 0).toFixed(2).replace('.', ','),
                  orderId: orderId,
                  resetToken: resetToken
                });
                
                console.log('[MP Webhook] Email de acesso enviado para:', orderData.customerEmail);
              } catch (emailError) {
                console.error('[MP Webhook] Erro ao enviar email de acesso:', emailError.message);
                // Não falhar o webhook por erro de email
              }
            }
          }

          await orderRef.update(updateData);
          console.log('[MP Webhook] Pedido atualizado com sucesso');
        } else {
          console.warn('[MP Webhook] Pedido não encontrado para paymentId:', paymentId);
        }
      } catch (err) {
        console.error('[MP Webhook] Erro ao processar pagamento:', err.message);
      }
    }

    // Sempre retornar 200 para o Mercado Pago não reenviar
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('[MP Webhook] Erro geral:', error.message);
    // Retornar 200 mesmo com erro para evitar reenvios
    return res.status(200).json({ received: true, error: true });
  }
}
