// Webhook handler para AbacatePay
// Caminho sugerido: api/abacatepay-webhook.js

import crypto from 'crypto';
import initFirestore from './_lib/firebaseAdmin.js';
import { securityMiddleware } from './_lib/securityMiddleware.js';
import { paymentValidation } from '../src/middleware/paymentValidation.js';
import { sendFirstAccessEmail, generateResetToken } from './_lib/brevoEmail.js';

// Usar WEBHOOK_SECRET para verificar assinatura (configurado no painel AbacatePay)
const ABACATEPAY_WEBHOOK_SECRET = process.env.ABACATEPAY_WEBHOOK_SECRET;

export function verifyAbacateSignature(rawBody, signatureFromHeader) {
  if (!ABACATEPAY_WEBHOOK_SECRET) {
    console.warn('[AbacatePay Webhook] ABACATEPAY_WEBHOOK_SECRET não configurado');
    return false;
  }
  
  const bodyBuffer = Buffer.from(rawBody, 'utf8');

  const expectedSig = crypto
    .createHmac('sha256', ABACATEPAY_WEBHOOK_SECRET)
    .update(bodyBuffer)
    .digest('hex'); // AbacatePay geralmente usa hex

  console.log('[AbacatePay Webhook] Verificando assinatura', {
    received: signatureFromHeader?.substring(0, 20) + '...',
    expected: expectedSig.substring(0, 20) + '...'
  });

  // Tentar comparação direta primeiro
  if (signatureFromHeader === expectedSig) {
    return true;
  }
  
  // Tentar com base64 também
  const expectedSigBase64 = crypto
    .createHmac('sha256', ABACATEPAY_WEBHOOK_SECRET)
    .update(bodyBuffer)
    .digest('base64');
    
  if (signatureFromHeader === expectedSigBase64) {
    return true;
  }

  // Comparação segura contra timing attacks
  try {
    const A = Buffer.from(expectedSig);
    const B = Buffer.from(signatureFromHeader || '');
    if (A.length === B.length && crypto.timingSafeEqual(A, B)) {
      return true;
    }
  } catch (e) {
    // Ignore
  }

  return false;
}

export default async function handler(req, res) {
  // 🔒 EXTRAIR IP DO CLIENTE PARA LOGGING SEGURO
  const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                   req.headers['x-real-ip'] ||
                   req.connection?.remoteAddress ||
                   req.socket?.remoteAddress ||
                   'unknown';

  console.log('[AbacatePay Webhook] Recebendo webhook', {
    method: req.method,
    ip: clientIP,
    userAgent: req.headers['user-agent']?.substring(0, 100)
  });

  if (req.method !== 'POST') {
    console.warn('[AbacatePay Webhook] Método não permitido', {
      method: req.method,
      ip: clientIP
    });
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const requestData = req.body;

    // 🔒 VALIDAÇÃO DE SEGURANÇA - Rate limiting específico para webhooks
    const rateLimitCheck = securityMiddleware.checkRateLimit(clientIP, req.url, req.headers['user-agent']);
    if (!rateLimitCheck.allowed) {
      console.warn('[SECURITY] Rate limit excedido no webhook', {
        ip: clientIP,
        reason: rateLimitCheck.reason
      });
      return res.status(429).json({
        error: 'Muitas tentativas. Aguarde alguns minutos.',
        retryAfter: 300
      });
    }

    // 🔒 DETECÇÃO DE ATAQUES NO WEBHOOK
    const attacks = securityMiddleware.detectAttacks(requestData, clientIP, req.headers['user-agent']);
    if (attacks.length > 0) {
      console.error('[SECURITY] Ataque detectado no webhook', {
        ip: clientIP,
        attacks: attacks.map(a => ({ type: a.type, severity: a.severity }))
      });
      return res.status(400).json({ error: 'Requisição inválida' });
    }

    // 🔒 VALIDAÇÃO DE ENTRADA PARA WEBHOOK
    const validation = paymentValidation.validateWebhookData(requestData, clientIP);
    if (!validation.valid) {
      console.warn('[VALIDATION] Dados de webhook inválidos', {
        ip: clientIP,
        errors: validation.errors
      });
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validation.errors
      });
    }

    // Usar dados sanitizados
    const sanitizedData = paymentValidation.sanitizeWebhookData(validation.sanitized);
    Object.assign(requestData, sanitizedData);

    console.log('[AbacatePay Webhook] Dados validados e sanitizados', {
      event: requestData.event,
      ip: clientIP
    });

    // Verificar assinatura HMAC
    const signature = req.headers['x-webhook-signature'] || req.headers['x-signature'];
    const rawBody = JSON.stringify(req.body);

    console.log('[AbacatePay Webhook] Headers recebidos:', {
      'x-webhook-signature': req.headers['x-webhook-signature'] ? 'presente' : 'ausente',
      'x-signature': req.headers['x-signature'] ? 'presente' : 'ausente',
      'content-type': req.headers['content-type']
    });

    // Verificar assinatura se estiver presente e secret configurado
    if (ABACATEPAY_WEBHOOK_SECRET && signature) {
      if (!verifyAbacateSignature(rawBody, signature)) {
        console.error('[AbacatePay Webhook] Assinatura inválida', {
          signatureReceived: signature?.substring(0, 20) + '...'
        });
        return res.status(401).json({ error: 'Assinatura inválida' });
      }
      console.log('[AbacatePay Webhook] Assinatura verificada com sucesso');
    } else if (!ABACATEPAY_WEBHOOK_SECRET) {
      console.warn('[AbacatePay Webhook] ABACATEPAY_WEBHOOK_SECRET não configurado, pulando verificação');
    } else if (!signature) {
      console.warn('[AbacatePay Webhook] Nenhuma assinatura recebida no header');
    }

    const event = req.body;
    console.log('[AbacatePay Webhook] Evento recebido:', JSON.stringify(event, null, 2));

    if (event.event === 'billing.paid') {
      console.log('[AbacatePay Webhook] Processando evento billing.paid');

      const db = initFirestore();

      // Extrair orderId do metadata
      const metadata = event.data.billing?.metadata || {};
      const orderId = metadata.orderId;

      if (!orderId) {
        console.error('[AbacatePay Webhook] orderId não encontrado no metadata');
        return res.status(400).json({ error: 'orderId não encontrado' });
      }

      // Buscar e atualizar o pedido
      const orderRef = db.collection('orders').doc(orderId);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        console.error('[AbacatePay Webhook] Pedido não encontrado:', orderId);
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }

      const orderData = orderDoc.data();
      console.log('[AbacatePay Webhook] Pedido encontrado:', orderData);

      // Atualizar status do pedido
      const updateData = {
        status: 'paid',
        paidAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        abacatepayPaymentData: event.data
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
            amount: ((event.data.billing?.amount || orderData.totalAmount * 100 || 0) / 100).toFixed(2).replace('.', ','),
            orderId: orderId,
            resetToken: resetToken
          });
          
          console.log('[AbacatePay Webhook] Email de acesso enviado para:', orderData.customerEmail);
        } catch (emailError) {
          console.error('[AbacatePay Webhook] Erro ao enviar email de acesso:', emailError.message);
          // Não falhar o webhook por erro de email
        }
      }
      
      await orderRef.update(updateData);

      console.log('[AbacatePay Webhook] Pedido atualizado com sucesso');
    } else {
      console.log('[AbacatePay Webhook] Evento não tratado:', event.event);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[AbacatePay Webhook] Erro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}