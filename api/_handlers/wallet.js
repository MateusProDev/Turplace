import initFirestore from '../_lib/firebaseAdmin.js';
import { securityMiddleware, validateAndSanitizeInput } from '../_lib/securityMiddleware.js';

async function walletHandler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

  const db = initFirestore();

  // Sanitizar query parameters para GET requests
  let sanitizedQuery;
  try {
    sanitizedQuery = validateAndSanitizeInput(req.query);
  } catch (error) {
    console.error('[wallet] Query validation failed:', error.message);
    return res.status(400).json({ error: 'Invalid query parameters' });
  }

  const { userId } = sanitizedQuery;

  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    console.log('[wallet] Buscando dados para userId:', userId);

    // 🔒 VERIFICAÇÃO DE AUTORIZAÇÃO - Usuário só pode ver sua própria wallet
    // Nota: Em produção, implementar verificação de token JWT/Firebase Auth
    // if (req.user?.uid !== userId) {
    //   return res.status(403).json({ error: 'Unauthorized' });
    // }

    // Buscar orders onde o usuário é provider (via serviceId) - OTIMIZADO
    // Primeiro buscar todos os serviços do usuário
    const servicesSnapshot = await db.collection('services')
      .where('ownerId', '==', userId)
      .get();

    const serviceIds = servicesSnapshot.docs.map(doc => doc.id);
    console.log('[wallet] Serviços encontrados para o usuário:', serviceIds.length);

    if (serviceIds.length === 0) {
      // Usuário não tem serviços, retornar dados vazios
      return res.json({
        totalSales: 0,
        totalCommissions: 0,
        totalReceived: 0,
        availableBalance: 0,
        pendingAmount: 0,
        sales: [],
        pendingSales: [],
        stripeAccountId: null,
        chavePix: '',
      });
    }

    // Buscar orders pagas para estes serviços
    const ordersSnapshot = await db.collection('orders')
      .where('serviceId', 'in', serviceIds.slice(0, 10)) // Firestore limita a 10 valores no 'in'
      .where('status', '==', 'paid')
      .orderBy('createdAt', 'desc')
      .limit(100) // Limitar para performance
      .get();

    console.log('[wallet] Orders pagas encontradas:', ordersSnapshot.size);

    let totalSales = 0;
    let totalCommissions = 0;
    let totalReceived = 0;
    const sales = [];

    // Buscar dados do provider uma vez só
    const providerDoc = await db.collection('users').doc(userId).get();
    const provider = providerDoc.data();
    const planId = provider?.planId || 'free';

    for (const doc of ordersSnapshot.docs) {
      const order = doc.data();
      if (!order.serviceId) continue; // Skip subscription orders

      const amount = (order.totalAmount || 0) / 100; // Converter de centavos para reais
      totalSales += amount;

      // Calcular comissão baseada no plano e método de pagamento
      let commissionPercent;
      if (order.paymentMethod === 'pix') {
        // PIX sempre 1,99% (já inclui todas as taxas)
        commissionPercent = 1.99;
      } else {
        // Cartão: baseado no plano (já inclui taxas do Stripe)
        const commissions = {
          free: 9,
          professional: 7,
          premium: 6
        };
        commissionPercent = commissions[planId] || 9;
      }

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
        paymentMethod: order.paymentMethod || 'card'
      });
    }

    // Buscar pagamentos pendentes (orders pending) - OTIMIZADO
    const pendingSnapshot = await db.collection('orders')
      .where('serviceId', 'in', serviceIds.slice(0, 10))
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    console.log('[wallet] Orders pendentes encontradas:', pendingSnapshot.size);

    let pendingAmount = 0;
    const pendingSales = [];
    for (const doc of pendingSnapshot.docs) {
      const order = doc.data();
      if (!order.serviceId) continue; // Skip subscription orders

      const amount = (order.totalAmount || 0) / 100;
      pendingAmount += amount;
      pendingSales.push({
        id: doc.id,
        amount,
        date: order.createdAt,
        serviceId: order.serviceId,
        paymentMethod: order.paymentMethod || 'card'
      });
    }

    // Buscar payouts pendentes - OTIMIZADO
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
    const userData = provider; // Já buscamos acima
    const stripeAccountId = userData?.stripeAccountId || null;
    const chavePix = userData?.chavePix || '';

    console.log('[wallet] Retornando dados otimizados:', {
      totalSales,
      totalCommissions,
      totalReceived,
      availableBalance,
      pendingAmount,
      salesCount: sales.length,
      pendingCount: pendingSales.length,
      serviceCount: serviceIds.length
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

// Export with security middleware
export default securityMiddleware(walletHandler);