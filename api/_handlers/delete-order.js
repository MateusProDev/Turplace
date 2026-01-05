import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import initFirestore from '../_lib/firebaseAdmin.cjs';

export default async function handler(req, res) {
  // Verificar método
  if (req.method !== 'DELETE') {
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
      console.error('[delete-order] Erro ao verificar token:', error);
      return res.status(401).json({ error: 'Token inválido' });
    }

    const userId = decodedToken.uid;
    const { orderId } = req.query;

    if (!orderId) {
      return res.status(400).json({ error: 'orderId é obrigatório' });
    }

    console.log('[delete-order] Deletando pedido:', orderId, 'para usuário:', userId);

    // Inicializar Firestore
    const db = initFirestore();

    // Verificar se o pedido existe e pertence ao usuário
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    const orderData = orderSnap.data();

    if (orderData.userId !== userId) {
      return res.status(403).json({ error: 'Você não tem permissão para deletar este pedido' });
    }

    if (orderData.status !== 'pending') {
      return res.status(400).json({ error: 'Apenas pedidos pendentes podem ser deletados' });
    }

    // Deletar o pedido
    await orderRef.delete();

    console.log('[delete-order] Pedido deletado com sucesso:', orderId);

    res.status(200).json({
      success: true,
      message: 'Pedido deletado com sucesso'
    });

  } catch (error) {
    console.error('[delete-order] Erro geral:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
}