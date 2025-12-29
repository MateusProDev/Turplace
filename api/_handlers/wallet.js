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
    console.log('[wallet] 🚀 Iniciando busca para userId:', userId);

    // 🔒 VERIFICAÇÃO DE AUTORIZAÇÃO - Usuário só pode ver sua própria wallet
    // Nota: Em produção, implementar verificação de token JWT/Firebase Auth
    // if (req.user?.uid !== userId) {
    //   return res.status(403).json({ error: 'Unauthorized' });
    // }

    console.log('[wallet] 🔍 Buscando serviços do usuário...');

    // Buscar orders onde o usuário é provider (via serviceId) - OTIMIZADO
    // Primeiro buscar todos os serviços do usuário
    const servicesSnapshot = await db.collection('services')
      .where('ownerId', '==', userId)
      .get();

    const serviceIds = servicesSnapshot.docs.map(doc => doc.id);
    console.log('[wallet] ✅ Serviços encontrados:', serviceIds.length, 'IDs:', serviceIds);

    if (serviceIds.length === 0) {
      console.log('[wallet] ℹ️ Usuário não tem serviços, retornando dados vazios');
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

    if (serviceIds.length === 0) {
      console.log('[wallet] Usuário não tem serviços, retornando dados vazios');
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

    console.log('[wallet] 💰 Buscando orders pagas...');

    // Buscar orders pagas para estes serviços - VERSÃO ULTRA SIMPLES PARA EVITAR PROBLEMAS DE ÍNDICE
    let allPaidOrders = [];
    for (const serviceId of serviceIds.slice(0, 5)) { // Limitar a 5 serviços para performance
      try {
        console.log(`[wallet] 🔍 Buscando orders para serviço: ${serviceId}`);

        // Buscar orders por serviceId primeiro (query simples)
        const serviceOrdersSnapshot = await db.collection('orders')
          .where('serviceId', '==', serviceId)
          .limit(50) // Limitar por serviço
          .get();

        console.log(`[wallet] 📊 Orders encontradas para serviço ${serviceId}:`, serviceOrdersSnapshot.size);

        // Filtrar apenas as pagas no código
        const paidOrders = serviceOrdersSnapshot.docs.filter(doc => {
          const data = doc.data();
          return data.status === 'paid';
        });

        console.log(`[wallet] ✅ Orders pagas para serviço ${serviceId}:`, paidOrders.length);
        allPaidOrders = allPaidOrders.concat(paidOrders);
      } catch (err) {
        console.error(`[wallet] ❌ Erro ao buscar orders para serviço ${serviceId}:`, err.message);
        // Continue com outros serviços
      }
    }

    console.log('[wallet] 🎯 Total orders pagas encontradas:', allPaidOrders.length);

    // Ordenar por data (mais recente primeiro) e limitar
    allPaidOrders.sort((a, b) => {
      const dateA = a.data().createdAt?.toDate?.() || new Date(0);
      const dateB = b.data().createdAt?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
    allPaidOrders = allPaidOrders.slice(0, 100); // Limitar a 100 orders pagas

    let totalSales = 0;
    let totalCommissions = 0;
    let totalReceived = 0;
    const sales = [];

    console.log('[wallet] 👤 Buscando dados do provider...');

    // Buscar dados do provider uma vez só
    const providerDoc = await db.collection('users').doc(userId).get();
    const provider = providerDoc.data();
    const planId = provider?.planId || 'free';

    console.log('[wallet] ✅ Provider data encontrado:', !!provider, 'planId:', planId);

    console.log('[wallet] 🧮 Processando orders pagas...');

    for (const doc of allPaidOrders) {
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

    console.log('[wallet] ✅ Orders pagas processadas. Total sales:', totalSales);

    // Buscar pagamentos pendentes (orders pending) - VERSÃO ULTRA SIMPLES PARA EVITAR PROBLEMAS DE ÍNDICE
    console.log('[wallet] ⏳ Buscando orders pendentes...');

    let allPendingOrders = [];
    for (const serviceId of serviceIds.slice(0, 5)) { // Limitar a 5 serviços para performance
      try {
        console.log(`[wallet] 🔍 Buscando orders pendentes para serviço: ${serviceId}`);

        // Buscar orders por serviceId primeiro (query simples)
        const serviceOrdersSnapshot = await db.collection('orders')
          .where('serviceId', '==', serviceId)
          .limit(30) // Limitar por serviço
          .get();

        console.log(`[wallet] 📊 Orders encontradas para serviço ${serviceId}:`, serviceOrdersSnapshot.size);

        // Filtrar apenas as pendentes no código
        const pendingOrders = serviceOrdersSnapshot.docs.filter(doc => {
          const data = doc.data();
          return data.status === 'pending';
        });

        console.log(`[wallet] ⏳ Orders pendentes para serviço ${serviceId}:`, pendingOrders.length);
        allPendingOrders = allPendingOrders.concat(pendingOrders);
      } catch (err) {
        console.error(`[wallet] ❌ Erro ao buscar orders pendentes para serviço ${serviceId}:`, err.message);
        // Continue com outros serviços
      }
    }

    console.log('[wallet] 🎯 Total orders pendentes encontradas:', allPendingOrders.length);

    // Ordenar por data (mais recente primeiro) e limitar
    allPendingOrders.sort((a, b) => {
      const dateA = a.data().createdAt?.toDate?.() || new Date(0);
      const dateB = b.data().createdAt?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
    allPendingOrders = allPendingOrders.slice(0, 50); // Limitar a 50 orders pendentes

    let pendingAmount = 0;
    const pendingSales = [];
    for (const doc of allPendingOrders) {
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

    console.log('[wallet] Orders pendentes processadas. Pending amount:', pendingAmount);

    // Buscar payouts pendentes - OTIMIZADO
    console.log('[wallet] Buscando payouts...');

    const payoutsSnapshot = await db.collection('payouts')
      .where('userId', '==', userId)
      .where('status', '==', 'pending')
      .get();

    let withdrawnAmount = 0;
    payoutsSnapshot.forEach(doc => {
      withdrawnAmount += doc.data().amount || 0;
    });

    console.log('[wallet] Payouts processados. Withdrawn amount:', withdrawnAmount);

    const availableBalance = totalReceived - withdrawnAmount;

    // Get user data for stripe account
    const userData = provider; // Já buscamos acima
    const stripeAccountId = userData?.stripeAccountId || null;
    const chavePix = userData?.chavePix || '';

    console.log('[wallet] 🎉 Retornando dados da wallet com sucesso!');

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
    console.error('[wallet] Error stack:', err.stack);
    console.error('[wallet] Error details:', {
      message: err.message,
      code: err.code,
      details: err.details
    });
    res.status(500).json({ error: 'Internal error' });
  }
};

// Export with security middleware
export default securityMiddleware(walletHandler);