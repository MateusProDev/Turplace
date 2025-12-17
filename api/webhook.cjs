const Stripe = require('stripe');
const initFirestore = require('./_lib/firebaseAdmin.cjs');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const db = initFirestore();

function now() {
  return new Date().toISOString();
}

function safePrint(obj, depth = 2) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (e) {
    return String(obj);
  }
}

module.exports = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  console.log(`[${now()}] Received webhook request - headers: stripe-signature ${sig ? 'present' : 'missing'}, webhookSecret ${webhookSecret ? 'configured' : 'NOT configured'}`);

  let event;
  try {
    if (!webhookSecret) {
      // If no webhook secret configured, try to parse JSON directly (not recommended for prod)
      console.warn(`[${now()}] No STRIPE_WEBHOOK_SECRET configured — skipping signature verification (dev only)`);
      event = req.body;
    } else {
      const buf = await getRawBody(req);
      // log the first few bytes length for debugging
      console.log(`[${now()}] Raw payload length: ${buf.length}`);
      event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
      console.log(`[${now()}] Signature verification succeeded for event id=${event.id} type=${event.type}`);
    }
  } catch (err) {
    console.error(`[${now()}] Webhook signature/parse error: ${err && err.message ? err.message : err}`);
    return res.status(400).send(`Webhook Error: ${err && err.message ? err.message : 'invalid payload'}`);
  }

  // Log summary of the event for debugging (avoid logging sensitive full objects in prod)
  try {
    console.log(`[${now()}] Processing event id=${event.id} type=${event.type}`);
    if (event.data && event.data.object) {
      const obj = event.data.object;
      // print limited summary
      const summary = {
        id: obj.id,
        object: obj.object,
        amount_total: obj.amount_total || obj.amount || null,
        metadata: obj.metadata || null,
        client_reference_id: obj.client_reference_id || null,
      };
      console.log(`[${now()}] Event data summary: ${safePrint(summary)}`);
    }
  } catch (e) {
    console.warn(`[${now()}] Failed to summarize event data: ${e && e.message ? e.message : e}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const orderId = (session.metadata && (session.metadata.orderId || session.metadata.order_id)) || session.client_reference_id || null;
        console.log(`[${now()}] checkout.session.completed for session id=${session.id} resolved orderId=${orderId}`);

        if (!orderId) {
          console.warn(`[${now()}] No orderId found in session metadata/client_reference_id — skipping order update.`);
          break;
        }

        const orderRef = db.collection('orders').doc(orderId);
        console.log(`[${now()}] Fetching order ${orderId} from Firestore`);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) {
          console.warn(`[${now()}] Order ${orderId} not found in Firestore`);
          break;
        }
        const order = orderSnap.data();
        console.log(`[${now()}] Order ${orderId} current status=${order.status}`);
        if (order.status === 'paid') {
          console.log(`[${now()}] Order ${orderId} already paid — idempotent exit`);
          break; // idempotency
        }

        // Atualiza order
        const update = { status: 'paid', paidAt: new Date().toISOString(), stripePaymentIntentId: session.payment_intent };
        console.log(`[${now()}] Updating order ${orderId} with: ${safePrint(update)}`);
        await orderRef.update(update);
        console.log(`[${now()}] Order ${orderId} updated successfully`);

        break;
      }
      case 'payment_intent.succeeded': {
        console.log(`[${now()}] payment_intent.succeeded received; handled via checkout session flow`);
        break;
      }
      default:
        console.log(`[${now()}] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error(`[${now()}] Processing webhook failed: ${err && err.stack ? err.stack : err}`);
    res.status(500).send('Internal error');
  }
};

// helper to get raw body for signature verification
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = [];
    req.on('data', chunk => data.push(chunk));
    req.on('end', () => resolve(Buffer.concat(data)));
    req.on('error', err => reject(err));
  });
}
