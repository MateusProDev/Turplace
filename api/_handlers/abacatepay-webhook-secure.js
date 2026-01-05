// Handler seguro para webhooks AbacatePay
// api/abacatepay-webhook.js

import crypto from 'crypto';
import initFirestore from '../_lib/firebaseAdmin.cjs';
import { withSecurity } from './_middleware/security.js';
import { securityMiddleware } from '../../src/middleware/security.js';

const ABACATEPAY_PUBLIC_KEY = process.env.ABACATEPAY_PUBLIC_KEY;

if (!ABACATEPAY_PUBLIC_KEY) {
  throw new Error('ABACATEPAY_PUBLIC_KEY não configurado');
}

// Cache de eventos processados (prevenção de replay attacks)
const processedEvents = new Set();
const MAX_CACHE_SIZE = 10000;

// Limpa cache periodicamente
setInterval(() => {
  if (processedEvents.size > MAX_CACHE_SIZE) {
    processedEvents.clear();
  }
}, 3600000); // 1 hora

function verifyAbacateSignature(rawBody, signatureFromHeader) {
  try {
    const bodyBuffer = Buffer.from(rawBody, 'utf8');
    const expectedSig = crypto
      .createHmac('sha256', ABACATEPAY_PUBLIC_KEY)
      .update(bodyBuffer)
      .digest('base64');

    return crypto.timingSafeEqual(
      Buffer.from(expectedSig),
      Buffer.from(signatureFromHeader)
    );
  } catch (error) {
    securityMiddleware.secureLog('error', 'Signature verification error', { error: error.message });
    return false;
  }
}

async function handler(req, res) {
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';

  try {
    // Log seguro
    securityMiddleware.secureLog('info', 'Webhook received', {
      clientIP,
      userAgent: req.headers['user-agent']?.substring(0, 100),
      contentLength: req.headers['content-length']
    });

    // Verificação de assinatura HMAC
    const signature = req.headers['x-webhook-signature'];
    const rawBody = JSON.stringify(req.body);

    if (!signature) {
      securityMiddleware.secureLog('warn', 'Missing webhook signature', { clientIP });
      return res.status(401).json({ error: 'Assinatura ausente' });
    }

    if (!verifyAbacateSignature(rawBody, signature)) {
      securityMiddleware.secureLog('error', 'Invalid webhook signature', { clientIP });
      return res.status(401).json({ error: 'Assinatura inválida' });
    }

    // Validação da estrutura do payload
    const event = req.body;
    if (!event || typeof event !== 'object') {
      securityMiddleware.secureLog('warn', 'Invalid webhook payload structure', { clientIP });
      return res.status(400).json({ error: 'Payload inválido' });
    }

    if (!event.event || typeof event.event !== 'string') {
      securityMiddleware.secureLog('warn', 'Missing event type', { clientIP });
      return res.status(400).json({ error: 'Tipo de evento ausente' });
    }

    // Prevenção de replay attacks
    const eventId = event.id || `${event.event}_${Date.now()}`;
    if (processedEvents.has(eventId)) {
      securityMiddleware.secureLog('warn', 'Duplicate webhook event', {
        clientIP,
        eventId,
        eventType: event.event
      });
      return res.status(200).json({ received: true, duplicate: true });
    }

    processedEvents.add(eventId);

    // Processamento seguro do evento
    if (event.event === 'billing.paid') {
      securityMiddleware.secureLog('info', 'Processing billing.paid event', {
        eventId,
        clientIP
      });

      const db = initFirestore();

      // Extração segura dos metadados
      const metadata = event.data?.billing?.metadata || {};
      const orderId = metadata.orderId;

      if (!orderId || typeof orderId !== 'string' || orderId.length > 100) {
        securityMiddleware.secureLog('warn', 'Invalid orderId in webhook', {
          clientIP,
          orderId: orderId?.substring(0, 50)
        });
        return res.status(400).json({ error: 'OrderId inválido' });
      }

      // Busca segura do pedido
      const orderRef = db.collection('orders').doc(orderId);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        securityMiddleware.secureLog('warn', 'Order not found', {
          clientIP,
          orderId
        });
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }

      const orderData = orderDoc.data();

      // Verificação de status (evita double processing)
      if (orderData.status === 'paid') {
        securityMiddleware.secureLog('info', 'Order already paid', {
          clientIP,
          orderId
        });
        return res.status(200).json({ received: true, alreadyProcessed: true });
      }

      // Validação do valor pago
      const paidAmount = event.data?.billing?.amount;
      if (paidAmount && paidAmount !== orderData.totalAmount * 100) { // AbacatePay trabalha em centavos
        securityMiddleware.secureLog('error', 'Payment amount mismatch', {
          clientIP,
          orderId,
          expected: orderData.totalAmount * 100,
          received: paidAmount
        });
        return res.status(400).json({ error: 'Valor pago não corresponde' });
      }

      // Atualização segura do pedido
      const updateData = {
        status: 'paid',
        paidAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        abacatepayPaymentData: {
          eventId,
          amount: paidAmount,
          processedAt: new Date().toISOString(),
          clientIP
        }
      };

      await orderRef.update(updateData);

      securityMiddleware.secureLog('info', 'Order payment confirmed', {
        orderId,
        clientIP,
        amount: paidAmount
      });

      // TODO: Implementar notificações para prestador e cliente
      // TODO: Implementar lógica de comissionamento

    } else if (event.event === 'billing.expired') {
      securityMiddleware.secureLog('info', 'Processing billing.expired event', {
        eventId,
        clientIP
      });

      // Lógica para pagamentos expirados
      const metadata = event.data?.billing?.metadata || {};
      const orderId = metadata.orderId;

      if (orderId) {
        const db = initFirestore();
        const orderRef = db.collection('orders').doc(orderId);

        await orderRef.update({
          status: 'expired',
          expiredAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        securityMiddleware.secureLog('info', 'Order marked as expired', {
          orderId,
          clientIP
        });
      }

    } else {
      securityMiddleware.secureLog('info', 'Unhandled webhook event', {
        eventType: event.event,
        clientIP
      });
    }

    return res.status(200).json({ received: true });

  } catch (error) {
    securityMiddleware.secureLog('error', 'Webhook processing error', {
      error: error.message,
      clientIP,
      stack: error.stack?.substring(0, 500)
    });

    // Não expor detalhes do erro
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

export default withSecurity(handler);

