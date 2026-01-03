// Endpoint para verificar status do pedido no Firestore
// Usado para polling após pagamento Pix
import initFirestore from './_lib/firebaseAdmin.js';

export default async function handler(req, res) {
  console.log('[Order Status] Verificando status', {
    method: req.method,
    query: req.query
  });

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { orderId } = req.query;

  if (!orderId) {
    return res.status(400).json({ error: 'orderId não fornecido' });
  }

  try {
    const db = initFirestore();
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      console.log('[Order Status] Pedido não encontrado:', orderId);
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    const orderData = orderDoc.data();
    console.log('[Order Status] Pedido encontrado:', { 
      orderId, 
      status: orderData.status,
      paidAt: orderData.paidAt 
    });

    // Mapear status do pedido para status de pagamento
    let paymentStatus = 'pending';
    if (orderData.status === 'paid' || orderData.status === 'completed') {
      paymentStatus = 'approved';
    } else if (orderData.status === 'cancelled' || orderData.status === 'expired') {
      paymentStatus = 'rejected';
    } else if (orderData.status === 'pending' || orderData.status === 'awaiting_payment') {
      paymentStatus = 'pending';
    }

    return res.status(200).json({
      orderId: orderId,
      status: paymentStatus,
      orderStatus: orderData.status,
      paidAt: orderData.paidAt || null,
      customerEmail: orderData.customerEmail || null,
      serviceTitle: orderData.serviceTitle || orderData.title || null,
      accessEmailSent: orderData.accessEmailSent || false
    });
  } catch (error) {
    console.error('[Order Status] Erro ao verificar status:', error);
    return res.status(500).json({ error: 'Erro ao verificar status do pedido', details: error.message });
  }
}
