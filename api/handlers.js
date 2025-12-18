// Single-file registry of API handlers. This keeps all handler requires
// inside the `api/` folder so the catch-all function bundles them.
module.exports = {
  'create-subscription-session': require('./create-subscription-session.js'),
  'create-checkout-session': require('./create-checkout-session.js'),
  'webhook': require('./webhook.js'),
  'dev/apply-plan': require('./dev/apply-plan.js'),
  'status': require('./status.js')
}
