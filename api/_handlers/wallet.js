import initFirestore from '../_lib/firebaseAdmin.js';

export default async (req, res) => {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

  const db = initFirestore();
  const { userId } = req.query;

  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    console.log('[wallet] Buscando dados para userId:', userId);

    // Buscar orders onde o usuário é provider (via serviceId)
    const ordersSnapshot = await db.collection('orders')
      .where('paymentStatus', '==', 'paid')
      .get();

    console.log('[wallet] Orders encontradas:', ordersSnapshot.size);

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

      const amount = (order.totalAmount || 0) / 100; // Converter de centavos para reais
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

    // Buscar pagamentos pendentes (orders pending ou sem paymentStatus)
    const pendingSnapshot = await db.collection('orders')
      .where('status', '==', 'pending')
      .get();

    console.log('[wallet] Pending orders encontradas:', pendingSnapshot.size);

    let pendingAmount = 0;
    const pendingSales = [];
    for (const doc of pendingSnapshot.docs) {
      const order = doc.data();
      if (!order.serviceId) continue; // Skip subscription orders
      const serviceDoc = await db.collection('services').doc(order.serviceId).get();
      if (!serviceDoc.exists || serviceDoc.data().ownerId !== userId) continue;

      pendingAmount += (order.totalAmount || 0) / 100; // Converter de centavos para reais
      pendingSales.push({
        id: doc.id,
        amount: (order.totalAmount || 0) / 100, // Converter de centavos para reais
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
    const stripeAccountId = userData?.stripeAccountId || null;
    const chavePix = userData?.chavePix || '';

    console.log('[wallet] Retornando dados:', {
      totalSales,
      totalCommissions,
      totalReceived,
      availableBalance,
      pendingAmount,
      salesCount: sales.length,
      pendingCount: pendingSales.length
    });

    res.json({
      totalSales,
      totalCommissions,
      totalReceived,
      availableBalance,
      pendingAmount,
      sales,
      pendingSales,
      stripeAccountId,
      chavePix,
    });
  } catch (err) {
    console.error('[wallet] Error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};