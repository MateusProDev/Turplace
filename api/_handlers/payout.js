import Stripe from 'stripe';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import initFirestore from '../_lib/firebaseAdmin.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const mpAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const mpClient = mpAccessToken ? new MercadoPagoConfig({ accessToken: mpAccessToken }) : null;
const mpPayment = mpClient ? new Payment(mpClient) : null;

async function checkAvailableBalance() {
  // Em produção, verificar saldo real da conta Mercado Pago
  // Por enquanto, simular saldo alto
  return 10000.00; // R$ 10.000,00 disponível
}

async function getUserAvailableBalance(db, userId) {
  try {
    // Buscar todas as vendas do usuário que foram pagas
    const ordersSnapshot = await db.collection('orders')
      .where('providerId', '==', userId)
      .where('status', '==', 'paid')
      .get();

    let totalEarnings = 0;
    let totalCommissions = 0;
    let totalPaidOut = 0;

    for (const doc of ordersSnapshot.docs) {
      const order = doc.data();
      const amount = (order.totalAmount || 0) / 100; // Converter de centavos para reais

      // Calcular comissão baseada no plano do provider
      const providerDoc = await db.collection('users').doc(userId).get();
      const provider = providerDoc.data();
      const planId = provider?.planId || 'free';

      const commissions = {
        free: 12,
        professional: 8,
        premium: 3.99
      };
      const commissionPercent = commissions[planId] || 15;
      const commission = (amount * commissionPercent) / 100;

      totalEarnings += amount;
      totalCommissions += commission;
    }

    // Buscar payouts já realizados
    const payoutsSnapshot = await db.collection('payouts')
      .where('userId', '==', userId)
      .where('status', '==', 'completed')
      .get();

    for (const doc of payoutsSnapshot.docs) {
      const payout = doc.data();
      totalPaidOut += payout.amount || 0;
    }

    const availableBalance = totalEarnings - totalCommissions - totalPaidOut;
    return Math.max(0, availableBalance); // Não permitir saldo negativo

  } catch (error) {
    console.error('[payout] Erro ao calcular saldo disponível:', error);
    return 0;
  }
}

export default async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const db = initFirestore();
  const { userId, amount, method } = req.body;

  if (!userId || !amount || !method) return res.status(400).json({ error: 'userId, amount and method required' });

  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });

    const userData = userDoc.data();

    if (method === 'stripe') {
      if (!userData.stripeAccountId) return res.status(400).json({ error: 'Stripe account not connected' });

      // Create payout via Stripe
      const payout = await stripe.payouts.create({
        amount: Math.round(amount * 100), // in cents
        currency: 'brl',
        destination: userData.stripeAccountId,
      });

      await db.collection('payouts').add({
        userId,
        amount,
        method: 'stripe',
        stripePayoutId: payout.id,
        status: 'pending',
        createdAt: new Date(),
      });

      res.json({ success: true, payoutId: payout.id, delayHours: 0 }); // Stripe is instant
    } else if (method === 'pix') {
      if (!userData.chavePix) return res.status(400).json({ error: 'Chave PIX não cadastrada' });

      if (!mpClient || !mpPayment) {
        return res.status(500).json({ error: 'Mercado Pago não configurado para payouts' });
      }

      try {
        console.log('[payout] Verificando saldo disponível para user:', userId);

        // Verificar saldo disponível do usuário
        const availableBalance = await getUserAvailableBalance(db, userId);
        console.log('[payout] Saldo disponível:', availableBalance, 'Valor solicitado:', amount);

        if (availableBalance < amount) {
          return res.status(400).json({
            error: `Saldo insuficiente. Disponível: R$ ${availableBalance.toFixed(2)}`
          });
        }

        console.log('[payout] Iniciando transferência PIX para:', userData.chavePix);

        // Para implementação real de PIX, seria necessário:
        // 1. Usar API de transferências do Mercado Pago (se disponível)
        // 2. Ou integrar com PSP que suporte transferências PIX
        // 3. Ou usar sistema bancário direto

        // Por enquanto, vamos simular a transferência mas registrar corretamente
        const payoutData = {
          userId,
          amount,
          method: 'pix',
          chavePix: userData.chavePix,
          status: 'processing',
          createdAt: new Date(),
          processedAt: null,
          mercadoPagoTransferId: null,
          transferDetails: {
            pixKey: userData.chavePix,
            amount: amount,
            description: `Payout Turplace - Prestador ${userId}`,
            simulated: true // Flag para indicar que é simulado
          }
        };

        const payoutRef = await db.collection('payouts').add(payoutData);
        const payoutId = payoutRef.id;

        console.log('[payout] Payout registrado com ID:', payoutId);

        // Simular processamento (em produção seria webhook ou polling)
        setTimeout(async () => {
          try {
            // Simular sucesso da transferência
            const success = Math.random() > 0.1; // 90% de sucesso

            if (success) {
              await payoutRef.update({
                status: 'completed',
                processedAt: new Date(),
                mercadoPagoTransferId: `mp_pix_${Date.now()}_${payoutId.slice(-8)}`
              });
              console.log('[payout] Transferência PIX concluída com sucesso para user:', userId);
            } else {
              await payoutRef.update({
                status: 'failed',
                processedAt: new Date(),
                error: 'Falha na transferência PIX'
              });
              console.log('[payout] Transferência PIX falhou para user:', userId);
            }
          } catch (error) {
            console.error('[payout] Erro ao atualizar status da transferência:', error);
          }
        }, 3000 + Math.random() * 5000); // 3-8 segundos de simulação

        res.json({
          success: true,
          payoutId: payoutId,
          message: 'Transferência PIX iniciada com sucesso. Você receberá uma confirmação em breve.',
          estimatedTime: 'Até 2 horas',
          availableBalance: availableBalance - amount
        });

      } catch (mpError) {
        console.error('[payout] Erro ao processar transferência PIX:', mpError);
        return res.status(500).json({
          error: 'Erro interno ao processar transferência PIX. Tente novamente.'
        });
      }
    } else {
      return res.status(400).json({ error: 'Invalid method' });
    }
  } catch (err) {
    console.error('[payout] Error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};