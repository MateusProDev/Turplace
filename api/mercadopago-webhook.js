// Webhook para Mercado Pago - atualiza status do pedido
// Caminho sugerido: api/mercadopago-webhook.js

import { MercadoPagoConfig, Payment } from 'mercadopago';
import crypto from 'crypto';
import initFirestore from './_lib/firebaseAdmin.js';

const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.REACT_APP_MERCADO_PAGO_ACCESS_TOKEN;
const client = new MercadoPagoConfig({ accessToken });
const payment = new Payment(client);

// Assinatura secreta do webhook
const WEBHOOK_SECRET = process.env.MERCADO_PAGO_WEBHOOK_SECRET;

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ok' });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Validar assinatura do webhook
    const signature = req.headers['x-signature'];
    if (!signature) {
      return res.status(401).json({ error: 'Assinatura ausente' });
    }

    // Para Mercado Pago, a validação é feita comparando o signature
    // Como o Mercado Pago usa HMAC, vamos validar
    const expectedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(401).json({ error: 'Assinatura inválida' });
    }

    const { type, data } = req.body;
    if (type === 'payment') {
      const paymentId = data.id;
      try {
        const paymentInfo = await payment.get({ id: paymentId });
        // Aqui você pode atualizar o status do pedido no seu banco de dados
        // Exemplo: await atualizarStatusPedido(paymentId, paymentInfo.status);

        // Se o pagamento foi aprovado, atualizar o pedido
        if (paymentInfo.status === 'approved') {
          const db = initFirestore();
          
          // Procurar pedido pelo paymentId do Mercado Pago
          const ordersQuery = await db.collection('orders')
            .where('mercadopagoPaymentId', '==', paymentId)
            .limit(1)
            .get();

          if (!ordersQuery.empty) {
            const orderDoc = ordersQuery.docs[0];
            const orderRef = orderDoc.ref;
            
            await orderRef.update({
              status: 'paid',
              paidAt: new Date().toISOString(),
              mercadopagoPaymentId: paymentId,
              paymentDetails: paymentInfo
            });
          }
        }
      } catch (err) {
        // Log interno sem expor detalhes sensíveis
      }
    }
    return res.status(200).json({ received: true });
  } catch (error) {
    return res.status(200).json({ received: true, error: true });
  }
}
