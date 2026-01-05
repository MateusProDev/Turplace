const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const app = initializeApp();
const db = getFirestore();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // Buscar payouts do usuário
    const payoutsRef = db.collection('payouts').where('userId', '==', userId);
    const payoutsSnapshot = await payoutsRef.get();

    const payouts = [];
    payoutsSnapshot.forEach(doc => {
      payouts.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Ordenar por data de criação (mais recente primeiro)
    payouts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({ payouts });
  } catch (error) {
    console.error('Erro ao buscar payouts:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
