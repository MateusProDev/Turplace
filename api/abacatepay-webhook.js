// Webhook handler para AbacatePay
// Caminho sugerido: api/abacatepay-webhook.js

import crypto from 'crypto';
import initFirestore from './_lib/firebaseAdmin.js';
import { securityMiddleware } from './_lib/securityMiddleware.js';
import { paymentValidation } from '../src/middleware/paymentValidation.js';
import { sendFirstAccessEmail, generateResetToken } from './_lib/brevoEmail.js';

const ABACATEPAY_PUBLIC_KEY = process.env.ABACATEPAY_PUBLIC_KEY || 't9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9';

export function verifyAbacateSignature(rawBody, signatureFromHeader) {
  const bodyBuffer = Buffer.from(rawBody, 'utf8');

  const expectedSig = crypto
    .createHmac('sha256', ABACATEPAY_PUBLIC_KEY)
    .update(bodyBuffer)
    .digest('base64');

  const A = Buffer.from(expectedSig);
  const B = Buffer.from(signatureFromHeader);

  return A.length === B.length && crypto.timingSafeEqual(A, B);
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
    const signature = req.headers['x-webhook-signature'];
    const rawBody = JSON.stringify(req.body);

    if (!signature || !verifyAbacateSignature(rawBody, signature)) {
      console.error('[AbacatePay Webhook] Assinatura inválida');
      return res.status(401).json({ error: 'Assinatura inválida' });
    }

    const event = req.body;
    console.log('[AbacatePay Webhook] Evento recebido:', event);

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