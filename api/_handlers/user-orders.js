import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import initFirestore from '../_lib/firebaseAdmin.cjs';

export default async function handler(req, res) {
  // Verificar método
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Inicializar Firebase
    const db = initFirestore();
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
      console.error('[user-orders] Erro ao verificar token:', error);
      return res.status(401).json({ error: 'Token inválido' });
    }

    const userId = decodedToken.uid;
    console.log('[user-orders] Buscando pedidos para usuário:', userId);

    // Buscar pedidos do usuário
    const ordersRef = db.collection('orders');
    const ordersQuery = ordersRef
      .where('userId', '==', userId);

    const ordersSnap = await ordersQuery.get();

    const orders = [];

    for (const orderDoc of ordersSnap.docs) {
      const orderData = orderDoc.data();

      // Buscar dados do serviço
      let serviceData = null;
      if (orderData.serviceId) {
        try {
          const serviceRef = db.collection('services').doc(orderData.serviceId);
          const serviceSnap = await serviceRef.get();
          if (serviceSnap.exists) {
            serviceData = serviceSnap.data();
          }
        } catch (error) {
          console.error('[user-orders] Erro ao buscar serviço:', error);
        }
      }

      // Buscar dados do prestador
      let providerData = null;
      if (orderData.providerId) {
        try {
          const providerRef = admin.firestore().collection('users').doc(orderData.providerId);
          const providerSnap = await providerRef.get();
          if (providerSnap.exists) {
            providerData = providerSnap.data();
          }
        } catch (error) {
          console.error('[user-orders] Erro ao buscar prestador:', error);
        }
      }

      // Buscar conteúdo do curso se for um curso ou se tiver seções
      let sections = null;
      if (serviceData && serviceData.sections) {
        // Transformar seções do formato Firestore para o formato esperado pelo frontend
        sections = serviceData.sections.map(section => ({
          id: section.id || section.order?.toString() || Math.random().toString(),
          title: section.title || '',
          content: section.description || '',
          type: section.videoUrl ? 'video' : 'text',
          url: section.videoUrl || null
        }));
      }

      const order = {
        id: orderDoc.id,
        serviceId: orderData.serviceId || '',
        serviceTitle: serviceData?.title || serviceData?.name || (orderData.serviceId ? 'Serviço' : 'Compra pendente'),
        serviceDescription: serviceData?.description || '',
        servicePrice: serviceData?.price || null,
        providerName: providerData?.name || providerData?.displayName || 'Prestador',
        amount: orderData.amount || orderData.totalAmount || 0,
        status: orderData.status || 'pending',
        createdAt: orderData.createdAt || orderData.created_at || new Date().toISOString(),
        billingType: orderData.billingType || orderData.billing_type || 'one-time',
        customerEmail: orderData.customerEmail || orderData.customer_email || '',
        accessLink: orderData.accessLink || null,
        contentType: sections ? 'course' : serviceData?.type || 'service',
        sections: sections,
        // Debug info
        debug: {
          hasSections: !!sections,
          sectionsCount: sections?.length || 0,
          serviceType: serviceData?.type
        }
      };

      orders.push(order);
    }

    console.log(`[user-orders] Encontrados ${orders.length} pedidos para usuário ${userId}`);

    // Ordenar pedidos por data de criação (mais recente primeiro)
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      orders: orders
    });

  } catch (error) {
    console.error('[user-orders] Erro geral:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
}

