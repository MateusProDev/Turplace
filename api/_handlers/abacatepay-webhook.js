// Webhook handler para AbacatePay - Versão Simplificada e Robusta
// Recebe notificações de pagamento do AbacatePay e atualiza pedidos no Firestore

import crypto from 'crypto';
import initFirestore from '../_lib/firebaseAdmin.js';
import { sendFirstAccessEmail, generateResetToken } from '../_lib/brevoEmail.js';

const ABACATEPAY_WEBHOOK_SECRET = process.env.ABACATEPAY_WEBHOOK_SECRET;

/**
 * Verifica a assinatura do webhook do AbacatePay
 */
function verifySignature(rawBody, signatureFromHeader) {
  if (!ABACATEPAY_WEBHOOK_SECRET || !signatureFromHeader) {
    return { valid: false, reason: 'missing_secret_or_signature' };
  }

  try {
    const bodyBuffer = Buffer.from(rawBody, 'utf8');

    // Tentar diferentes formatos de assinatura
    const formats = [
      { name: 'hex', digest: 'hex' },
      { name: 'base64', digest: 'base64' }
    ];

    for (const format of formats) {
      const expectedSig = crypto
        .createHmac('sha256', ABACATEPAY_WEBHOOK_SECRET)
        .update(bodyBuffer)
        .digest(format.digest);

      if (signatureFromHeader === expectedSig) {
        return { valid: true, format: format.name };
      }

      // Comparação segura para timing attacks
      try {
        const A = Buffer.from(expectedSig);
        const B = Buffer.from(signatureFromHeader);
        if (A.length === B.length && crypto.timingSafeEqual(A, B)) {
          return { valid: true, format: format.name };
        }
      } catch (e) {
        // Continue para próximo formato
      }
    }

    return { valid: false, reason: 'signature_mismatch' };
  } catch (error) {
    return { valid: false, reason: 'verification_error', error: error.message };
  }
}

export default async function handler(req, res) {
  const startTime = Date.now();
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-webhook-signature, x-signature');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Log inicial
  console.log('[AbacatePay Webhook] ========== INÍCIO ==========');
  console.log('[AbacatePay Webhook] Método:', req.method);
  console.log('[AbacatePay Webhook] Headers:', JSON.stringify({
    'content-type': req.headers['content-type'],
    'x-webhook-signature': req.headers['x-webhook-signature'] ? 'presente' : 'ausente',
    'x-signature': req.headers['x-signature'] ? 'presente' : 'ausente'
  }));

  if (req.method !== 'POST') {
    console.warn('[AbacatePay Webhook] Método não permitido:', req.method);
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const event = req.body;
    const rawBody = JSON.stringify(event);

    console.log('[AbacatePay Webhook] Body recebido:', rawBody.substring(0, 500));

    // Verificar assinatura (opcional se secret não configurado)
    const signature = req.headers['x-webhook-signature'] || req.headers['x-signature'];
    
    if (ABACATEPAY_WEBHOOK_SECRET) {
      if (signature) {
        const signatureCheck = verifySignature(rawBody, signature);
        console.log('[AbacatePay Webhook] Verificação de assinatura:', signatureCheck);
        
        if (!signatureCheck.valid) {
          console.error('[AbacatePay Webhook] Assinatura inválida:', signatureCheck.reason);
          // Em produção, rejeitar requisições com assinatura inválida
          if (process.env.NODE_ENV === 'production') {
            return res.status(401).json({ error: 'Assinatura inválida' });
          }
        }
      } else {
        console.warn('[AbacatePay Webhook] Nenhuma assinatura recebida');
      }
    } else {
      console.warn('[AbacatePay Webhook] ABACATEPAY_WEBHOOK_SECRET não configurado');
    }

    // Identificar o tipo de evento
    const eventType = event.event || event.type || 'unknown';
    console.log('[AbacatePay Webhook] Tipo de evento:', eventType);

    // Processar evento billing.paid
    if (eventType === 'billing.paid' || eventType === 'BILLING_PAID') {
      console.log('[AbacatePay Webhook] ✅ Processando pagamento confirmado');

      // Inicializar Firestore
      let db;
      try {
        db = initFirestore();
        console.log('[AbacatePay Webhook] Firestore inicializado');
      } catch (dbError) {
        console.error('[AbacatePay Webhook] Erro ao inicializar Firestore:', dbError.message);
        return res.status(500).json({ error: 'Erro ao conectar banco de dados' });
      }

      // Extrair dados do evento - tentar diferentes estruturas
      const billingData = event.data?.billing || event.billing || event.data || {};
      const metadata = billingData.metadata || event.metadata || {};
      
      console.log('[AbacatePay Webhook] Billing data:', JSON.stringify(billingData).substring(0, 300));
      console.log('[AbacatePay Webhook] Metadata:', JSON.stringify(metadata));

      // Encontrar orderId
      const orderId = metadata.orderId || metadata.order_id || billingData.orderId || billingData.id;

      if (!orderId) {
        console.error('[AbacatePay Webhook] orderId não encontrado no evento');
        console.log('[AbacatePay Webhook] Estrutura completa do evento:', JSON.stringify(event, null, 2));
        return res.status(400).json({ error: 'orderId não encontrado', event: event });
      }

      console.log('[AbacatePay Webhook] OrderId encontrado:', orderId);

      // Buscar pedido no Firestore
      const orderRef = db.collection('orders').doc(orderId);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        console.error('[AbacatePay Webhook] Pedido não encontrado no Firestore:', orderId);
        return res.status(404).json({ error: 'Pedido não encontrado', orderId: orderId });
      }

      const orderData = orderDoc.data();
      console.log('[AbacatePay Webhook] Pedido encontrado:', {
        orderId: orderId,
        status: orderData.status,
        customerEmail: orderData.customerEmail
      });

      // Preparar dados de atualização
      const updateData = {
        status: 'paid',
        paidAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        paymentMethod: 'pix',
        abacatepayPaymentData: billingData
      };

      // Enviar email de primeiro acesso
      if (orderData.customerEmail && !orderData.accessEmailSent) {
        try {
          console.log('[AbacatePay Webhook] Preparando envio de email para:', orderData.customerEmail);
          
          const resetToken = generateResetToken();
          
          updateData.resetToken = resetToken;
          updateData.resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          updateData.accessEmailSent = true;

          const amount = billingData.amount 
            ? (billingData.amount / 100).toFixed(2).replace('.', ',')
            : orderData.totalAmount 
              ? Number(orderData.totalAmount).toFixed(2).replace('.', ',')
              : '0,00';

          await sendFirstAccessEmail({
            customerEmail: orderData.customerEmail,
            customerName: orderData.customerName || 'Cliente',
            serviceTitle: orderData.serviceTitle || orderData.title || 'Seu produto',
            providerName: orderData.providerName || orderData.ownerName || 'Lucrazi',
            amount: amount,
            orderId: orderId,
            resetToken: resetToken
          });

          console.log('[AbacatePay Webhook] ✅ Email enviado com sucesso para:', orderData.customerEmail);
        } catch (emailError) {
          console.error('[AbacatePay Webhook] ❌ Erro ao enviar email:', emailError.message);
          // Não falhar o webhook por erro de email
          updateData.emailError = emailError.message;
        }
      } else {
        console.log('[AbacatePay Webhook] Email não enviado:', {
          hasEmail: !!orderData.customerEmail,
          alreadySent: orderData.accessEmailSent
        });
      }

      // Atualizar pedido no Firestore
      await orderRef.update(updateData);
      console.log('[AbacatePay Webhook] ✅ Pedido atualizado para status: paid');

      const duration = Date.now() - startTime;
      console.log(`[AbacatePay Webhook] ========== FIM (${duration}ms) ==========`);

      return res.status(200).json({ 
        received: true, 
        orderId: orderId,
        status: 'paid',
        emailSent: updateData.accessEmailSent || false
      });

    } else {
      // Evento não tratado
      console.log('[AbacatePay Webhook] Evento não tratado:', eventType);
      return res.status(200).json({ received: true, event: eventType, handled: false });
    }

  } catch (error) {
    console.error('[AbacatePay Webhook] ❌ ERRO GERAL:', error.message);
    console.error('[AbacatePay Webhook] Stack:', error.stack);
    
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
}
