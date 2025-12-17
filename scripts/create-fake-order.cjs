require('./load-env.cjs')();
const initFirestore = require('../api/_lib/firebaseAdmin.cjs');

(async () => {
  try {
    const db = initFirestore();

    // get a plan (stripePriceId preferred)
    const plansSnap = await db.collection('plans').limit(1).get();
    let planDoc = null;
    let planData = null;
    if (plansSnap.empty) {
      console.warn('Nenhum plano encontrado em collection `plans`. Criando plano `free` temporário para o teste.');
      const freePlanRef = db.collection('plans').doc('free');
      const freePlan = {
        planId: 'free',
        name: 'Free',
        commissionPercent: 15,
        features: ['Sem destaque', 'Sem analytics'],
        price_cents: 0,
        stripePriceId: 'price_local_free',
        createdAt: new Date().toISOString(),
      };
      await freePlanRef.set(freePlan, { merge: true });
      planDoc = await freePlanRef.get();
      planData = planDoc.data();
    } else {
      planDoc = plansSnap.docs[0];
      planData = planDoc.data();
    }
    const priceId = planData.stripePriceId || planDoc.id || planData.priceId || planData.stripe_price_id;

    // resolve userId argument or pick first user
    const argUserId = process.argv[2];
    let userId = argUserId || null;
    let customerEmail = null;

    if (!userId) {
      const usersSnap = await db.collection('users').limit(1).get();
      if (usersSnap.empty) {
        console.error('Nenhum usuário encontrado em collection `users`. Forneça userId como argumento.');
        process.exit(1);
      }
      userId = usersSnap.docs[0].id;
      customerEmail = usersSnap.docs[0].data().email || null;
    } else {
      const u = await db.collection('users').doc(userId).get();
      if (u.exists) customerEmail = u.data().email || null;
    }

    const orderRef = db.collection('orders').doc();
    const order = {
      type: 'subscription',
      priceId: priceId,
      stripePriceId: priceId,
      customerEmail: customerEmail,
      userId: userId,
      status: 'pending',
      amount: planData.price_cents || null,
      createdAt: new Date().toISOString(),
    };

    await orderRef.set(order);
    console.log('Created fake order with id:', orderRef.id);
    console.log('Using priceId:', priceId);
    console.log('Target userId:', userId, 'customerEmail:', customerEmail);
    process.exit(0);
  } catch (err) {
    console.error('Error creating fake order:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();
