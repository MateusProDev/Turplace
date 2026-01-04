import initFirestore from '../_lib/firebaseAdmin.js';
import { getAuth } from 'firebase-admin/auth';

// Configurações de saque
const PAYOUT_FEE = 4.99; // Taxa de saque em reais
const MIN_PAYOUT = 19.99; // Saque mínimo em reais
const MAX_PAYOUT = 50000; // Saque máximo em reais

// AbacatePay API
const abacateApiKey = process.env.ABACATEPAY_API_KEY;

// 🔒 SEGURANÇA: Verificar autenticação do usuário
async function verifyAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authenticated: false, error: 'Token de autenticação necessário' };
  }

  try {
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(token);
    return { authenticated: true, uid: decodedToken.uid };
  } catch (error) {
    console.error('[payout] Erro ao verificar token:', error);
    return { authenticated: false, error: 'Token inválido ou expirado' };
  }
}

// Função para enviar PIX via AbacatePay
async function sendPixViaAbacatePay(pixKey, amount, description) {
  if (!abacateApiKey) {
    throw new Error('AbacatePay API key não configurada');
  }

  console.log('[payout] Enviando PIX via AbacatePay:', { pixKey, amount, description });

  // AbacatePay API para transferência PIX
  const response = await fetch('https://api.abacatepay.com/v1/pixTransfer/create', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${abacateApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      pixKey: pixKey,
      amount: Math.round(amount * 100), // Em centavos
      description: description.substring(0, 140)
    })
  });

  const responseText = await response.text();
  console.log('[payout] Resposta AbacatePay:', response.status, responseText);

  if (!response.ok) {
    throw new Error(`AbacatePay error: ${response.status} - ${responseText}`);
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return { raw: responseText };
  }
}

// Calcular saldo disponível do usuário
async function getUserAvailableBalance(db, userId) {
  try {
    // Buscar dados do provider
    const providerDoc = await db.collection('users').doc(userId).get();
    const provider = providerDoc.data();
    const planId = provider?.planId || 'free';

    // Buscar todas as vendas pagas do usuário
    const ordersSnapshot = await db.collection('orders')
      .where('providerId', '==', userId)
      .where('status', '==', 'paid')
      .get();

    let totalEarnings = 0;
    let totalCommissions = 0;

    for (const doc of ordersSnapshot.docs) {
      const order = doc.data();
      // totalAmount pode estar em reais ou centavos, verificar
      let amount = order.totalAmount || 0;
      if (amount > 1000) amount = amount / 100; // Se maior que 1000, provavelmente está em centavos

      let commission;
      
      // Se o prestador recebeu direto via split, não descontar comissão aqui
      if (order.providerReceivedDirectly || order.splitPayment) {
        // Split: prestador já recebeu, não entra no saldo de saque
        continue;
      }
      
      if (order.paymentMethod === 'pix') {
        // PIX: 1,99% AbacatePay + R$0,80 taxa fixa da plataforma
        const pixPercentFee = amount * 0.0199;
        const pixFixedFee = 0.80;
        commission = pixPercentFee + pixFixedFee;
      } else {
        // Cartão: baseado no plano
        const commissions = {
          free: 9,
          professional: 7,
          premium: 6
        };
        const commissionPercent = commissions[planId] || 9;
        commission = (amount * commissionPercent) / 100;
      }

      totalEarnings += amount;
      totalCommissions += commission;
    }

    // Buscar payouts já realizados (completed ou processing)
    const payoutsSnapshot = await db.collection('payouts')
      .where('userId', '==', userId)
      .get();

    let totalPaidOut = 0;
    for (const doc of payoutsSnapshot.docs) {
      const payout = doc.data();
      if (payout.status === 'completed' || payout.status === 'processing') {
        totalPaidOut += payout.grossAmount || payout.amount || 0;
      }
    }

    const availableBalance = totalEarnings - totalCommissions - totalPaidOut;
    return Math.max(0, Math.round(availableBalance * 100) / 100); // Arredondar para 2 casas

  } catch (error) {
    console.error('[payout] Erro ao calcular saldo disponível:', error);
    return 0;
  }
}

export default async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  // 🔒 SEGURANÇA FORTE: Verificar autenticação
  const auth = await verifyAuth(req);
  if (!auth.authenticated) {
    console.warn('[payout] ❌ Tentativa de saque sem autenticação');
    return res.status(401).json({ error: auth.error });
  }

  const db = initFirestore();
  const { userId, amount, method } = req.body;

  if (!userId || !amount || !method) {
    return res.status(400).json({ error: 'userId, amount and method required' });
  }

  // 🔒 SEGURANÇA CRÍTICA: Usuário só pode sacar SEU PRÓPRIO saldo
  if (auth.uid !== userId) {
    console.error('[payout] 🚨 ALERTA DE SEGURANÇA: Tentativa de saque de outro usuário!', {
      authenticatedUser: auth.uid,
      targetUser: userId
    });
    return res.status(403).json({ error: 'Acesso negado. Você só pode sacar seu próprio saldo.' });
  }

  // Validar valor do saque
  if (amount < MIN_PAYOUT) {
    return res.status(400).json({ 
      error: `Saque mínimo é R$ ${MIN_PAYOUT.toFixed(2)}. Você receberá R$ ${(MIN_PAYOUT - PAYOUT_FEE).toFixed(2)} após a taxa.`
    });
  }

  if (amount > MAX_PAYOUT) {
    return res.status(400).json({ error: `Saque máximo é R$ ${MAX_PAYOUT.toFixed(2)}` });
  }

  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'Usuário não encontrado' });

    const userData = userDoc.data();

    if (method === 'pix') {
      if (!userData.chavePix) {
        return res.status(400).json({ error: 'Chave PIX não cadastrada. Cadastre sua chave PIX nas configurações.' });
      }

      console.log('[payout] 💸 Iniciando saque PIX para user:', userId);

      // Verificar saldo disponível do usuário
      const availableBalance = await getUserAvailableBalance(db, userId);
      console.log('[payout] Saldo disponível:', availableBalance, 'Valor solicitado:', amount);

      if (availableBalance < amount) {
        return res.status(400).json({
          error: `Saldo insuficiente. Disponível: R$ ${availableBalance.toFixed(2)}`
        });
      }

      // Calcular valores
      const grossAmount = amount; // Valor bruto solicitado
      const fee = PAYOUT_FEE; // Taxa fixa
      const netAmount = grossAmount - fee; // Valor líquido que o prestador recebe

      console.log('[payout] 💰 Valores do saque:', {
        grossAmount,
        fee,
        netAmount,
        chavePix: userData.chavePix
      });

      // Registrar payout no Firestore
      const payoutData = {
        userId,
        grossAmount, // Valor bruto (o que é descontado do saldo)
        fee, // Taxa de saque
        netAmount, // Valor líquido (o que o prestador recebe)
        amount: netAmount, // Para compatibilidade
        method: 'pix',
        chavePix: userData.chavePix,
        status: 'processing',
        createdAt: new Date(),
        processedAt: null,
        abacatePayTransferId: null,
        error: null
      };

      const payoutRef = await db.collection('payouts').add(payoutData);
      const payoutId = payoutRef.id;

      console.log('[payout] Payout registrado com ID:', payoutId);

      // Enviar PIX via AbacatePay
      try {
        const transferResult = await sendPixViaAbacatePay(
          userData.chavePix,
          netAmount,
          `Saque Lucrazi #${payoutId.slice(-8)}`
        );

        console.log('[payout] ✅ Transferência AbacatePay iniciada:', transferResult);

        // Atualizar payout com resultado
        await payoutRef.update({
          status: 'completed',
          processedAt: new Date(),
          abacatePayTransferId: transferResult.data?.id || transferResult.id || `abacate_${Date.now()}`,
          abacatePayResponse: JSON.stringify(transferResult)
        });

        console.log('[payout] ✅ Saque PIX concluído com sucesso!');

        return res.json({
          success: true,
          payoutId: payoutId,
          message: `Saque de R$ ${netAmount.toFixed(2)} enviado com sucesso para sua chave PIX!`,
          details: {
            grossAmount,
            fee,
            netAmount,
            chavePix: userData.chavePix.replace(/(.{3}).*(.{3})/, '$1***$2') // Mascarar chave
          }
        });

      } catch (transferError) {
        console.error('[payout] ❌ Erro na transferência AbacatePay:', transferError.message);

        // Atualizar payout com erro
        await payoutRef.update({
          status: 'failed',
          processedAt: new Date(),
          error: transferError.message
        });

        return res.status(500).json({
          error: 'Erro ao processar transferência PIX. Tente novamente em alguns minutos.',
          details: transferError.message
        });
      }

    } else {
      return res.status(400).json({ error: 'Método de saque não suportado. Use PIX.' });
    }

  } catch (error) {
    console.error('[payout] ❌ Erro geral:', error);
    return res.status(500).json({ 
      error: 'Erro interno ao processar saque',
      details: error.message 
    });
  }
};
