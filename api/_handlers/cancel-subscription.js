import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import MercadoPago from 'mercadopago';

// Inicializar MercadoPago
const mp = new MercadoPago({ 
  accessToken: process.env.MP_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN 
});

export default async function handler(req, res) {
  // Verificar método
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticação necessário' });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;

    try {
      decodedToken = await getAuth().verifyIdToken(token);
    } catch (error) {
      console.error('[cancel-subscription] Erro ao verificar token:', error);
      return res.status(401).json({ error: 'Token inválido' });
    }

    const userId = decodedToken.uid;
    const { subscriptionId, orderId } = req.body;

    if (!subscriptionId || !orderId) {
      return res.status(400).json({ error: 'subscriptionId e orderId são obrigatórios' });
    }

    console.log(`[cancel-subscription] Usuário ${userId} cancelando assinatura ${subscriptionId}`);

    // Verificar se o pedido pertence ao usuário
    const orderRef = admin.firestore().collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    const orderData = orderSnap.data();
    if (orderData.userId !== userId) {
      return res.status(403).json({ error: 'Você não tem permissão para cancelar esta assinatura' });
    }

    // Cancelar a assinatura no MercadoPago
    try {
      await mp.preapproval.update({
        id: subscriptionId,
        body: { status: 'cancelled' }
      });
      console.log(`[cancel-subscription] Assinatura ${subscriptionId} cancelada no MercadoPago`);
    } catch (mpError) {
      console.error('[cancel-subscription] Erro ao cancelar no MercadoPago:', mpError);
      // Continuar mesmo se falhar no MP, para atualizar o status local
    }

    // Atualizar status do pedido no Firestore
    await orderRef.update({
      status: 'cancelled',
      cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      cancelledBy: userId
    });

    console.log(`[cancel-subscription] Pedido ${orderId} marcado como cancelado`);

    res.status(200).json({
      success: true,
      message: 'Assinatura cancelada com sucesso'
    });

  } catch (error) {
    console.error('[cancel-subscription] Erro geral:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
}
