// Single-file registry of API handlers. This keeps all handler requires
// inside the `api/` folder so the catch-all function bundles them.
import createSubscriptionSession from './create-subscription-session.js';
import createCheckoutSession from './create-checkout-session.js';
import webhook from './webhook.js';
import applyPlan from './dev/apply-plan.js';
import status from './status.js';

export default {
  'create-subscription-session': createSubscriptionSession,
  'create-checkout-session': createCheckoutSession,
  'webhook': webhook,
  'dev/apply-plan': applyPlan,
  'status': status
}
