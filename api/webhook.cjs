return String(obj);
        
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
                console.log(`[${now()}] Raw payload length: ${buf.length}`);
                event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
                console.log(`[${now()}] Signature verification succeeded for event id=${event.id} type=${event.type}`);
              }
            } catch (err) {
              console.error(`[${now()}] Webhook signature/parse error: ${err && err.message ? err.message : err}`);
              return res.status(400).send(`Webhook Error: ${err && err.message ? err.message : 'invalid payload'}`);
            }

            try {
              console.log(`[${now()}] Processing event id=${event.id} type=${event.type}`);
              if (event.data && event.data.object) {
                const obj = event.data.object;
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
                    break;
                  }

                  const update = { status: 'paid', paidAt: new Date().toISOString(), stripePaymentIntentId: session.payment_intent };
                  console.log(`[${now()}] Updating order ${orderId} with: ${safePrint(update)}`);
                  await orderRef.update(update);
                  console.log(`[${now()}] Order ${orderId} updated successfully`);

                  try {
                    if (order.type === 'subscription') {
                      console.log(`[${now()}] Order ${orderId} is a subscription order — applying plan to user`);

                      const plansQuery = await db.collection('plans').where('stripePriceId', '==', order.priceId).limit(1).get();
                      let planDoc = null;
                      if (!plansQuery.empty) planDoc = plansQuery.docs[0];
                      else {
                        const altQuery = await db.collection('plans').where('priceId', '==', order.priceId).limit(1).get();
                        if (!altQuery.empty) planDoc = altQuery.docs[0];
                      }

                      if (!planDoc) {
                        console.warn(`[${now()}] Plano não encontrado para priceId=${order.priceId}; attempting fallback to 'free'`);
                        const freeDoc = await db.collection('plans').doc('free').get();
                        if (freeDoc.exists) {
                          planDoc = freeDoc;
                          console.log(`[${now()}] Fallback: using 'free' plan`);
                        } else {
                          console.warn(`[${now()}] Fallback 'free' plan not found — skipping plan application.`);
                        }
                      }
                      if (planDoc) {
                        const planData = planDoc.data();
                        const newPlanId = planDoc.id;

                        let targetUid = order.userId || null;
                        if (!targetUid && order.customerEmail) {
                          const usersQuery = await db.collection('users').where('email', '==', order.customerEmail).limit(1).get();
                          if (!usersQuery.empty) targetUid = usersQuery.docs[0].id;
                        }

                        if (!targetUid) {
                          console.warn(`[${now()}] Não foi possível resolver usuário para order ${orderId} (userId/email ausente).`);
                        } else {
                          const currentUserSnap = await db.collection('users').doc(targetUid).get();
                          const currentUser = currentUserSnap.exists ? currentUserSnap.data() : {};
                          if (currentUser && currentUser.planId === newPlanId && currentUser.planActivatedAt) {
                            console.log(`[${now()}] User ${targetUid} already on plan ${newPlanId} — skipping apply`);
                            await orderRef.update({ planApplied: true, planAppliedAt: new Date().toISOString() });
                            return res.json({ received: true });
                          }
                          const userRef = db.collection('users').doc(targetUid);
                          const userSnap = await userRef.get();
                          const userData = userSnap.exists ? userSnap.data() : {};
                          const oldPlanId = userData && userData.planId ? userData.planId : null;

                          let planExpiresAt = null;
                          if (session.subscription) {
                            try {
                              const sub = await stripe.subscriptions.retrieve(session.subscription);
                              if (sub && sub.current_period_end) planExpiresAt = new Date(sub.current_period_end * 1000).toISOString();
                            } catch (e) {
                              console.warn(`[${now()}] Falha ao buscar subscription ${session.subscription}: ${e && e.message ? e.message : e}`);
                            }
                          }

                          try {
                            const histRef = userRef.collection('planHistory').doc();
                            await histRef.set({
                              oldPlanId,
                              newPlanId,
                              changedAt: new Date().toISOString(),
                              orderId,
                              source: 'stripe',
                              amount: order.amount || null,
                            });
                            console.log(`[${now()}] Plan history recorded for user ${targetUid}`);
                          } catch (e) {
                            console.warn(`[${now()}] Failed to write plan history for user ${targetUid}: ${e && e.message ? e.message : e}`);
                          }

                          const userUpdate = {
                            planId: newPlanId,
                            planActivatedAt: new Date().toISOString(),
                            planExpiresAt: planExpiresAt || null,
                            platformFeePercent: planData.commissionPercent || null,
                            planFeatures: planData.features || null,
                          };
                          await userRef.set(userUpdate, { merge: true });
                          console.log(`[${now()}] User ${targetUid} updated with new plan ${newPlanId}`);

                          await orderRef.update({ subscriptionId: session.subscription || null, planApplied: true });
                        }
                      }
                    }
                  } catch (errApply) {
                    console.error(`[${now()}] Erro ao aplicar plano automatico para order ${orderId}: ${errApply && errApply.stack ? errApply.stack : errApply}`);
                  }

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
