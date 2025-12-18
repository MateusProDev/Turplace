// Single-file registry of API handlers. This keeps all handler requires
// inside the `api/` folder so the catch-all function bundles them.
module.exports = {
  'create-subscription-session': require('../server/api/create-subscription-session.cjs'),
  'create-checkout-session': require('../server/api/create-checkout-session.cjs'),
  'webhook': require('../server/api/webhook.cjs'),
  'dev/apply-plan': require('../server/api/dev/apply-plan.cjs'),
  'status': require('./status.js')
}
