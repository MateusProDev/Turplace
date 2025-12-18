const Stripe = require('stripe');
const initFirestore = require('./_lib/firebaseAdmin.cjs');

function now() { return new Date().toISOString(); }

function safePrint(obj) { try { return JSON.stringify(obj, null, 2); } catch (e) { return String(obj); } }

module.exports = async (req, res) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const db = initFirestore();
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    if (!webhookSecret) event = req.body;
    else {
      const buf = await getRawBody(req);
      event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
    }
  } catch (err) { return res.status(400).send(`Webhook Error: ${err && err.message ? err.message : 'invalid payload'}`); }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const orderId = (session.metadata && (session.metadata.orderId || session.metadata.order_id)) || session.client_reference_id || null;
      if (!orderId) return res.json({ received: true });

      const orderRef = db.collection('orders').doc(orderId);
      const orderSnap = await orderRef.get();
      if (!orderSnap.exists) return res.json({ received: true });
      const order = orderSnap.data();
      if (order.status === 'paid') return res.json({ received: true });

      await orderRef.update({ status: 'paid', paidAt: new Date().toISOString(), stripePaymentIntentId: session.payment_intent });

      if (order.type === 'subscription') {
        const plansQuery = await db.collection('plans').where('stripePriceId', '==', order.priceId).limit(1).get();
        let planDoc = !plansQuery.empty ? plansQuery.docs[0] : null;
        if (!planDoc) {
          const alt = await db.collection('plans').where('priceId','==',order.priceId).limit(1).get();
          if (!alt.empty) planDoc = alt.docs[0];
        }
        if (!planDoc) planDoc = (await db.collection('plans').doc('free').get()).exists ? (await db.collection('plans').doc('free').get()) : null;
        if (planDoc) {
          const newPlanId = planDoc.id; let targetUid = order.userId || null;
          if (!targetUid && order.customerEmail) {
            const uq = await db.collection('users').where('email','==',order.customerEmail).limit(1).get(); if (!uq.empty) targetUid = uq.docs[0].id;
          }
          if (targetUid) {
            const userRef = db.collection('users').doc(targetUid);
            const userSnap = await userRef.get(); const userData = userSnap.exists ? userSnap.data() : {};
            const oldPlanId = userData.planId || null;
            const histRef = userRef.collection('planHistory').doc();
            await histRef.set({ oldPlanId, newPlanId, changedAt: new Date().toISOString(), orderId, source: 'stripe', amount: order.amount || null });
            await userRef.set({ planId: newPlanId, planActivatedAt: new Date().toISOString() }, { merge: true });
            await orderRef.update({ subscriptionId: session.subscription || null, planApplied: true });
          }
        }
      }
    }
    res.json({ received: true });
  } catch (err) { res.status(500).send('Internal error'); }
};

function getRawBody(req) { return new Promise((resolve, reject) => { let data=[]; req.on('data',c=>data.push(c)); req.on('end',()=>resolve(Buffer.concat(data))); req.on('error',e=>reject(e)); }); }
