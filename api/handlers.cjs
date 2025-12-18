// Single-file registry of API handlers. This keeps all handler requires
// inside the `api/` folder so the catch-all function bundles them.
module.exports = {
  'create-subscription-session': require('./create-subscription-session.cjs'),
  'create-checkout-session': require('./create-checkout-session.cjs'),
  'webhook': require('./webhook.cjs'),
  'dev/apply-plan': require('./dev/apply-plan.cjs'),
  'status': require('./status.cjs')
}
