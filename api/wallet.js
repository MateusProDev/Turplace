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
      if (!order.serviceId) continue; // Skip subscription orders
      // Buscar service para obter providerId
      const serviceDoc = await db.collection('services').doc(order.serviceId).get();
      if (!serviceDoc.exists || serviceDoc.data().ownerId !== userId) continue;

      const amount = order.amount || 0;
      totalSales += amount;

      // Calcular comissão baseada no plano do provider
      const providerDoc = await db.collection('users').doc(userId).get();
      const provider = providerDoc.data();
      const planId = provider?.planId || 'free';
      // Hardcoded commissions since plans are static
      const commissions = {
        free: 12,
        professional: 8,
        premium: 3.99
      };
      const commissionPercent = commissions[planId] || 15;

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
      if (!order.serviceId) continue; // Skip subscription orders
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

    // Buscar payouts pendentes
    const payoutsSnapshot = await db.collection('payouts')
      .where('userId', '==', userId)
      .where('status', '==', 'pending')
      .get();

    let withdrawnAmount = 0;
    payoutsSnapshot.forEach(doc => {
      withdrawnAmount += doc.data().amount || 0;
    });

    const availableBalance = totalReceived - withdrawnAmount;

    // Get user data for stripe account
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const chavePix = userData?.chavePix || '';

    res.json({
      totalSales,
      totalCommissions,
      totalReceived,
      availableBalance,
      pendingAmount,
      sales,
      pendingSales,
      chavePix,
    });
  } catch (err) {
    console.error('[wallet] Error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};