import initFirestore from './_lib/firebaseAdmin.js';

export default async (req, res) => {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

  const db = initFirestore();
  const { userId } = req.query;

  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    // Buscar orders onde o usuário é provider (via serviceId)
    const ordersSnapshot = await db.collection('orders')
      .where('status', '==', 'paid')
      .get();

    let totalSales = 0;
    let totalCommissions = 0;
    let totalReceived = 0;
    const sales = [];

    for (const doc of ordersSnapshot.docs) {
      const order = doc.data();
      // Buscar service para obter providerId
      const serviceDoc = await db.collection('services').doc(order.serviceId).get();
      if (!serviceDoc.exists || serviceDoc.data().ownerId !== userId) continue;

      const amount = order.amount || 0;
      totalSales += amount;

      // Calcular comissão baseada no plano do provider
      const providerDoc = await db.collection('users').doc(userId).get();
      const provider = providerDoc.data();
      const planId = provider?.planId || 'free';
      const planDoc = await db.collection('plans').doc(planId).get();
      const commissionPercent = planDoc.exists ? planDoc.data().commissionPercent : 15;

      const commission = (amount * commissionPercent) / 100;
      totalCommissions += commission;
      totalReceived += (amount - commission);

      sales.push({
        id: doc.id,
        amount,
        commission,
        received: amount - commission,
        date: order.createdAt,
        serviceId: order.serviceId,
      });
    }

    // Buscar pagamentos pendentes (orders pending)
    const pendingSnapshot = await db.collection('orders')
      .where('status', '==', 'pending')
      .get();

    let pendingAmount = 0;
    const pendingSales = [];
    for (const doc of pendingSnapshot.docs) {
      const order = doc.data();
      const serviceDoc = await db.collection('services').doc(order.serviceId).get();
      if (!serviceDoc.exists || serviceDoc.data().ownerId !== userId) continue;

      pendingAmount += order.amount || 0;
      pendingSales.push({
        id: doc.id,
        amount: order.amount || 0,
        date: order.createdAt,
        serviceId: order.serviceId,
      });
    }

    res.json({
      totalSales,
      totalCommissions,
      totalReceived,
      availableBalance: totalReceived, // Simplificado, assumir tudo disponível
      pendingAmount,
      sales,
      pendingSales,
    });
  } catch (err) {
    console.error('[wallet] Error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};