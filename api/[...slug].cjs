module.exports = async function handler(req, res) {
  console.log('[...slug] handler chamado', { url: req.url, slug: req.query && req.query.slug });
  const slug = req.query.slug || []
  const parts = Array.isArray(slug) ? slug : [slug]
  const base = parts.join('/') || 'index'

  console.log('[...slug] invoked for base=', base)

  // Direct routing without registry dependency
  const handlers = {
    'create-subscription-session': require('./create-subscription-session.cjs'),
    'create-checkout-session': require('./create-checkout-session.cjs'),
    'webhook': require('./webhook.cjs'),
    'dev/apply-plan': require('./dev/apply-plan.cjs'),
    'status': require('./status.cjs')
  }

  if (handlers[base]) {
    const fn = handlers[base] && (handlers[base].default || handlers[base])
    if (typeof fn === 'function') {
      console.log('[...slug] using direct handler for', base)
      return await fn(req, res)
    }
  }

  // runtime/environment info for debugging
  try {
    console.log('[...slug] process.cwd=', process.cwd())
    console.log('[...slug] node version=', process.version)
    console.log('[...slug] req.url=', req.url, 'method=', req.method, 'host=', req.headers && req.headers.host)
  } catch (e) {
    console.warn('[...slug] runtime info error', e && e.message)
  }

  console.log('[...slug] handler not found for base=', base)
  res.status(404).send('NOT_FOUND')
}
