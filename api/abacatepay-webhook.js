// Webhook handler para AbacatePay
// Caminho sugerido: api/abacatepay-webhook.js

import crypto from 'crypto';
import initFirestore from './_lib/firebaseAdmin.js';

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
  console.log('[AbacatePay Webhook] Recebendo webhook', {
    method: req.method,
    headers: Object.keys(req.headers),
    body: req.body
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
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
      await orderRef.update({
        status: 'paid',
        updatedAt: new Date().toISOString(),
        abacatepayPaymentData: event.data
      });

      console.log('[AbacatePay Webhook] Pedido atualizado com sucesso');

      // Aqui você pode adicionar lógica adicional, como notificar o provedor, etc.
    } else {
      console.log('[AbacatePay Webhook] Evento não tratado:', event.event);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[AbacatePay Webhook] Erro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}