const initFirestore = require('./_lib/firebaseAdmin.cjs');

// Dev-only endpoint: apply plan for an orderId. Only enabled when NOT in production.
module.exports = async (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(403).send('Not allowed in production');
  try {
    const { orderId } = req.method === 'GET' ? req.query : req.body;
    if (!orderId) return res.status(400).json({ error: 'orderId required' });

    const db = initFirestore();
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) return res.status(404).json({ error: 'order not found' });
    const order = orderSnap.data();

    // Determine plan doc
    let planDoc = null;
    if (order.stripePriceId) {
      const q = await db.collection('plans').where('stripePriceId', '==', order.stripePriceId).limit(1).get();
      if (!q.empty) planDoc = q.docs[0];
    }
    if (!planDoc && order.priceId) {
      const q2 = await db.collection('plans').doc(order.priceId).get();
      if (q2.exists) planDoc = q2;
    }
    if (!planDoc) {
      const free = await db.collection('plans').doc('free').get();
      if (free.exists) planDoc = free;
    }
    if (!planDoc) return res.status(500).json({ error: 'No plan available to apply' });

    const planData = planDoc.data();
    const newPlanId = planDoc.id;

    // resolve user
    let targetUid = order.userId || null;
    if (!targetUid && order.customerEmail) {
      const uq = await db.collection('users').where('email', '==', order.customerEmail).limit(1).get();
      if (!uq.empty) targetUid = uq.docs[0].id;
    }
    if (!targetUid) return res.status(400).json({ error: 'Could not resolve user for this order' });

    const userRef = db.collection('users').doc(targetUid);
    const userSnap = await userRef.get();
    const oldPlanId = userSnap.exists ? (userSnap.data().planId || null) : null;

    // history
    await userRef.collection('planHistory').doc().set({ oldPlanId, newPlanId, changedAt: new Date().toISOString(), orderId, source: 'dev' });

    // update user
    await userRef.set({ planId: newPlanId, planActivatedAt: new Date().toISOString(), platformFeePercent: planData.commissionPercent || null, planFeatures: planData.features || null }, { merge: true });

    await orderRef.update({ planApplied: true, planAppliedAt: new Date().toISOString() });

    return res.json({ ok: true, appliedTo: targetUid, newPlanId });
  } catch (err) {
    console.error('dev apply-plan error', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
};
