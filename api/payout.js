import initFirestore from './_lib/firebaseAdmin.js';

export default async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const db = initFirestore();
  const { userId, amount } = req.body;

  if (!userId || !amount) return res.status(400).json({ error: 'userId and amount required' });

  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });

    const userData = userDoc.data();
    if (!userData.chavePix) return res.status(400).json({ error: 'Chave PIX não cadastrada' });

    // Verificar plano e delay
    const plan = userData.plan || 'free';
    const delays = {
      free: 12 * 60 * 60 * 1000, // 12 horas
      professional: 2 * 60 * 60 * 1000, // 2 horas
      premium: 30 * 60 * 1000, // 30 minutos
    };
    const delay = delays[plan] || delays.free;

    // Simular processamento PIX (em produção, integrar com gateway)
    const payoutData = {
      userId,
      amount,
      chavePix: userData.chavePix,
      status: delay === 0 ? 'completed' : 'pending',
      createdAt: new Date(),
      processedAt: delay === 0 ? new Date() : new Date(Date.now() + delay),
    };

    const payoutRef = await db.collection('payouts').add(payoutData);

    res.json({ success: true, payoutId: payoutRef.id, delayHours: delay / (60 * 60 * 1000) });
  } catch (err) {
    console.error('[payout] Error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};