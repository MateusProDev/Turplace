require('./load-env.cjs')();
const initFirestore = require('../api/_lib/firebaseAdmin.cjs');

async function applyPlan(orderId) {
  const db = initFirestore();
  const now = new Date().toISOString();
  const orderRef = db.collection('orders').doc(orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) {
    console.error('Order not found:', orderId);
    process.exit(1);
  }
  const order = orderSnap.data();
  if (order.status !== 'paid') {
    console.log('Warning: order.status is not paid (current:', order.status, ') — continuing to apply plan for testing.');
  }

  // find plan doc by stripePriceId or priceId or planId
  let planDoc = null;
  const priceId = order.priceId || order.stripePriceId || null;
  if (priceId) {
    const q = await db.collection('plans').where('stripePriceId', '==', priceId).limit(1).get();
    if (!q.empty) planDoc = q.docs[0];
    else {
      const q2 = await db.collection('plans').where('priceId', '==', priceId).limit(1).get();
      if (!q2.empty) planDoc = q2.docs[0];
    }
  }
  if (!planDoc) {
    // fallback to free
    const free = await db.collection('plans').doc('free').get();
    if (free.exists) planDoc = free;
  }
  if (!planDoc) {
    console.error('No plan found to apply. Create plans collection or run createStripePlans.');
    process.exit(1);
  }
  const planData = planDoc.data();
  const newPlanId = planDoc.id;

  // resolve user
  let targetUid = order.userId || null;
  if (!targetUid && order.customerEmail) {
    const uq = await db.collection('users').where('email', '==', order.customerEmail).limit(1).get();
    if (!uq.empty) targetUid = uq.docs[0].id;
  }
  if (!targetUid) {
    console.error('Could not resolve user for order', orderId);
    process.exit(1);
  }

  const userRef = db.collection('users').doc(targetUid);
  const userSnap = await userRef.get();
  const userData = userSnap.exists ? userSnap.data() : {};
  const oldPlanId = userData.planId || null;

  // write history
  const histRef = userRef.collection('planHistory').doc();
  await histRef.set({
    oldPlanId,
    newPlanId,
    changedAt: now,
    orderId,
    source: 'local-dev',
    amount: order.amount || null,
  });
  console.log('Plan history recorded for user', targetUid);

  // update user doc
  const userUpdate = {
    planId: newPlanId,
    planActivatedAt: now,
    planExpiresAt: null,
    platformFeePercent: planData.commissionPercent || null,
    planFeatures: planData.features || null,
  };
  await userRef.update(userUpdate);
  console.log('User updated with new plan', newPlanId);

  // update order
  await orderRef.update({ planApplied: true, appliedAt: now });
  console.log('Order updated with planApplied');
}

const orderId = process.argv[2];
if (!orderId) {
  console.error('Usage: node scripts/apply-plan-local.cjs <orderId>');
  process.exit(1);
}

applyPlan(orderId).then(() => process.exit(0)).catch(err => {
  console.error('Error applying plan locally:', err && err.stack ? err.stack : err);
  process.exit(1);
});
